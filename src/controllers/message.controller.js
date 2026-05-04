const { sendMessage } = require('../whatsapp/client');

async function send(req, res) {
    const { accountId } = req.params;
    const { text, message, threadId, type } = req.body;

    if ((!text && !message) || !threadId) {
        return res.status(400).json({ error: 'text or message, and threadId are required' });
    }

    let to = threadId;
    if (!to.includes('@')) {
        if (type === 'user') {
            to = to + '@s.whatsapp.net';
        } else if (type === 'group') {
            to = to + '@g.us';
        }
    }

    try {
        const payload = message || text;
        await sendMessage(accountId, to, payload);
        res.json({ success: true, accountId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getMessages(req, res) {
    // Current implementation does not store messages
    res.json([]);
}

module.exports = {
    send,
    getMessages
};
