const axios = require('axios');
const { getAccountConfig } = require('../utils/config');
require('dotenv').config();

async function handleMessages(m, sock, io, accountId) {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const isGroup = from.endsWith('@g.us');

            if (text) {
                console.log(`[${accountId}] Received ${isGroup ? 'group' : 'direct'} message from ${from}: ${text}`);

                // Emit to dashboard
                if (io) {
                    io.emit('message', {
                        accountId,
                        from,
                        text,
                        isGroup,
                        participant: isGroup ? msg.key.participant : null
                    });
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
                                from,
                                isGroup,
                                participant: msg.key.participant,
                                message: msg.message
                            }
                        });
                    } catch (error) {
                        console.error(`[${accountId}] Webhook error:`, error.message);
                    }
                }
            }
        }
    }
}

module.exports = {
    handleMessages
};
