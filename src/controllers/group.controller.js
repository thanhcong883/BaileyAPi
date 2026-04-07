const { getGroups } = require('../whatsapp/client');

async function list(req, res) {
    const { accountId } = req.params;
    try {
        const groups = await getGroups(accountId);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    list
};
