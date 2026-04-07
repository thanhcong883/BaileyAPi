# 📦 WhatsApp API Server (Baileys) + Multi-Account Dashboard

A full-featured WhatsApp integration service using **Baileys** that provides:
- REST API to manage multiple accounts
- Webhook for incoming messages (per account)
- Multi-account dashboard (QR login, switching between accounts)
- WebSocket (Socket.IO) for live updates across all accounts

---

# 🚀 Features

## Core
- **Multi-Account Support**: Manage multiple WhatsApp sessions concurrently.
- Connect via QR code (multi-device)
- Send messages via REST API
- Receive messages via webhook (with `accountId` in payload)
- Session persistence (sessions stored per account ID)

## Dashboard
- Sidebar with account list and status indicators
- Add New Account button
- Delete Account button (clears session and config)
- Connection status (connected/disconnected)
- Send messages and view live incoming messages for the selected account

---

# ⚙️ Installation

## 1. Clone project
git clone <your-repo>
cd project-root

## 2. Install dependencies
npm install

## 3. Environment variables
Create .env file (optional, default PORT is 3000).

---

# ▶️ Running the App

node src/app.js

Server will start at:
http://localhost:3000

---

# 🔐 Multi-Account Flow

## Step 1: Add Account
Open dashboard and click "+ Add Account". Enter a unique Account ID.

## Step 2: Login (Scan QR)
A QR code will be generated for that account. Scan it using WhatsApp:
- WhatsApp → Linked Devices → Link a Device

## Step 3: Manage
Once connected, you can switch between accounts in the sidebar. Each account has its own Webhook configuration and message history.

---

# 🌐 API Documentation

Interactive API Docs available at:
http://localhost:3000/api-docs

## Key Endpoints

### List Accounts
`GET /api/auth/accounts`

### Send Message
`POST /api/messages/send`
Request Body:
```json
{
  "accountId": "my_account_1",
  "to": "849xxxxxxxxx@s.whatsapp.net",
  "message": "Hello"
}
```

---

# 🔌 WebSocket Events (Real-time)

- `qr`: `{ accountId, qr }`
- `status`: `{ accountId, status }`
- `message`: `{ accountId, from, text, ... }`

---

# 🔄 Webhook Integration

Configure a unique webhook URL for each account in the dashboard.
Payload example:
```json
{
  "event": "message.received",
  "accountId": "my_account_1",
  "data": {
    "from": "849xxxx@s.whatsapp.net",
    "message": { ... }
  }
}
```

---

# 🔒 Notes
- Sessions are stored in `sessions/{accountId}`.
- Use the Dashboard to safely delete accounts and their session data.
