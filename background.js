// Zcash API Client for Chrome Extension Background Service Worker
// ============================================

class ZcashAPIClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.apiKey = '';
    this.isConnected = false;
  }

  configure(baseUrl, apiKey) {
    this.baseUrl = baseUrl || 'http://localhost:3000';
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
        throw new Error(data.error || `API request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Zcash API Error:', error);
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

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      this.isConnected = response.ok;
      return { success: response.ok, data };
    } catch (error) {
      this.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  async getBlockchainInfo() {
    return this.get('/api/zcash/blockchain/info');
  }

  async getBlockCount() {
    return this.get('/api/zcash/blockchain/blockcount');
  }

  async getWalletInfo() {
    return this.get('/api/zcash/wallet/info');
  }

  async getBalance(minConfirmations = 1) {
    return this.get('/api/zcash/wallet/balance', { minConfirmations });
  }

  async generateNewAddress(account = '') {
    return this.post('/api/zcash/wallet/newaddress', { account });
  }

  async listUnspent(minConfirmations = 1, maxConfirmations = 9999999) {
    return this.get('/api/zcash/wallet/unspent', { minConfirmations, maxConfirmations });
  }

  async getTransaction(txid) {
    return this.get(`/api/zcash/transaction/${txid}`);
  }

  async listTransactions(count = 10, skip = 0) {
    return this.get('/api/zcash/transactions', { count, skip });
  }

  async sendToAddress(address, amount, comment = '') {
    return this.post('/api/zcash/transaction/send', { address, amount, comment });
  }

  async validateAddress(address) {
    return this.get(`/api/zcash/address/validate/${address}`);
  }

  async getNetworkInfo() {
    return this.get('/api/zcash/network/info');
  }

  async getConnectionCount() {
    return this.get('/api/zcash/network/connections');
  }

  async getMiningInfo() {
    return this.get('/api/zcash/mining/info');
  }

  async estimateFee(nblocks = 6) {
    return this.get('/api/zcash/fee/estimate', { nblocks });
  }
}

// ============================================
// WALLET STATE MANAGEMENT
// ============================================

const api = new ZcashAPIClient();

let walletState = {
  isLocked: true,
  isConnected: false,
  connectionError: null,
  address: null,
  balance: {
    zec: 0,
    usd: 0
  },
  tokens: [],
  transactions: [],
  network: 'mainnet',
  networkInfo: null,
  blockchainInfo: null,
  connectedSites: [],
  config: {
    apiUrl: 'http://localhost:3000',
    apiKey: 'test-api-key-12345' // Default test key - user should configure their own
  }
};

// ZEC price (would normally come from an API)
const ZEC_PRICE_USD = 40.00;

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('ZcashDeFi Wallet installed');
  initializeWallet();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('ZcashDeFi Wallet started');
  initializeWallet();
});

async function initializeWallet() {
  const stored = await chrome.storage.local.get(['walletState']);
  
  if (stored.walletState) {
    walletState = { ...walletState, ...stored.walletState };
  }
  
  // Configure API client
  api.configure(walletState.config.apiUrl, walletState.config.apiKey);
  
  // Try to connect to backend
  await connectToBackend();
}

async function connectToBackend() {
  try {
    const healthCheck = await api.checkHealth();
    
    if (healthCheck.success) {
      walletState.isConnected = true;
      walletState.connectionError = null;
      walletState.isLocked = false;
      
      // Fetch initial data
      await refreshWalletData();
      
      console.log('Connected to Zcash backend successfully');
    } else {
      walletState.isConnected = false;
      walletState.connectionError = healthCheck.error || 'Failed to connect to backend';
      console.error('Backend connection failed:', walletState.connectionError);
    }
  } catch (error) {
    walletState.isConnected = false;
    walletState.connectionError = error.message;
    console.error('Backend connection error:', error);
  }
  
  await saveWalletState();
}

async function refreshWalletData() {
  if (!walletState.isConnected) return;
  
  try {
    // Fetch balance
    const balanceResponse = await api.getBalance();
    if (balanceResponse.success) {
      const balance = balanceResponse.data.balance || 0;
      walletState.balance = {
        zec: balance,
        usd: balance * ZEC_PRICE_USD
      };
    }
    
    // Fetch blockchain info
    try {
      const blockchainResponse = await api.getBlockchainInfo();
      if (blockchainResponse.success) {
        walletState.blockchainInfo = blockchainResponse.data;
        walletState.network = blockchainResponse.data.chain || 'mainnet';
      }
    } catch (e) {
      console.warn('Could not fetch blockchain info:', e.message);
    }
    
    // Fetch network info
    try {
      const networkResponse = await api.getNetworkInfo();
      if (networkResponse.success) {
        walletState.networkInfo = networkResponse.data;
      }
    } catch (e) {
      console.warn('Could not fetch network info:', e.message);
    }
    
    // Fetch transactions
    try {
      const txResponse = await api.listTransactions(20, 0);
      if (txResponse.success && txResponse.data) {
        walletState.transactions = formatTransactions(txResponse.data);
      }
    } catch (e) {
      console.warn('Could not fetch transactions:', e.message);
    }
    
    // Fetch unspent outputs for address info
    try {
      const unspentResponse = await api.listUnspent();
      if (unspentResponse.success && unspentResponse.data && unspentResponse.data.length > 0) {
        // Get first address from unspent outputs
        walletState.address = unspentResponse.data[0].address;
      }
    } catch (e) {
      console.warn('Could not fetch unspent outputs:', e.message);
    }
    
    // Update tokens list with ZEC balance
    walletState.tokens = [
      {
        symbol: 'ZEC',
        name: 'Zcash',
        amount: walletState.balance.zec,
        value: walletState.balance.usd,
        icon: '⚡'
      }
    ];
    
    await saveWalletState();
    
  } catch (error) {
    console.error('Error refreshing wallet data:', error);
  }
}

function formatTransactions(txList) {
  if (!Array.isArray(txList)) return [];
  
  return txList.map(tx => ({
    type: tx.category || (tx.amount >= 0 ? 'receive' : 'send'),
    amount: tx.amount || 0,
    token: 'ZEC',
    time: tx.time ? tx.time * 1000 : Date.now(),
    hash: tx.txid || '',
    confirmations: tx.confirmations || 0,
    address: tx.address || '',
    status: tx.confirmations > 0 ? 'confirmed' : 'pending'
  }));
}

async function saveWalletState() {
  await chrome.storage.local.set({ walletState });
}

// ============================================
// MESSAGE HANDLERS
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  handleMessage(request, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ success: false, error: error.message }));
  
  return true; // Will respond asynchronously
});

async function handleMessage(request, sender) {
  switch (request.action) {
    case 'getWalletState':
      return { success: true, data: walletState };
      
    case 'refreshWallet':
      await refreshWalletData();
      return { success: true, data: walletState };
      
    case 'updateConfig':
      return await handleUpdateConfig(request.data);
      
    case 'connectBackend':
      return await handleConnectBackend();
      
    case 'getBalance':
      return await handleGetBalance();
      
    case 'generateAddress':
      return await handleGenerateAddress(request.data);
      
    case 'sendTransaction':
      return await handleSendTransaction(request.data);
      
    case 'validateAddress':
      return await handleValidateAddress(request.data);
      
    case 'getTransactions':
      return await handleGetTransactions(request.data);
      
    case 'getBlockchainInfo':
      return await handleGetBlockchainInfo();
      
    case 'getNetworkInfo':
      return await handleGetNetworkInfo();
      
    case 'estimateFee':
      return await handleEstimateFee(request.data);
      
    case 'connectSite':
      return await handleConnectSite(request.data, sender);
      
    case 'getConnectedSites':
      return { success: true, data: walletState.connectedSites };
      
    case 'switchNetwork':
      walletState.network = request.network;
      await saveWalletState();
      return { success: true };
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}

async function handleUpdateConfig(data) {
  if (data.apiUrl) {
    walletState.config.apiUrl = data.apiUrl;
  }
  if (data.apiKey) {
    walletState.config.apiKey = data.apiKey;
  }
  
  api.configure(walletState.config.apiUrl, walletState.config.apiKey);
  await saveWalletState();
  
  // Try to reconnect with new config
  await connectToBackend();
  
  return { success: true, data: walletState };
}

async function handleConnectBackend() {
  await connectToBackend();
  return { success: walletState.isConnected, data: walletState };
}

async function handleGetBalance() {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const response = await api.getBalance();
    if (response.success) {
      const balance = response.data.balance || 0;
      walletState.balance = {
        zec: balance,
        usd: balance * ZEC_PRICE_USD
      };
      await saveWalletState();
      return { success: true, data: walletState.balance };
    }
    return { success: false, error: 'Failed to get balance' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGenerateAddress(data) {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const account = data?.account || '';
    const response = await api.generateNewAddress(account);
    
    if (response.success) {
      walletState.address = response.data.address || response.data;
      await saveWalletState();
      return { success: true, data: { address: walletState.address } };
    }
    return { success: false, error: 'Failed to generate address' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSendTransaction(data) {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  if (!data.address || !data.amount) {
    return { success: false, error: 'Address and amount are required' };
  }
  
  try {
    // Validate address first
    const validationResponse = await api.validateAddress(data.address);
    if (!validationResponse.success || !validationResponse.data.isvalid) {
      return { success: false, error: 'Invalid recipient address' };
    }
    
    // Send transaction
    const response = await api.sendToAddress(
      data.address,
      parseFloat(data.amount),
      data.comment || ''
    );
    
    if (response.success) {
      // Add to local transactions
      const newTx = {
        type: 'send',
        amount: -parseFloat(data.amount),
        token: 'ZEC',
        time: Date.now(),
        hash: response.data.txid || response.data,
        status: 'pending',
        address: data.address
      };
      
      walletState.transactions.unshift(newTx);
      walletState.balance.zec -= parseFloat(data.amount);
      walletState.balance.usd = walletState.balance.zec * ZEC_PRICE_USD;
      
      await saveWalletState();
      
      return { success: true, data: newTx };
    }
    
    return { success: false, error: response.error || 'Transaction failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleValidateAddress(data) {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  if (!data.address) {
    return { success: false, error: 'Address is required' };
  }
  
  try {
    const response = await api.validateAddress(data.address);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetTransactions(data) {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const count = data?.count || 10;
    const skip = data?.skip || 0;
    const response = await api.listTransactions(count, skip);
    
    if (response.success) {
      const transactions = formatTransactions(response.data);
      walletState.transactions = transactions;
      await saveWalletState();
      return { success: true, data: transactions };
    }
    return { success: false, error: 'Failed to get transactions' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetBlockchainInfo() {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const response = await api.getBlockchainInfo();
    if (response.success) {
      walletState.blockchainInfo = response.data;
      await saveWalletState();
      return { success: true, data: response.data };
    }
    return { success: false, error: 'Failed to get blockchain info' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetNetworkInfo() {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const response = await api.getNetworkInfo();
    if (response.success) {
      walletState.networkInfo = response.data;
      await saveWalletState();
      return { success: true, data: response.data };
    }
    return { success: false, error: 'Failed to get network info' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleEstimateFee(data) {
  if (!walletState.isConnected) {
    return { success: false, error: 'Not connected to backend' };
  }
  
  try {
    const nblocks = data?.nblocks || 6;
    const response = await api.estimateFee(nblocks);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleConnectSite(data, sender) {
  const origin = sender.url ? new URL(sender.url).origin : data?.origin;
  
  if (!origin) {
    return { success: false, error: 'Could not determine site origin' };
  }
  
  if (!walletState.connectedSites.includes(origin)) {
    walletState.connectedSites.push(origin);
    await saveWalletState();
  }
  
  return {
    success: true,
    data: {
      address: walletState.address,
      network: walletState.network,
      isConnected: walletState.isConnected
    }
  };
}

// ============================================
// PERIODIC REFRESH
// ============================================

// Refresh wallet data every 30 seconds when connected
setInterval(async () => {
  if (walletState.isConnected) {
    await refreshWalletData();
  }
}, 30000);

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

console.log('ZcashDeFi Background Service Worker initialized');
