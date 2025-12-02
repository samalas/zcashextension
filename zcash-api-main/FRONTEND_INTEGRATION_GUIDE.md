# Frontend Integration Guide for Zcash API Backend

This guide provides comprehensive examples for integrating a browser-based wallet frontend with the Zcash API backend service.

## Table of Contents
- [Authentication](#authentication)
- [Base Setup](#base-setup)
- [Wallet Operations](#wallet-operations)
  - [Getting Balances](#getting-balances)
  - [Creating Accounts & Addresses](#creating-accounts--addresses)
  - [Sending Transactions](#sending-transactions)
- [Transaction Monitoring](#transaction-monitoring)
- [Error Handling](#error-handling)
- [Complete Examples](#complete-examples)

---

## Authentication

All API endpoints require authentication using an API key passed in the `x-api-key` header.

```javascript
const API_KEY = 'your_api_key_here';
const BASE_URL = 'http://localhost:3000';
```

---

## Base Setup

### JavaScript/TypeScript Fetch Wrapper

```javascript
class ZcashAPIClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

// Initialize client
const zcashClient = new ZcashAPIClient(BASE_URL, API_KEY);
```

### React Hook Example

```javascript
import { useState, useCallback } from 'react';

function useZcashAPI(baseUrl, apiKey) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, apiKey]);

  return { makeRequest, loading, error };
}
```

---

## Wallet Operations

### Getting Balances

#### 1. Get Total Wallet Balance

```javascript
// Get overall wallet balance
async function getWalletBalance(minConfirmations = 1) {
  const response = await zcashClient.get('/api/zcash/wallet/balance', {
    minConfirmations: minConfirmations,
  });

  return response.data.balance;
}

// Example usage
const balance = await getWalletBalance(1);
console.log(`Wallet balance: ${balance} ZEC`);
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "balance": 10.5,
    "minConfirmations": 1
  }
}
```

#### 2. Get Balance for Specific Account (Shielded/Transparent Breakdown)

```javascript
// Get balance for a specific account with pool details
async function getAccountBalance(accountNumber, minconf = 1) {
  const response = await zcashClient.post('/api/zcash/wallet/getbalanceforaccount', {
    account: accountNumber,
    minconf: minconf,
  });

  const pools = response.data.pools;

  // Convert zatoshi to ZEC (1 ZEC = 100,000,000 zatoshi)
  const balances = {
    transparent: pools.transparent ? pools.transparent.valueZat / 100000000 : 0,
    sapling: pools.sapling ? pools.sapling.valueZat / 100000000 : 0,
    orchard: pools.orchard ? pools.orchard.valueZat / 100000000 : 0,
  };

  balances.total = balances.transparent + balances.sapling + balances.orchard;

  return balances;
}

// Example usage
const accountBalances = await getAccountBalance(0);
console.log('Account balances:', accountBalances);
// Output: { transparent: 1.5, sapling: 3.2, orchard: 5.8, total: 10.5 }
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "pools": {
      "transparent": { "valueZat": 150000000 },
      "sapling": { "valueZat": 320000000 },
      "orchard": { "valueZat": 580000000 }
    },
    "minimum_confirmations": 1
  }
}
```

#### 3. List All Accounts with Balances

```javascript
// Get all accounts and their balances
async function getAllAccountsWithBalances() {
  // First, list all accounts
  const accountsResponse = await zcashClient.get('/api/zcash/wallet/listaccounts');
  const accounts = accountsResponse.data;

  // Then get balance for each account
  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      const balances = await getAccountBalance(account.account);
      const addressResponse = await zcashClient.post('/api/zcash/wallet/getaddressforaccount', {
        account: account.account,
      });

      return {
        accountNumber: account.account,
        address: addressResponse.data.address,
        receiverTypes: addressResponse.data.receiverTypes,
        balances: balances,
      };
    })
  );

  return accountsWithBalances;
}
```

#### 4. Get Unspent Transaction Outputs (UTXOs)

```javascript
// List unspent outputs for transparent addresses
async function listUnspentOutputs(minConfirmations = 1, maxConfirmations = 9999999) {
  const response = await zcashClient.get('/api/zcash/wallet/unspent', {
    minConfirmations: minConfirmations,
    maxConfirmations: maxConfirmations,
  });

  return response.data;
}

// Example usage
const utxos = await listUnspentOutputs(1);
console.log(`Found ${utxos.length} unspent outputs`);
```

---

### Creating Accounts & Addresses

#### 1. Create New Shielded Account

```javascript
// Create a new shielded account (generates unified address)
async function createNewAccount() {
  const response = await zcashClient.post('/api/zcash/wallet/newaccount', {});

  return {
    accountNumber: response.data.account,
    address: response.data.address,
    receiverTypes: response.data.receiverTypes,
  };
}

// Example usage
const newAccount = await createNewAccount();
console.log('New account created:', newAccount);
// Output: { accountNumber: 5, address: 'u1...', receiverTypes: ['orchard', 'sapling', 'p2pkh'] }
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "account": 5,
    "address": "u1abc123...",
    "receiverTypes": ["orchard", "sapling", "p2pkh"]
  }
}
```

#### 2. Get Address for Existing Account

```javascript
// Get address for an existing account
async function getAccountAddress(accountNumber, diversifierIndex = null) {
  const body = { account: accountNumber };
  if (diversifierIndex !== null) {
    body.diversifierIndex = diversifierIndex;
  }

  const response = await zcashClient.post('/api/zcash/wallet/getaddressforaccount', body);

  return {
    address: response.data.address,
    receiverTypes: response.data.receiverTypes,
  };
}
```

#### 3. Validate Address

```javascript
// Validate a Zcash address
async function validateAddress(address) {
  const response = await zcashClient.get(`/api/zcash/address/validate/${address}`);

  return response.data;
}

// Example usage
const validation = await validateAddress('u1abc123...');
if (validation.isvalid) {
  console.log('Valid address!');
}
```

---

### Sending Transactions

#### 1. Simple Send (sendToAddress - Transparent Only)

```javascript
// Send to a single address (simpler method, primarily for transparent)
async function sendToAddress(recipientAddress, amount, comment = '') {
  const response = await zcashClient.post('/api/zcash/transaction/send', {
    address: recipientAddress,
    amount: amount,
    comment: comment,
  });

  return response.data.txid;
}

// Example usage
const txid = await sendToAddress('t1abc123...', 0.1, 'Payment for services');
console.log('Transaction ID:', txid);
```

**Request format:**
```json
{
  "address": "t1abc123...",
  "amount": 0.1,
  "comment": "Payment for services"
}
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "txid": "abcdef1234567890..."
  }
}
```

#### 2. z_sendmany - Send to Multiple Recipients (Shielded Transactions)

This is the primary method for browser wallets as it supports both transparent and shielded addresses, multiple recipients, and privacy controls.

```javascript
// Privacy policy options
const PrivacyPolicy = {
  FULL_PRIVACY: 'FullPrivacy',                      // Fully shielded
  LEGACY_COMPAT: 'LegacyCompat',                     // Compatible with older wallets
  ALLOW_REVEALED_AMOUNTS: 'AllowRevealedAmounts',
  ALLOW_REVEALED_RECIPIENTS: 'AllowRevealedRecipients',
  ALLOW_REVEALED_SENDERS: 'AllowRevealedSenders',
  ALLOW_FULLY_TRANSPARENT: 'AllowFullyTransparent', // Transparent transaction
  ALLOW_LINKING_ADDRESSES: 'AllowLinkingAccountAddresses',
  NO_PRIVACY: 'NoPrivacy',
};

// Send from one address to multiple recipients
async function sendMany(fromAddress, recipients, options = {}) {
  const {
    minConfirmations = 1,
    fee = null,
    privacyPolicy = PrivacyPolicy.FULL_PRIVACY,
  } = options;

  const body = {
    fromAddress: fromAddress,
    recipients: recipients,
    minconf: minConfirmations,
    privacyPolicy: privacyPolicy,
  };

  if (fee !== null) {
    body.fee = fee;
  }

  const response = await zcashClient.post('/api/zcash/transaction/z_sendmany', body);

  return response.data.operationId;
}

// Example 1: Send from transparent to shielded (shield funds)
async function shieldFunds(fromTransparentAddress, toShieldedAddress, amount) {
  const recipients = [
    {
      address: toShieldedAddress,
      amount: amount,
    },
  ];

  const operationId = await sendMany(fromTransparentAddress, recipients, {
    privacyPolicy: PrivacyPolicy.ALLOW_REVEALED_SENDERS,
  });

  return operationId;
}

// Example 2: Send from shielded to shielded (private transaction)
async function sendPrivate(fromShieldedAddress, toShieldedAddress, amount, memo = '') {
  const recipients = [
    {
      address: toShieldedAddress,
      amount: amount,
      memo: memo, // Optional memo (hex encoded)
    },
  ];

  const operationId = await sendMany(fromShieldedAddress, recipients, {
    privacyPolicy: PrivacyPolicy.FULL_PRIVACY,
  });

  return operationId;
}

// Example 3: Send to multiple recipients
async function sendToMultipleRecipients(fromAddress, recipientList) {
  // recipientList format: [{ address: 'u1...', amount: 0.5 }, ...]
  const operationId = await sendMany(fromAddress, recipientList, {
    privacyPolicy: PrivacyPolicy.ALLOW_REVEALED_SENDERS,
  });

  return operationId;
}

// Example 4: Transparent to transparent
async function sendTransparent(fromAddress, toAddress, amount) {
  const recipients = [{ address: toAddress, amount: amount }];

  const operationId = await sendMany(fromAddress, recipients, {
    privacyPolicy: PrivacyPolicy.ALLOW_FULLY_TRANSPARENT,
  });

  return operationId;
}
```

**Request format:**
```json
{
  "fromAddress": "u1abc123...",
  "recipients": [
    {
      "address": "u1def456...",
      "amount": 0.5,
      "memo": "Payment 1"
    },
    {
      "address": "u1ghi789...",
      "amount": 0.3,
      "memo": "Payment 2"
    }
  ],
  "minconf": 1,
  "privacyPolicy": "FullPrivacy"
}
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "operationId": "opid-12345678-abcd-1234-5678-abcdef123456"
  }
}
```

---

## Transaction Monitoring

Since `z_sendmany` operations are asynchronous, you need to poll for operation status.

### 1. Check Operation Status

```javascript
// Poll for operation status
async function getOperationStatus(operationIds = null) {
  const body = operationIds ? { operationIds: operationIds } : {};

  const response = await zcashClient.post(
    '/api/zcash/transaction/z_getoperationstatus',
    body
  );

  return response.data;
}

// Example: Check specific operation
const status = await getOperationStatus(['opid-12345678...']);
console.log('Operation status:', status[0].status);
// Possible statuses: 'queued', 'executing', 'success', 'failed', 'cancelled'
```

### 2. Wait for Operation to Complete

```javascript
// Helper function to wait for operation completion
async function waitForOperation(operationId, maxAttempts = 30, pollInterval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const operations = await getOperationStatus([operationId]);

    if (operations.length === 0) {
      throw new Error('Operation not found');
    }

    const operation = operations[0];

    if (operation.status === 'success') {
      return {
        txid: operation.result.txid,
        status: 'success',
      };
    } else if (operation.status === 'failed') {
      throw new Error(`Transaction failed: ${operation.error?.message || 'Unknown error'}`);
    }

    // Status is 'queued' or 'executing', continue waiting
  }

  throw new Error('Operation timed out');
}

// Usage
const operationId = await sendPrivate('u1abc...', 'u1def...', 0.5);
console.log('Operation started:', operationId);

const result = await waitForOperation(operationId);
console.log('Transaction completed:', result.txid);
```

**Response format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "opid-12345678...",
      "status": "success",
      "creation_time": 1234567890,
      "result": {
        "txid": "abcdef1234567890..."
      },
      "method": "z_sendmany",
      "params": { ... }
    }
  ]
}
```

### 3. Get Operation Result

```javascript
// Get and remove completed operations
async function getOperationResult(operationIds = null) {
  const body = operationIds ? { operationIds: operationIds } : {};

  const response = await zcashClient.post(
    '/api/zcash/transaction/z_getoperationresult',
    body
  );

  return response.data;
}
```

### 4. Get Transaction Details

```javascript
// Get transaction information by txid
async function getTransaction(txid) {
  const response = await zcashClient.get(`/api/zcash/transaction/${txid}`);
  return response.data;
}

// List recent transactions
async function listRecentTransactions(count = 10, skip = 0) {
  const response = await zcashClient.get('/api/zcash/transactions', {
    count: count,
    skip: skip,
  });

  return response.data;
}
```

---

## Error Handling

### Comprehensive Error Handling

```javascript
async function sendTransactionWithErrorHandling(fromAddress, toAddress, amount) {
  try {
    // Validate addresses first
    const fromValidation = await validateAddress(fromAddress);
    if (!fromValidation.isvalid) {
      throw new Error('Invalid sender address');
    }

    const toValidation = await validateAddress(toAddress);
    if (!toValidation.isvalid) {
      throw new Error('Invalid recipient address');
    }

    // Check balance (for account-based addresses)
    // ... balance checking logic ...

    // Send transaction
    const operationId = await sendMany(fromAddress, [
      { address: toAddress, amount: amount }
    ]);

    console.log('Transaction initiated:', operationId);

    // Wait for completion
    const result = await waitForOperation(operationId, 30, 2000);

    return {
      success: true,
      txid: result.txid,
    };

  } catch (error) {
    console.error('Transaction error:', error);

    // Handle specific error cases
    if (error.message.includes('insufficient funds')) {
      return { success: false, error: 'Insufficient balance' };
    } else if (error.message.includes('invalid address')) {
      return { success: false, error: 'Invalid address format' };
    } else if (error.message.includes('timed out')) {
      return { success: false, error: 'Transaction is taking longer than expected' };
    }

    return { success: false, error: error.message };
  }
}
```

---

## Complete Examples

### Example 1: Complete Wallet Component (React)

```javascript
import React, { useState, useEffect } from 'react';

function ZcashWallet() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiClient = new ZcashAPIClient(
    'http://localhost:3000',
    'your_api_key_here'
  );

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load balance when account is selected
  useEffect(() => {
    if (selectedAccount !== null) {
      loadBalance();
    }
  }, [selectedAccount]);

  async function loadAccounts() {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/zcash/wallet/listaccounts');
      setAccounts(response.data);
      if (response.data.length > 0) {
        setSelectedAccount(response.data[0].account);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBalance() {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/zcash/wallet/getbalanceforaccount', {
        account: selectedAccount,
      });

      const pools = response.data.pools;
      const balances = {
        transparent: pools.transparent ? pools.transparent.valueZat / 100000000 : 0,
        sapling: pools.sapling ? pools.sapling.valueZat / 100000000 : 0,
        orchard: pools.orchard ? pools.orchard.valueZat / 100000000 : 0,
      };
      balances.total = balances.transparent + balances.sapling + balances.orchard;

      setBalance(balances);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    setLoading(true);
    try {
      await apiClient.post('/api/zcash/wallet/newaccount', {});
      await loadAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wallet">
      <h1>Zcash Wallet</h1>

      {loading && <div>Loading...</div>}

      <div className="accounts">
        <h2>Accounts</h2>
        <button onClick={createAccount}>Create New Account</button>
        <select
          value={selectedAccount || ''}
          onChange={(e) => setSelectedAccount(Number(e.target.value))}
        >
          {accounts.map(acc => (
            <option key={acc.account} value={acc.account}>
              Account {acc.account}
            </option>
          ))}
        </select>
      </div>

      {balance && (
        <div className="balance">
          <h2>Balance</h2>
          <div>Transparent: {balance.transparent} ZEC</div>
          <div>Sapling: {balance.sapling} ZEC</div>
          <div>Orchard: {balance.orchard} ZEC</div>
          <div><strong>Total: {balance.total} ZEC</strong></div>
        </div>
      )}
    </div>
  );
}

export default ZcashWallet;
```

### Example 2: Send Transaction Form (React)

```javascript
function SendTransactionForm({ fromAddress, onSuccess }) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('FullPrivacy');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  const apiClient = new ZcashAPIClient(
    'http://localhost:3000',
    'your_api_key_here'
  );

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setStatus('Validating...');

    try {
      // Validate recipient address
      const validation = await apiClient.get(`/api/zcash/address/validate/${toAddress}`);
      if (!validation.data.isvalid) {
        throw new Error('Invalid recipient address');
      }

      setStatus('Sending transaction...');

      // Send transaction
      const response = await apiClient.post('/api/zcash/transaction/z_sendmany', {
        fromAddress: fromAddress,
        recipients: [
          {
            address: toAddress,
            amount: parseFloat(amount),
            memo: memo,
          },
        ],
        minconf: 1,
        privacyPolicy: privacyPolicy,
      });

      const operationId = response.data.operationId;
      setStatus(`Operation started: ${operationId}`);

      // Poll for completion
      const result = await waitForOperation(operationId);

      setStatus(`Success! Transaction ID: ${result.txid}`);

      // Reset form
      setToAddress('');
      setAmount('');
      setMemo('');

      if (onSuccess) {
        onSuccess(result.txid);
      }

    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  async function waitForOperation(operationId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await apiClient.post(
        '/api/zcash/transaction/z_getoperationstatus',
        { operationIds: [operationId] }
      );

      const operations = statusResponse.data;
      if (operations.length > 0) {
        const operation = operations[0];

        setStatus(`Status: ${operation.status}...`);

        if (operation.status === 'success') {
          return { txid: operation.result.txid };
        } else if (operation.status === 'failed') {
          throw new Error(operation.error?.message || 'Transaction failed');
        }
      }
    }

    throw new Error('Operation timed out');
  }

  return (
    <form onSubmit={handleSend}>
      <h2>Send Transaction</h2>

      <div>
        <label>From: {fromAddress}</label>
      </div>

      <div>
        <label>To Address:</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          required
          placeholder="u1... or t1..."
        />
      </div>

      <div>
        <label>Amount (ZEC):</label>
        <input
          type="number"
          step="0.00000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0"
        />
      </div>

      <div>
        <label>Memo (optional):</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Optional message"
        />
      </div>

      <div>
        <label>Privacy Policy:</label>
        <select value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)}>
          <option value="FullPrivacy">Full Privacy (Shielded)</option>
          <option value="AllowRevealedSenders">Allow Revealed Senders</option>
          <option value="AllowFullyTransparent">Fully Transparent</option>
        </select>
      </div>

      <button type="submit" disabled={sending}>
        {sending ? 'Sending...' : 'Send'}
      </button>

      {status && <div className="status">{status}</div>}
    </form>
  );
}
```

### Example 3: Vanilla JavaScript Client

```javascript
// Complete vanilla JavaScript example
class ZcashBrowserWallet {
  constructor(apiUrl, apiKey) {
    this.client = new ZcashAPIClient(apiUrl, apiKey);
  }

  async initialize() {
    try {
      // Get blockchain info
      const blockchainInfo = await this.client.get('/api/zcash/blockchain/info');
      console.log('Connected to blockchain:', blockchainInfo.data.chain);

      // List accounts
      const accounts = await this.client.get('/api/zcash/wallet/listaccounts');
      console.log(`Found ${accounts.data.length} accounts`);

      return true;
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      return false;
    }
  }

  async getAccountInfo(accountNumber) {
    // Get address
    const addressResponse = await this.client.post('/api/zcash/wallet/getaddressforaccount', {
      account: accountNumber,
    });

    // Get balance
    const balanceResponse = await this.client.post('/api/zcash/wallet/getbalanceforaccount', {
      account: accountNumber,
    });

    const pools = balanceResponse.data.pools;
    const balance = {
      transparent: pools.transparent ? pools.transparent.valueZat / 100000000 : 0,
      sapling: pools.sapling ? pools.sapling.valueZat / 100000000 : 0,
      orchard: pools.orchard ? pools.orchard.valueZat / 100000000 : 0,
    };
    balance.total = balance.transparent + balance.sapling + balance.orchard;

    return {
      account: accountNumber,
      address: addressResponse.data.address,
      receiverTypes: addressResponse.data.receiverTypes,
      balance: balance,
    };
  }

  async sendTransaction(fromAddress, toAddress, amount, privacyPolicy = 'FullPrivacy') {
    // Initiate transaction
    const sendResponse = await this.client.post('/api/zcash/transaction/z_sendmany', {
      fromAddress: fromAddress,
      recipients: [{ address: toAddress, amount: amount }],
      minconf: 1,
      privacyPolicy: privacyPolicy,
    });

    const operationId = sendResponse.data.operationId;

    // Wait for completion
    return await this.waitForOperation(operationId);
  }

  async waitForOperation(operationId, maxAttempts = 30, pollInterval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await this.client.post(
        '/api/zcash/transaction/z_getoperationstatus',
        { operationIds: [operationId] }
      );

      const operations = statusResponse.data;
      if (operations.length > 0) {
        const operation = operations[0];

        if (operation.status === 'success') {
          return { success: true, txid: operation.result.txid };
        } else if (operation.status === 'failed') {
          return { success: false, error: operation.error?.message };
        }
      }
    }

    return { success: false, error: 'Operation timed out' };
  }
}

// Usage
const wallet = new ZcashBrowserWallet('http://localhost:3000', 'your_api_key_here');

async function example() {
  // Initialize
  await wallet.initialize();

  // Get account info
  const accountInfo = await wallet.getAccountInfo(0);
  console.log('Account info:', accountInfo);

  // Send transaction
  const result = await wallet.sendTransaction(
    accountInfo.address,
    'u1destination...',
    0.1,
    'FullPrivacy'
  );

  if (result.success) {
    console.log('Transaction successful:', result.txid);
  } else {
    console.error('Transaction failed:', result.error);
  }
}
```

---

## Key Concepts for Browser Wallets

### 1. Understanding Address Types

- **Transparent (t-addresses)**: Start with `t1`, visible on blockchain, like Bitcoin
- **Shielded Sapling (z-addresses)**: Start with `zs`, private transactions
- **Unified Addresses (u-addresses)**: Start with `u1`, can receive to multiple pools
- **ANY_TADDR**: Special sender address to use any transparent funds in wallet

### 2. Privacy Policies

Choose the appropriate privacy policy based on transaction type:

- **FullPrivacy**: Shielded → Shielded (best privacy)
- **AllowRevealedSenders**: Transparent → Shielded (shielding funds)
- **AllowRevealedRecipients**: Shielded → Transparent (unshielding funds)
- **AllowFullyTransparent**: Transparent → Transparent
- **NoPrivacy**: Allow any combination

### 3. Zatoshi Conversion

- 1 ZEC = 100,000,000 zatoshi
- Always convert zatoshi to ZEC for display: `valueZat / 100000000`
- API accepts amounts in ZEC, not zatoshi

### 4. Async Operations

- `z_sendmany` returns immediately with an operation ID
- You must poll `z_getoperationstatus` to check completion
- Transactions can take 10-60 seconds to complete
- Always implement timeout handling

### 5. Transaction Confirmations

- `minconf` parameter specifies minimum confirmations
- Default is 1 confirmation
- Higher values increase security but require more waiting

---

## Security Best Practices

1. **Never expose API keys in client-side code**: Use environment variables and proxy through your backend
2. **Validate all addresses** before sending transactions
3. **Check balances** before attempting to send
4. **Implement rate limiting** to prevent abuse
5. **Use HTTPS** in production
6. **Sanitize user inputs** for memos and amounts
7. **Implement proper error handling** to avoid exposing sensitive information
8. **Store operation IDs** to track pending transactions across page refreshes

---

## Additional Resources

- **API Base URL**: Typically `http://localhost:3000` in development
- **All endpoints**: Prefix with `/api/zcash/`
- **Authentication**: Required for all endpoints via `x-api-key` header
- **Response format**: All successful responses have `{ success: true, data: {...} }`
- **Error format**: Failed responses have `{ success: false, error: "message" }`

For more detailed information on specific RPC methods, refer to the Zcash RPC documentation.
