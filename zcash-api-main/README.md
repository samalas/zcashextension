# ZCash API Server

A robust Express.js backend server that provides RESTful API endpoints for interacting with the ZCash blockchain via RPC.

## Features

- RESTful API endpoints for ZCash blockchain operations
- Secure API key authentication
- TypeScript for type safety
- Comprehensive error handling
- Transaction management
- Wallet operations
- Block and blockchain information
- Network status monitoring
- Fee estimation

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Tatum API key for ZCash blockchain access (get it from [https://tatum.io](https://tatum.io))

## Installation

1. Clone the repository or navigate to the project directory:

```bash
cd zcash-api
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# ZCash RPC Configuration (Tatum API)
ZCASH_RPC_URL=https://zcash-mainnet.gateway.tatum.io/
ZCASH_API_KEY=your_tatum_api_key_here

# API Configuration (for protecting your endpoints)
API_KEY=your_api_key_here
```

**Important**:

- `ZCASH_API_KEY` is your Tatum API key for accessing the ZCash blockchain
- `API_KEY` is your custom API key for protecting your server endpoints (use any secure random string)

## Usage

### Development Mode

Run the server with auto-reload on file changes:

```bash
npm run dev
```

### Production Build

Build the TypeScript code:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## API Endpoints

All endpoints require the `x-api-key` header for authentication.

### Health Check

- `GET /health` - Check if the server is running

### Blockchain Information

- `GET /api/zcash/blockchain/info` - Get blockchain information
- `GET /api/zcash/blockchain/blockcount` - Get current block count
- `GET /api/zcash/blockchain/blockhash/:height` - Get block hash by height
- `GET /api/zcash/blockchain/block/:blockhash` - Get block details by hash

### Wallet Operations

- `GET /api/zcash/wallet/info` - Get wallet information
- `GET /api/zcash/wallet/balance?minConfirmations=1` - Get wallet balance
- `POST /api/zcash/wallet/newaddress` - Generate new address
- `GET /api/zcash/wallet/unspent?minConfirmations=1&maxConfirmations=9999999` - List unspent transactions

### Transactions

- `GET /api/zcash/transaction/:txid` - Get transaction details
- `GET /api/zcash/transactions?count=10&skip=0` - List transactions
- `GET /api/zcash/transaction/:txid/raw?verbose=false` - Get raw transaction
- `POST /api/zcash/transaction/send` - Send ZCash to an address
  ```json
  {
    "address": "zcash_address",
    "amount": 0.1,
    "comment": "optional comment"
  }
  ```

### Address Validation

- `GET /api/zcash/address/validate/:address` - Validate a ZCash address

### Network Information

- `GET /api/zcash/network/info` - Get network information
- `GET /api/zcash/network/connections` - Get connection count

### Mining Information

- `GET /api/zcash/mining/info` - Get mining information

### Fee Estimation

- `GET /api/zcash/fee/estimate?nblocks=6` - Estimate transaction fee

## Example Requests

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Get blockchain info
curl -H "x-api-key: your_api_key_here" http://localhost:3000/api/zcash/blockchain/info

# Get wallet balance
curl -H "x-api-key: your_api_key_here" http://localhost:3000/api/zcash/wallet/balance

# Send transaction
curl -X POST \
  -H "x-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"address":"t1abc...", "amount":0.1}' \
  http://localhost:3000/api/zcash/transaction/send
```

### Using JavaScript/Axios

```javascript
const axios = require("axios");

const client = axios.create({
  baseURL: "http://localhost:3000/api/zcash",
  headers: {
    "x-api-key": "your_api_key_here",
  },
});

// Get blockchain info
const info = await client.get("/blockchain/info");
console.log(info.data);

// Send transaction
const tx = await client.post("/transaction/send", {
  address: "t1abc...",
  amount: 0.1,
});
console.log(tx.data);
```

## Testing

The project includes a comprehensive test suite for all API endpoints.

### Running Tests

Make sure the server is running in a separate terminal before running tests:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run tests
npm test
```

### Test Commands

```bash
# Run all tests
npm test

# Run a specific test file
npm test tests/integration/blockchain.test.ts
npm test tests/integration/wallet.test.ts
npm test tests/integration/transactions.test.ts
npm test tests/integration/network.test.ts

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file in watch mode
npm run test:watch -- tests/integration/blockchain.test.ts

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Tests are organized by functionality:

- `tests/integration/blockchain.test.ts` - Blockchain endpoint tests
- `tests/integration/wallet.test.ts` - Wallet operation tests
- `tests/integration/transactions.test.ts` - Transaction endpoint tests
- `tests/integration/network.test.ts` - Network, mining, and health check tests

### What Gets Tested

The test suite validates:

- Authentication and API key validation
- All blockchain endpoints (info, blocks, block count, etc.)
- Wallet operations (balance, new addresses, unspent outputs)
- Transaction operations (list, get details, raw transactions, fee estimation)
- Network information and connection status
- Mining information
- Error handling for invalid inputs
- Response format consistency

### Test Requirements

- The server must be running on the configured port (default: 3000)
- Your `.env` file must be configured with valid ZCash RPC credentials
- The ZCash node must be accessible and synced

## Project Structure

```
zcash-api/
├── src/
│   ├── config/
│   │   └── config.ts           # Configuration management
│   ├── controllers/
│   │   └── zcash.controller.ts # Request handlers
│   ├── middleware/
│   │   ├── auth.middleware.ts  # API key authentication
│   │   └── error.middleware.ts # Error handling
│   ├── routes/
│   │   └── zcash.routes.ts     # API routes
│   ├── services/
│   │   └── zcash.service.ts    # ZCash RPC service
│   ├── types/
│   │   └── zcash.types.ts      # TypeScript type definitions
│   └── server.ts               # Main server file
├── tests/
│   ├── integration/
│   │   ├── blockchain.test.ts  # Blockchain tests
│   │   ├── wallet.test.ts      # Wallet tests
│   │   ├── transactions.test.ts # Transaction tests
│   │   └── network.test.ts     # Network & mining tests
│   ├── utils/
│   │   └── testClient.ts       # Test HTTP client
│   └── setup.ts                # Test configuration
├── .env.example                # Environment variables template
├── .gitignore
├── jest.config.js              # Jest configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Security Notes

- Always use HTTPS in production
- Keep your `.env` file secure and never commit it to version control
- Use strong API keys
- Restrict access to your ZCash RPC endpoint
- Consider rate limiting for production deployments
- Regularly update dependencies

## Error Handling

All API responses follow this format:

Success:

```json
{
  "success": true,
  "data": { ... }
}
```

Error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## License

MIT
