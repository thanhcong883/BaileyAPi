const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config.json');

const defaultConfig = {
    accounts: {}
};

function getAllConfig() {
    if (!fs.existsSync(configPath)) {
        return defaultConfig;
    }
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading config file:', error);
        return defaultConfig;
    }
}

function getAccountConfig(accountId) {
    const config = getAllConfig();
    return config.accounts[accountId] || { webhookUrl: '' };
}

function updateAccountConfig(accountId, newAccountConfig) {
    try {
        const config = getAllConfig();
        config.accounts[accountId] = {
            ...(config.accounts[accountId] || { webhookUrl: '' }),
            ...newAccountConfig
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return config.accounts[accountId];
    } catch (error) {
        console.error('Error updating config file:', error);
        throw error;
    }
}

function deleteAccountConfig(accountId) {
    try {
        const config = getAllConfig();
        if (config.accounts[accountId]) {
            delete config.accounts[accountId];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    } catch (error) {
        console.error('Error deleting account config:', error);
        throw error;
    }
}

module.exports = {
    getAllConfig,
    getAccountConfig,
    updateAccountConfig,
    deleteAccountConfig
};
