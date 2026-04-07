const { getQR, getStatus, getAllSessions } = require('../whatsapp/client');

function initWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('User connected to dashboard');

        // Send current status and QR for all sessions on connect
        const accountIds = getAllSessions();
        accountIds.forEach(accountId => {
            socket.emit('status', { accountId, status: getStatus(accountId) });
            const qr = getQR(accountId);
            if (qr) {
                socket.emit('qr', { accountId, qr });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected from dashboard');
        });
    });
}

module.exports = { initWebSocket };
