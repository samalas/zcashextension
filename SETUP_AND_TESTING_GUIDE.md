# ZcashDeFi Wallet - Setup and Testing Guide

This guide explains how to set up and run the ZcashDeFi Chrome Extension with a local Zcash regtest node for development and testing.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Step 1: Start the Zcash Regtest Node](#step-1-start-the-zcash-regtest-node)
- [Step 2: Start the Backend API Server](#step-2-start-the-backend-api-server)
- [Step 3: Load the Chrome Extension](#step-3-load-the-chrome-extension)
- [Step 4: Configure the Extension](#step-4-configure-the-extension)
- [Testing Transactions](#testing-transactions)
- [Available Test Wallets](#available-test-wallets)
- [API Endpoints Reference](#api-endpoints-reference)
- [Troubleshooting](#troubleshooting)
- [Stopping the Services](#stopping-the-services)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Node.js v16+** - Recommended: Use nvm to manage versions
- **Google Chrome** browser
- **Git** (optional, for cloning)

### Install Node.js v20 using nvm:
```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Restart terminal, then install Node 20
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
```

---

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Chrome Extension   │────▶│   Backend API       │────▶│  Zcash Regtest Node │
│  (ZcashDeFi Wallet) │     │   (Port 3000)       │     │  (Port 18232)       │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
        │                            │                           │
        │  HTTP + API Key            │  JSON-RPC + Basic Auth    │
        │  x-api-key header          │  zcashrpc:password        │
        └────────────────────────────┴───────────────────────────┘
```

---

## Step 1: Start the Zcash Regtest Node

### 1.1 Make sure Docker Desktop is running
Open Docker Desktop application and wait for it to fully start.

### 1.2 Navigate to project directory
```bash
cd /Users/master/Desktop/zcashextension
```

### 1.3 Start the Zcash regtest Docker container
```bash
docker run -d \
  --platform linux/amd64 \
  --name zcashd_regtest \
  --entrypoint zcashd \
  -p 18232:18232 \
  -p 18344:18344 \
  electriccoinco/zcashd \
  -regtest \
  -printtoconsole \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  -rpcbind=0.0.0.0 \
  -rpcallowip=0.0.0.0/0 \
  -allowdeprecated=getnewaddress \
  -allowdeprecated=z_getnewaddress \
  -experimentalfeatures \
  -i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1
```

### 1.4 Wait for the node to start (about 15 seconds)
```bash
sleep 15
docker ps | grep zcashd
```

### 1.5 Generate initial blocks to get test ZEC
```bash
# Generate 101 blocks (coinbase maturity requires 100 confirmations)
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  generate 101
```

### 1.6 Verify your balance
```bash
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  getbalance
```

You should see approximately **12.5 ZEC** (or more depending on blocks generated).

---

## Step 2: Start the Backend API Server

### 2.1 Navigate to the backend directory
```bash
cd /Users/master/Desktop/zcashextension/zcash-api-main
```

### 2.2 Ensure the .env file is configured
Create or verify the `.env` file:
```bash
cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development

# ZCash RPC Configuration (Local Regtest)
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USERNAME=zcashrpc
ZCASH_RPC_PASSWORD=your_secure_password

# API Configuration (for protecting your endpoints)
API_KEY=test-api-key-12345
EOF
```

### 2.3 Install dependencies (first time only)
```bash
source ~/.nvm/nvm.sh && nvm use 20
npm install
```

### 2.4 Start the backend server
```bash
npm run dev
```

You should see:
```
Server is running on port 3000
Environment: development
Health check available at http://localhost:3000/health
```

### 2.5 Test the connection (in a new terminal)
```bash
# Health check
curl http://localhost:3000/health

# Get balance (requires API key)
curl -H "x-api-key: test-api-key-12345" http://localhost:3000/api/zcash/wallet/balance
```

---

## Step 3: Load the Chrome Extension

### 3.1 Open Chrome Extensions page
1. Open Google Chrome
2. Navigate to: `chrome://extensions/`

### 3.2 Enable Developer Mode
Toggle **"Developer mode"** ON (top right corner)

### 3.3 Load the extension
1. Click **"Load unpacked"** button
2. Navigate to: `/Users/master/Desktop/zcashextension`
3. Click **"Select"** or **"Open"**

### 3.4 Pin the extension
1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find **"ZcashDeFi Wallet"**
3. Click the pin icon (📌) to pin it

---

## Step 4: Configure the Extension

### 4.1 Open the extension
Click the **ZcashDeFi** icon in your Chrome toolbar

### 4.2 Open Settings
Click the **⚙️ Settings** button (top right)

### 4.3 Enter configuration
| Field | Value |
|-------|-------|
| **API URL** | `http://localhost:3000` |
| **API Key** | `test-api-key-12345` |

### 4.4 Save and Connect
Click **"Save & Connect"**

You should see:
- Green connection dot
- Your ZEC balance displayed
- Network showing "Zcash Regtest"

---

## Testing Transactions

### Test 1: View Balance
1. Open the extension
2. Your balance should display (e.g., "1798.75 ZEC")

### Test 2: Generate a New Address
1. Click **"📥 Receive"**
2. Click **"Generate New Address"**
3. Copy the new address

### Test 3: Send ZEC

#### Using the Extension UI:
1. Click **"📤 Send"**
2. Enter recipient address: `tmCkStgR77cGByxdpRX93z1tZvxHAVbwg9M`
3. Enter amount: `1.0`
4. (Optional) Add a comment
5. Click **"Send Transaction"**

#### Using cURL (for testing):
```bash
# Send 5 ZEC
curl -X POST -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"address":"tmCkStgR77cGByxdpRX93z1tZvxHAVbwg9M","amount":5.0,"comment":"Test"}' \
  http://localhost:3000/api/zcash/transaction/send
```

### Test 4: Confirm Transaction
After sending, generate a block to confirm:
```bash
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  generate 1
```

### Test 5: View Transaction History
1. Click the **"Activity"** tab in the extension
2. Or use cURL:
```bash
curl -H "x-api-key: test-api-key-12345" \
  http://localhost:3000/api/zcash/transactions
```

---

## Available Test Wallets

These addresses are available in your regtest wallet for testing:

| Type | Address | Description |
|------|---------|-------------|
| Transparent | `tmCkStgR77cGByxdpRX93z1tZvxHAVbwg9M` | Test address |
| Transparent | `tmGqDrfsBoYouAKtAvkw3mFFZMBJhASca1J` | Change address (has funds) |
| Transparent | `tmWvZwEzHGcDMfuEExH1F75ddDFVTTXe2NA` | Change address |

### Generate more test addresses:
```bash
# Get a new account
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  z_getnewaccount

# Get address for account (replace 0 with account number)
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  z_getaddressforaccount 0
```

### Generate more test ZEC:
```bash
# Generate 10 more blocks (adds ~25 ZEC)
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  generate 10
```

---

## API Endpoints Reference

All endpoints require the `x-api-key: test-api-key-12345` header.

### Wallet Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zcash/wallet/balance` | Get wallet balance |
| GET | `/api/zcash/wallet/info` | Get wallet info |
| POST | `/api/zcash/wallet/newaccount` | Create new account |
| GET | `/api/zcash/wallet/unspent` | List unspent outputs |
| GET | `/api/zcash/wallet/listaddresses` | List all addresses |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/zcash/transaction/send` | Send ZEC to address |
| GET | `/api/zcash/transactions` | List transactions |
| GET | `/api/zcash/transaction/:txid` | Get transaction details |

### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zcash/blockchain/info` | Get blockchain info |
| GET | `/api/zcash/blockchain/blockcount` | Get current block height |

### Network
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zcash/network/info` | Get network info |
| GET | `/health` | Health check (no auth required) |

### Example API Calls:
```bash
# Get blockchain info
curl -H "x-api-key: test-api-key-12345" \
  http://localhost:3000/api/zcash/blockchain/info

# Get balance
curl -H "x-api-key: test-api-key-12345" \
  http://localhost:3000/api/zcash/wallet/balance

# Send transaction
curl -X POST -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"address":"tmCkStgR77cGByxdpRX93z1tZvxHAVbwg9M","amount":1.0}' \
  http://localhost:3000/api/zcash/transaction/send

# List transactions
curl -H "x-api-key: test-api-key-12345" \
  "http://localhost:3000/api/zcash/transactions?count=10"
```

---

## Troubleshooting

### Issue: "Failed to connect to localhost port 3000"
**Solution:** The backend server isn't running. Start it:
```bash
cd /Users/master/Desktop/zcashextension/zcash-api-main
source ~/.nvm/nvm.sh && nvm use 20
npm run dev
```

### Issue: "Request failed with status code 401"
**Solution:** RPC authentication failing. Check `.env` file has correct credentials:
```
ZCASH_RPC_USERNAME=zcashrpc
ZCASH_RPC_PASSWORD=your_secure_password
```

### Issue: Docker container not running
**Solution:** Check and restart:
```bash
# Check status
docker ps -a | grep zcashd

# View logs
docker logs zcashd_regtest

# Restart container
docker start zcashd_regtest

# Or remove and recreate
docker rm zcashd_regtest
# Then run the docker run command from Step 1.3
```

### Issue: "EADDRINUSE: address already in use :::3000"
**Solution:** Another process is using port 3000. Kill it:
```bash
lsof -ti:3000 | xargs kill -9
```

### Issue: Extension shows "Disconnected"
**Solution:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Check settings in extension (⚙️)
3. Verify API Key is `test-api-key-12345`

### Issue: Transaction fails
**Solution:** 
1. Check you have sufficient balance
2. Verify recipient address is valid
3. Generate a block after sending:
```bash
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc \
  -rpcpassword=your_secure_password \
  generate 1
```

---

## Stopping the Services

### Stop the backend server
Press `Ctrl+C` in the terminal running `npm run dev`

### Stop the Zcash Docker container
```bash
docker stop zcashd_regtest
```

### Remove the container (to start fresh)
```bash
docker rm zcashd_regtest
```

---

## Quick Start Commands Summary

```bash
# 1. Start Docker Desktop (manually)

# 2. Start Zcash regtest node
docker start zcashd_regtest || docker run -d \
  --platform linux/amd64 \
  --name zcashd_regtest \
  --entrypoint zcashd \
  -p 18232:18232 \
  -p 18344:18344 \
  electriccoinco/zcashd \
  -regtest -printtoconsole \
  -rpcuser=zcashrpc -rpcpassword=your_secure_password \
  -rpcbind=0.0.0.0 -rpcallowip=0.0.0.0/0 \
  -i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1

# 3. Generate blocks (if fresh start)
docker exec zcashd_regtest zcash-cli -regtest \
  -rpcuser=zcashrpc -rpcpassword=your_secure_password generate 101

# 4. Start backend
cd /Users/master/Desktop/zcashextension/zcash-api-main
source ~/.nvm/nvm.sh && nvm use 20
npm run dev

# 5. Test connection
curl -H "x-api-key: test-api-key-12345" http://localhost:3000/api/zcash/wallet/balance
```

---

## Support

For issues or questions:
- Check the [zcashd-regtest-guide.md](./zcash-api-main/zcashd-regtest-guide.md) for detailed RPC commands
- Check the [FRONTEND_INTEGRATION_GUIDE.md](./zcash-api-main/FRONTEND_INTEGRATION_GUIDE.md) for API integration details
- Check the [ROUTES.md](./zcash-api-main/ROUTES.md) for all available API routes

---

**Happy Testing! 🚀**

