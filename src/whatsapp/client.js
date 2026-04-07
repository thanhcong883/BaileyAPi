const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const sessions = {};
const qrCodes = {};
const statuses = {};

const logger = pino({ level: 'info' });

async function connectToWhatsApp(io, accountId) {
    if (!accountId) throw new Error('accountId is required');

    const sessionPath = path.join(__dirname, '../../sessions', accountId);
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
    });

    sessions[accountId] = sock;
    statuses[accountId] = 'disconnected';

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr: newQr } = update;

        if (newQr) {
            qrCodes[accountId] = newQr;
            if (io) io.emit('qr', { accountId, qr: newQr });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;

            statuses[accountId] = 'disconnected';
            if (io) io.emit('status', { accountId, status: 'disconnected' });

            if (shouldReconnect) {
                connectToWhatsApp(io, accountId);
            } else {
                delete sessions[accountId];
                delete qrCodes[accountId];
                delete statuses[accountId];
            }
        } else if (connection === 'open') {
            statuses[accountId] = 'connected';
            qrCodes[accountId] = null;
            if (io) io.emit('status', { accountId, status: 'connected' });
            console.log(`Opened connection for account: ${accountId}`);
        }
    });

    // Handle messages
    const { handleMessages } = require('./events');
    sock.ev.on('messages.upsert', async (m) => {
        await handleMessages(m, sock, io, accountId);
    });

    return sock;
}

function getStatus(accountId) {
    return statuses[accountId] || 'disconnected';
}

function getQR(accountId) {
    return qrCodes[accountId];
}

async function logout(accountId) {
    const sock = sessions[accountId];
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {}
        delete sessions[accountId];
        statuses[accountId] = 'disconnected';
        qrCodes[accountId] = null;

        const sessionPath = path.join(__dirname, '../../sessions', accountId);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    }
}

async function sendMessage(accountId, to, message) {
    const sock = sessions[accountId];
    if (!sock || statuses[accountId] !== 'connected') {
        throw new Error(`WhatsApp account ${accountId} not connected`);
    }
    return await sock.sendMessage(to, { text: message });
}

async function getGroups(accountId) {
    const sock = sessions[accountId];
    if (!sock || statuses[accountId] !== 'connected') {
        throw new Error(`WhatsApp account ${accountId} not connected`);
    }
    return await sock.groupFetchAllParticipating();
}

function getAllSessions() {
    return Object.keys(sessions);
}

function isAuthenticated(accountId) {
    return statuses[accountId] === 'connected';
}

module.exports = {
    getGroups,
    connectToWhatsApp,
    getStatus,
    getQR,
    logout,
    sendMessage,
    getSocket: (accountId) => sessions[accountId],
    getAllSessions,
    isAuthenticated
};
