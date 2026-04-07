const { getAccountConfig, updateAccountConfig } = require('../utils/config');

function getSettings(req, res) {
    const { accountId } = req.params;
    try {
        const config = getAccountConfig(accountId);
        res.json({ webhookUrl: config.webhookUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function updateSettings(req, res) {
    const { accountId } = req.params;
    const { webhookUrl } = req.body;
    if (typeof webhookUrl !== 'string') {
        return res.status(400).json({ error: 'valid webhookUrl is required' });
    }
    try {
        const updatedConfig = updateAccountConfig(accountId, { webhookUrl });
        res.json({ success: true, webhookUrl: updatedConfig.webhookUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function handleWebhook(req, res) {
    console.log('--- Webhook received ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('------------------------');
    res.status(200).send('Webhook received');
}

module.exports = {
    getSettings,
    updateSettings,
    handleWebhook
};
