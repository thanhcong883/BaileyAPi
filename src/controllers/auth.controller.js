const { logout, getStatus, connectToWhatsApp, getQR, isAuthenticated } = require('../whatsapp/client');
const { updateAccountConfig, getAllConfig, deleteAccountConfig } = require('../utils/config');

async function listAccounts(req, res) {
    const config = getAllConfig();
    const accounts = Object.keys(config.accounts).map(id => ({
        accountId: id,
        isAuthenticated: isAuthenticated(id),
        isListening: isAuthenticated(id)
    }));
    res.json(accounts);
}

async function addAccount(req, res) {
    let { accountId } = req.body;
    if (!accountId) {
        accountId = `pending_${Date.now()}`;
    }

    const config = getAllConfig();
    if (config.accounts[accountId]) {
        return res.status(400).json({ error: 'Account already exists' });
    }

    try {
        updateAccountConfig(accountId, {});
        const io = req.app.get('io');
        connectToWhatsApp(io, accountId);
        res.json({ success: true, accountId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteAccount(req, res) {
    const { accountId } = req.params;
    try {
        await logout(accountId);
        deleteAccountConfig(accountId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function reLogin(req, res) {
    const { accountId } = req.params;
    try {
        await logout(accountId);
        const io = req.app.get('io');
        connectToWhatsApp(io, accountId);
        res.json({ success: true, message: "Login process restarted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getStatusInfo(req, res) {
    const { accountId } = req.params;
    res.json({
        isAuthenticated: isAuthenticated(accountId),
        isListening: isAuthenticated(accountId)
    });
}

async function refreshQR(req, res) {
    const { accountId } = req.params;
    if (isAuthenticated(accountId)) {
        return res.json({ success: false, message: "Already authenticated" });
    }

    try {
        const io = req.app.get('io');
        connectToWhatsApp(io, accountId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    listAccounts,
    addAccount,
    deleteAccount,
    reLogin,
    getStatusInfo,
    refreshQR
};
