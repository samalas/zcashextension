# ZCash API Routes

All endpoints require authentication with an API key in the `x-api-key` header.

**Base URL:** `http://localhost:3000/api/v1/zcash`

---

## Blockchain Information

### Get Blockchain Info
```bash
curl -X GET http://localhost:3000/api/v1/zcash/blockchain/info \
  -H "x-api-key: test-api-key-12345"
```

### Get Block Count
```bash
curl -X GET http://localhost:3000/api/v1/zcash/blockchain/blockcount \
  -H "x-api-key: test-api-key-12345"
```

### Get Block Hash by Height
```bash
curl -X GET http://localhost:3000/api/v1/zcash/blockchain/blockhash/1 \
  -H "x-api-key: test-api-key-12345"
```

### Get Block by Hash
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/blockchain/block/00040fe8ec8471911baa1db1266ea15dd06b4a8a5c453883c000b031973dce08?verbosity=1" \
  -H "x-api-key: test-api-key-12345"
```

---

## Wallet Operations

### Get Wallet Info
```bash
curl -X GET http://localhost:3000/api/v1/zcash/wallet/info \
  -H "x-api-key: test-api-key-12345"
```

### Get Balance
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/wallet/balance?minConfirmations=1" \
  -H "x-api-key: test-api-key-12345"
```

### Generate New Address (Keypair)
```bash
curl -X POST http://localhost:3000/api/v1/zcash/wallet/newaddress \
  -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or with an account name:
```bash
curl -X POST http://localhost:3000/api/v1/zcash/wallet/newaddress \
  -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"account": "test-account"}'
```

### List Unspent Outputs
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/wallet/unspent?minConfirmations=1&maxConfirmations=9999999" \
  -H "x-api-key: test-api-key-12345"
```

---

## Transactions

### Get Transaction by TXID
```bash
curl -X GET http://localhost:3000/api/v1/zcash/transaction/YOUR_TXID_HERE \
  -H "x-api-key: test-api-key-12345"
```

### List Transactions
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/transactions?count=10&skip=0" \
  -H "x-api-key: test-api-key-12345"
```

### Get Raw Transaction
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/transaction/YOUR_TXID_HERE/raw?verbose=true" \
  -H "x-api-key: test-api-key-12345"
```

### Send to Address
```bash
curl -X POST http://localhost:3000/api/v1/zcash/transaction/send \
  -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ",
    "amount": 0.001,
    "comment": "Test transaction"
  }'
```

---

## Address Validation

### Validate Address
```bash
curl -X GET http://localhost:3000/api/v1/zcash/address/validate/tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ \
  -H "x-api-key: test-api-key-12345"
```

---

## Network Information

### Get Network Info
```bash
curl -X GET http://localhost:3000/api/v1/zcash/network/info \
  -H "x-api-key: test-api-key-12345"
```

### Get Connection Count
```bash
curl -X GET http://localhost:3000/api/v1/zcash/network/connections \
  -H "x-api-key: test-api-key-12345"
```

---

## Mining Information

### Get Mining Info
```bash
curl -X GET http://localhost:3000/api/v1/zcash/mining/info \
  -H "x-api-key: test-api-key-12345"
```

---

## Fee Estimation

### Estimate Fee
```bash
curl -X GET "http://localhost:3000/api/v1/zcash/fee/estimate?nblocks=6" \
  -H "x-api-key: test-api-key-12345"
```

---

## Testing Workflow

### 1. Generate a new keypair (address):
```bash
curl -X POST http://localhost:3000/api/v1/zcash/wallet/newaddress \
  -H "x-api-key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Check wallet balance:
```bash
curl -X GET http://localhost:3000/api/v1/zcash/wallet/balance \
  -H "x-api-key: test-api-key-12345"
```

### 3. Validate the generated address:
```bash
curl -X GET http://localhost:3000/api/v1/zcash/address/validate/YOUR_ADDRESS_HERE \
  -H "x-api-key: test-api-key-12345"
```

### 4. List unspent outputs:
```bash
curl -X GET http://localhost:3000/api/v1/zcash/wallet/unspent \
  -H "x-api-key: test-api-key-12345"
```

---

## Notes

- Replace `YOUR_TXID_HERE` with an actual transaction ID
- Replace `YOUR_ADDRESS_HERE` with an actual ZCash address
- The API key `test-api-key-12345` is configured in your `.env` file
- Your local testnet is running on `http://localhost:18232/`
- The API server runs on port `3000` by default
