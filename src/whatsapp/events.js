const axios = require('axios');
const { getAccountConfig } = require('../utils/config');
const { decryptAndSaveMedia } = require('../utils/media');
require('dotenv').config();

const groupMetadataCache = {};

async function handleMessages(m, sock, io, accountId) {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
        if (msg.message) {
            const from = msg.key.remoteJid;
            const isSelf = msg.key.fromMe || false;

            const text = msg.message.conversation ||
                         msg.message.extendedTextMessage?.text ||
                         msg.message.imageMessage?.caption ||
                         msg.message.videoMessage?.caption ||
                         msg.message.documentMessage?.caption ||
                         '';

            const isGroup = from.endsWith('@g.us');
            const message_id = msg.key.id;
            const user_name = msg.pushName || '';

            let group_name = '';

            if (isGroup) {
                if (groupMetadataCache[from]) {
                    group_name = groupMetadataCache[from];
                } else {
                    try {
                        const groupMetadata = await sock.groupMetadata(from);
                        group_name = groupMetadata.subject;
                        groupMetadataCache[from] = group_name;
                    } catch (error) {
                        console.error(`[${accountId}] Error fetching group metadata for ${from}:`, error.message);
                    }
                }
            } else {
                group_name = user_name;
            }

            console.log(`[${accountId}] Received ${isGroup ? 'group' : 'direct'} message from ${from} (isSelf: ${isSelf}): ${text}`);

            // Emit to dashboard
            if (io) {
                io.emit('message', {
                    accountId,
                    from,
                    text,
                    isGroup,
                    isSelf,
                    participant: isGroup ? msg.key.participant : null,
                    message_id,
                    user_name,
                    group_name
                });
            }

            // Decrypt media if any
            let media = null;
            try {
                media = await decryptAndSaveMedia(msg, sock, accountId);
            } catch (err) {
                console.error(`[${accountId}] Unhandled error decrypting media:`, err.message);
            }

            // Send to webhook
            const config = getAccountConfig(accountId);
            const webhookUrl = config.webhookUrl;
            if (webhookUrl) {
                try {
                    await axios.post(webhookUrl, {
                        event: 'message.received',
                        accountId: accountId,
                        data: {
                            message_id,
                            from,
                            isGroup,
                            isSelf,
                            participant: msg.key.participant,
                            user_name,
                            group_name,
                            message: msg.message,
                            ...(media ? { media } : {})
                        }
                    });
                } catch (error) {
                    console.error(`[${accountId}] Webhook error:`, error.message);
                }
            }
        }
    }
}

module.exports = {
    handleMessages
};
