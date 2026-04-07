require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger.json');
const QRCode = require('qrcode');

const { connectToWhatsApp, getQR } = require('./whatsapp/client');
const { initWebSocket } = require('./websocket/socket');
const { getAllConfig } = require('./utils/config');

const authController = require('./controllers/auth.controller');
const messageController = require('./controllers/message.controller');
const groupController = require('./controllers/group.controller');
const webhookController = require('./controllers/webhook.controller');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Share io instance with controllers
app.set('io', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/** Standardized API implementation */

// Accounts list and creation
app.get('/api/accounts', authController.listAccounts);
app.post('/api/accounts', authController.addAccount);

// QR image endpoint
app.get('/qr/:accountId.png', async (req, res) => {
    const { accountId } = req.params;
    const qr = getQR(accountId);
    if (!qr) {
        return res.status(404).send('QR code not found or already authenticated');
    }
    try {
        const qrImage = await QRCode.toBuffer(qr);
        res.type('png').send(qrImage);
    } catch (err) {
        res.status(500).send('Error generating QR code');
    }
});

// Middleware to check account existence
const accountMiddleware = (req, res, next) => {
    const { accountId } = req.params;
    const config = getAllConfig();
    if (!config.accounts[accountId]) {
        return res.status(404).json({ error: 'Account not found' });
    }
    next();
};

// Account-specific endpoints
app.delete('/api/:accountId', accountMiddleware, authController.deleteAccount);
app.post('/api/:accountId/re-login', accountMiddleware, authController.reLogin);
app.get('/api/:accountId/auth-status', accountMiddleware, authController.getStatusInfo);
app.post('/api/:accountId/refresh-qr', accountMiddleware, authController.refreshQR);

// Message & Group endpoints
app.post('/api/:accountId/send', accountMiddleware, messageController.send);
app.get('/api/:accountId/groups', accountMiddleware, groupController.list);
app.get('/api/:accountId/messages', accountMiddleware, messageController.getMessages);

// Config endpoints
app.get('/api/:accountId/webhook-config', accountMiddleware, webhookController.getSettings);
app.post('/api/:accountId/webhook-config', accountMiddleware, webhookController.updateSettings);

// Existing webhook receiver (global)
app.post('/webhook', webhookController.handleWebhook);

// Root
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    // Init WebSocket
    initWebSocket(io);

    // Initialize all configured accounts
    const config = getAllConfig();
    const accountIds = Object.keys(config.accounts);
    console.log(`Initializing ${accountIds.length} accounts...`);

    for (const accountId of accountIds) {
        try {
            await connectToWhatsApp(io, accountId);
            console.log(`Account ${accountId} initialized`);
        } catch (error) {
            console.error(`Failed to initialize account ${accountId}:`, error);
        }
    }
});
