const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

const MEDIA_DIR = path.join(__dirname, '../../media');

const MIME_EXT = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
};

function sanitizeFilename(name) {
    return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

function getExtension(msgType, mimetype, documentFileName) {
    if (msgType === 'documentMessage') {
        if (documentFileName) {
            const parts = documentFileName.split('.');
            if (parts.length > 1) {
                return parts.pop().toLowerCase();
            }
        }
        return MIME_EXT[mimetype] || 'bin';
    }

    if (MIME_EXT[mimetype]) {
        return MIME_EXT[mimetype];
    }

    switch (msgType) {
        case 'imageMessage': return 'jpg';
        case 'videoMessage': return 'mp4';
        case 'audioMessage': return 'ogg';
        case 'stickerMessage': return 'webp';
        default: return 'bin';
    }
}

function getMediaType(msgType) {
    switch (msgType) {
        case 'imageMessage': return 'image';
        case 'videoMessage': return 'video';
        case 'audioMessage': return 'audio';
        case 'documentMessage': return 'document';
        case 'stickerMessage': return 'sticker';
        default: return 'unknown';
    }
}

async function decryptAndSaveMedia(msg, sock, accountId) {
    const msgType = Object.keys(msg.message || {}).find(k =>
        ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'].includes(k)
    );

    if (!msgType) return null;

    const mediaObj = msg.message[msgType];
    // Depending on baileys version, the url might be present or we can just pass it directly if mediaKey exists
    if (!mediaObj || (!mediaObj.url && !mediaObj.mediaKey)) return null;

    const message_id = sanitizeFilename(msg.key.id);
    const mimetype = mediaObj.mimetype || '';
    const documentFileName = mediaObj.fileName || mediaObj.title || null;
    const ext = getExtension(msgType, mimetype, documentFileName);
    const filename = `${message_id}.${ext}`;

    const accountDir = path.join(MEDIA_DIR, accountId);
    const filePath = path.join(accountDir, filename);

    fsSync.mkdirSync(accountDir, { recursive: true });

    let buffer;

    try {
        try {
            await fs.access(filePath);
            buffer = await fs.readFile(filePath);
            console.log(`[${accountId}] Media already exists, reusing: ${filename}`);
        } catch (e) {
            const downloadPromise = downloadMediaMessage(
                msg,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Download timeout (30s)')), 30000)
            );

            buffer = await Promise.race([downloadPromise, timeoutPromise]);
            await fs.writeFile(filePath, buffer);
            console.log(`[${accountId}] Decrypted ${getMediaType(msgType)} ${message_id} (${buffer.length} bytes) -> ${filename}`);
        }

        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

        return {
            url: `${PUBLIC_BASE_URL}/media/${accountId}/${filename}`,
            type: getMediaType(msgType),
            mimetype: mimetype || 'application/octet-stream',
            filename: documentFileName, // original name or null
            size: buffer.length,
            sha256: sha256
        };

    } catch (err) {
        console.error(`[${accountId}] Failed to decrypt media for ${msg.key.id}: ${err.message}`);
        return null;
    }
}

async function cleanupMedia() {
    const ttlMinutes = parseInt(process.env.MEDIA_TTL_MINUTES || '60', 10);
    const ttlMs = ttlMinutes * 60 * 1000;
    const now = Date.now();

    try {
        try {
            await fs.access(MEDIA_DIR);
        } catch (e) {
            return;
        }

        const accounts = await fs.readdir(MEDIA_DIR);
        for (const account of accounts) {
            const accountDir = path.join(MEDIA_DIR, account);
            const stats = await fs.stat(accountDir);

            if (!stats.isDirectory()) continue;

            try {
                const files = await fs.readdir(accountDir);
                let allFilesDeleted = true;

                for (const file of files) {
                    const filePath = path.join(accountDir, file);
                    try {
                        const fileStats = await fs.stat(filePath);
                        if (now - fileStats.mtimeMs > ttlMs) {
                            await fs.unlink(filePath);
                        } else {
                            allFilesDeleted = false;
                        }
                    } catch (err) {
                        console.error(`Error deleting file ${filePath}:`, err.message);
                        allFilesDeleted = false;
                    }
                }

                if (allFilesDeleted && files.length > 0) {
                    await fs.rmdir(accountDir).catch(() => {});
                }
            } catch (err) {
                console.error(`Error reading directory ${accountDir}:`, err.message);
            }
        }
    } catch (err) {
        console.error(`Error in cleanupMedia:`, err.message);
    }
}

module.exports = {
    decryptAndSaveMedia,
    cleanupMedia
};
