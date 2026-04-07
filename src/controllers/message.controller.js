const { sendMessage } = require('../whatsapp/client');

async function send(req, res) {
    const { accountId } = req.params;
    const { text, threadId, type } = req.body;

    if (!text || !threadId) {
        return res.status(400).json({ error: 'text and threadId are required' });
    }

    let to = threadId;
    if (type === 'user' && !to.includes('@s.whatsapp.net')) {
        to = to.split('@')[0] + '@s.whatsapp.net';
    } else if (type === 'group' && !to.includes('@g.us')) {
        to = to.split('@')[0] + '@g.us';
    }

    try {
        await sendMessage(accountId, to, text);
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
