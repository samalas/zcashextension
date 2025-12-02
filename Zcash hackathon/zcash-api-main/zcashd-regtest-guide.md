# Zcashd Regtest Node Setup and RPC Interaction Guide

This guide covers setting up a zcashd regtest node using Docker and interacting with it via RPC.

## Prerequisites

- Docker installed
- macOS with M2 chip (or adjust `--platform` flag for other architectures)

## Step 1: Create Configuration File

First, create the necessary directories and configuration file:

```bash
# Create directories for data persistence
mkdir -p {./zcash-params-dir,./zcash-data-dir}

# Create the zcash.conf file in your data directory
cat > ./zcash-data-dir/zcash.conf <<EOF
# Network configuration
regtest=1

# RPC configuration
rpcuser=zcashrpc
rpcpassword=your_secure_password
rpcbind=0.0.0.0
rpcallowip=0.0.0.0/0

# Deprecation acknowledgment
i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1
EOF

# Set proper permissions
sudo chown 2001:2001 ./zcash-data-dir/zcash.conf
```

## Step 2: Run the Docker Container

```bash
docker run -d \
  --platform linux/amd64 \
  --name zcashd_regtest \
  -p 18232:18232 \
  -p 18344:18344 \
  -v $(pwd)/zcash-data-dir:/srv/zcashd/.zcash \
  -v $(pwd)/zcash-params-dir:/srv/zcashd/.zcash-params \
  electriccoinco/zcashd
```

### Port Mappings:
- **18232**: RPC port (for API calls)
- **18344**: P2P port (for connecting other nodes)

### Check Container Status

```bash
docker ps | grep zcashd_regtest
```

### View Logs

```bash
docker logs -f zcashd_regtest
```

## Step 3: Test with zcash-cli Commands

### Get Blockchain Info

```bash
docker exec zcashd_regtest zcash-cli -regtest getblockchaininfo
```

You should see output showing the current state (likely at block 0 initially).

### Generate 101 Blocks

```bash
docker exec zcashd_regtest zcash-cli -regtest generate 101
```

**Why 101 blocks?** Coinbase rewards (mining rewards) require 100 confirmations before they can be spent. By generating 101 blocks, you ensure the first block's reward is now spendable for testing transactions.

### Verify Blocks Were Generated

```bash
docker exec zcashd_regtest zcash-cli -regtest getblockchaininfo
```

You should now see `"blocks": 101` in the output.

### Additional Useful Commands

#### Get Mining Info
```bash
docker exec zcashd_regtest zcash-cli -regtest getmininginfo
```

#### Get Wallet Info
```bash
docker exec zcashd_regtest zcash-cli -regtest getwalletinfo
```

#### Get Balance
```bash
docker exec zcashd_regtest zcash-cli -regtest getbalance
```

#### List Unspent Outputs
```bash
docker exec zcashd_regtest zcash-cli -regtest listunspent
```

#### Get New Address
```bash
docker exec zcashd_regtest zcash-cli -regtest getnewaddress
```

## Step 4: Interact via RPC Endpoint

### RPC Endpoint Details

- **URL**: `http://localhost:18232`
- **Username**: `zcashrpc`
- **Password**: `your_secure_password`
- **Authentication**: Basic Auth
- **Protocol**: JSON-RPC 1.0

## Step 5: Using cURL

### Get Blockchain Info

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"getblockchaininfo","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Generate Blocks

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"generate","params":[10]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Get Balance

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"getbalance","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Get New Address

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"getnewaddress","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### List Unspent Outputs

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"listunspent","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Send Transaction

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"sendtoaddress","params":["<address>", 1.0]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Get Transaction Details

```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"curltest","method":"gettransaction","params":["<txid>"]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

## Step 6: Using Express.js Server

### Install Dependencies

```bash
npm install express axios
```

### Create server.js

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Zcash RPC configuration
const ZCASH_RPC = {
  url: 'http://localhost:18232',
  auth: {
    username: 'zcashrpc',
    password: 'your_secure_password'
  }
};

// Helper function to make RPC calls
async function zcashRPC(method, params = []) {
  try {
    const response = await axios.post(
      ZCASH_RPC.url,
      {
        jsonrpc: '1.0',
        id: 'express-rpc',
        method: method,
        params: params
      },
      {
        auth: ZCASH_RPC.auth,
        headers: { 'Content-Type': 'text/plain' }
      }
    );
    return response.data.result;
  } catch (error) {
    console.error('RPC Error:', error.response?.data || error.message);
    throw error;
  }
}

// API Routes

// Get blockchain info
app.get('/api/blockchain-info', async (req, res) => {
  try {
    const info = await zcashRPC('getblockchaininfo');
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate blocks
app.post('/api/generate/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count);
    const blocks = await zcashRPC('generate', [count]);
    res.json({ blocks, count: blocks.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get balance
app.get('/api/balance', async (req, res) => {
  try {
    const balance = await zcashRPC('getbalance');
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get new address
app.get('/api/new-address', async (req, res) => {
  try {
    const address = await zcashRPC('getnewaddress');
    res.json({ address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List unspent outputs
app.get('/api/unspent', async (req, res) => {
  try {
    const unspent = await zcashRPC('listunspent');
    res.json({ unspent, count: unspent.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send transaction
app.post('/api/send', async (req, res) => {
  try {
    const { address, amount } = req.body;
    const txid = await zcashRPC('sendtoaddress', [address, amount]);
    res.json({ txid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction details
app.get('/api/transaction/:txid', async (req, res) => {
  try {
    const tx = await zcashRPC('gettransaction', [req.params.txid]);
    res.json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get mining info
app.get('/api/mining-info', async (req, res) => {
  try {
    const info = await zcashRPC('getmininginfo');
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet info
app.get('/api/wallet-info', async (req, res) => {
  try {
    const info = await zcashRPC('getwalletinfo');
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Zcash RPC server running on http://localhost:${PORT}`);
});
```

### Run the Express Server

```bash
node server.js
```

### Test Express Server Endpoints

```bash
# Get blockchain info
curl http://localhost:3000/api/blockchain-info

# Get balance
curl http://localhost:3000/api/balance

# Generate 10 blocks
curl -X POST http://localhost:3000/api/generate/10

# Get new address
curl http://localhost:3000/api/new-address

# List unspent outputs
curl http://localhost:3000/api/unspent

# Get wallet info
curl http://localhost:3000/api/wallet-info

# Get mining info
curl http://localhost:3000/api/mining-info

# Send transaction (replace with actual address)
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"address":"tmYourAddressHere","amount":1.5}'

# Get transaction details (replace with actual txid)
curl http://localhost:3000/api/transaction/your-txid-here
```

## Step 7: Using Fetch API (Browser/Node.js 18+)

```javascript
const zcashRPC = async (method, params = []) => {
  const auth = btoa('zcashrpc:your_secure_password');
  
  const response = await fetch('http://localhost:18232', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: 'fetch-rpc',
      method: method,
      params: params
    })
  });
  
  const data = await response.json();
  return data.result;
};

// Usage examples
const info = await zcashRPC('getblockchaininfo');
console.log(info);

const balance = await zcashRPC('getbalance');
console.log('Balance:', balance);

const address = await zcashRPC('getnewaddress');
console.log('New address:', address);
```

## Common RPC Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `getblockchaininfo` | Get blockchain information | `[]` |
| `getmininginfo` | Get mining-related information | `[]` |
| `getwalletinfo` | Get wallet information | `[]` |
| `getbalance` | Get wallet balance | `[]` |
| `getnewaddress` | Generate a new address | `[]` |
| `listunspent` | List unspent transaction outputs | `[minconf, maxconf]` |
| `generate` | Generate blocks (regtest only) | `[numblocks]` |
| `sendtoaddress` | Send amount to address | `[address, amount]` |
| `gettransaction` | Get transaction details | `[txid]` |
| `getblock` | Get block information | `[blockhash]` |
| `getblockhash` | Get block hash by height | `[height]` |

## Useful Docker Commands

### Stop the container
```bash
docker stop zcashd_regtest
```

### Start the container
```bash
docker start zcashd_regtest
```

### Restart the container
```bash
docker restart zcashd_regtest
```

### Remove the container
```bash
docker stop zcashd_regtest
docker rm zcashd_regtest
```

### View container logs
```bash
docker logs zcashd_regtest
docker logs -f zcashd_regtest  # Follow logs
docker logs --tail 100 zcashd_regtest  # Last 100 lines
```

### Execute commands inside container
```bash
docker exec -it zcashd_regtest bash
```

### Inspect container
```bash
docker inspect zcashd_regtest
```

## Troubleshooting

### Check if container is running
```bash
docker ps | grep zcashd_regtest
```

### Check container resource usage
```bash
docker stats zcashd_regtest
```

### View detailed error logs
```bash
docker logs zcashd_regtest 2>&1 | grep -i error
```

### Test RPC connection
```bash
curl --user zcashrpc:your_secure_password \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockchaininfo","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Reset the blockchain (start fresh)
```bash
docker stop zcashd_regtest
sudo rm -rf ./zcash-data-dir/regtest
docker start zcashd_regtest
```

## Security Notes

⚠️ **Important**: This setup is for development/testing only!

- Never use `rpcallowip=0.0.0.0/0` in production
- Always use strong passwords in production
- Never expose RPC ports to the public internet
- Consider using SSL/TLS for RPC connections in production
- The regtest network uses test coins with no real value

## Next Steps

1. Test creating and sending transactions
2. Experiment with shielded transactions using z-addresses
3. Build your application on top of the RPC API
4. Learn about migrating to Zebrad and Zallet (zcashd is being deprecated in 2025)

## Additional Resources

- [Zcash RPC Documentation](https://zcash.github.io/rpc/)
- [Zcashd GitHub Repository](https://github.com/zcash/zcash)
- [Zebra Documentation](https://zebra.zfnd.org/) (Future replacement)
- [Zcash Community Forum](https://forum.zcashcommunity.com/)

---

**Note**: Remember that zcashd is being deprecated and will be replaced by Zebrad and Zallet in 2025. Start planning your migration early!
