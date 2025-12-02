// Zcash API Client for Chrome Extension
// Connects to the zcash-api-main backend

class ZcashAPIClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.apiKey = '';
    this.isConnected = false;
  }

  // Configure the API client
  configure(baseUrl, apiKey) {
    this.baseUrl = baseUrl || 'http://localhost:3000';
    this.apiKey = apiKey;
  }

  // Make authenticated API request
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

  // GET request helper
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request helper
  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============================================
  // HEALTH & CONNECTION
  // ============================================

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

  // ============================================
  // BLOCKCHAIN INFORMATION
  // ============================================

  async getBlockchainInfo() {
    return this.get('/api/zcash/blockchain/info');
  }

  async getBlockCount() {
    return this.get('/api/zcash/blockchain/blockcount');
  }

  async getBlockHash(height) {
    return this.get(`/api/zcash/blockchain/blockhash/${height}`);
  }

  async getBlock(blockhash, verbosity = 1) {
    return this.get(`/api/zcash/blockchain/block/${blockhash}`, { verbosity });
  }

  // ============================================
  // WALLET OPERATIONS
  // ============================================

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
    return this.get('/api/zcash/wallet/unspent', {
      minConfirmations,
      maxConfirmations,
    });
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async getTransaction(txid) {
    return this.get(`/api/zcash/transaction/${txid}`);
  }

  async listTransactions(count = 10, skip = 0) {
    return this.get('/api/zcash/transactions', { count, skip });
  }

  async getRawTransaction(txid, verbose = false) {
    return this.get(`/api/zcash/transaction/${txid}/raw`, { verbose });
  }

  async sendToAddress(address, amount, comment = '') {
    return this.post('/api/zcash/transaction/send', {
      address,
      amount,
      comment,
    });
  }

  // ============================================
  // ADDRESS VALIDATION
  // ============================================

  async validateAddress(address) {
    return this.get(`/api/zcash/address/validate/${address}`);
  }

  // ============================================
  // NETWORK INFORMATION
  // ============================================

  async getNetworkInfo() {
    return this.get('/api/zcash/network/info');
  }

  async getConnectionCount() {
    return this.get('/api/zcash/network/connections');
  }

  // ============================================
  // MINING INFORMATION
  // ============================================

  async getMiningInfo() {
    return this.get('/api/zcash/mining/info');
  }

  // ============================================
  // FEE ESTIMATION
  // ============================================

  async estimateFee(nblocks = 6) {
    return this.get('/api/zcash/fee/estimate', { nblocks });
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZcashAPIClient;
}

