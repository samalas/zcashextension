// Shield Provider - Injected into web pages
// Provides a Web3-like interface for dApps to interact with Zcash wallet

(function() {
  'use strict';
  
  console.log('Shield provider initializing...');
  
  let requestId = 0;
  const pendingRequests = new Map();
  const eventListeners = new Map();
  
  // Create the provider object
  const zcashDefi = {
    // Provider identification
    isShield: true,
    isZcashDeFi: true, // Legacy compatibility
    isConnected: false,
    selectedAddress: null,
    chainId: 'zcash-mainnet',
    networkVersion: '1',
    
    // ============================================
    // CORE REQUEST METHOD
    // ============================================
    
    request: async function(args) {
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        
        pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'ZCASHDEFI_REQUEST',
          id: id,
          action: args.method,
          data: args.params || {}
        }, '*');
        
        // Timeout after 60 seconds
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 60000);
      });
    },
    
    // ============================================
    // CONNECTION METHODS
    // ============================================
    
    connect: async function() {
      try {
        const result = await this.request({ method: 'connectSite', params: {} });
        if (result && result.address) {
          this.isConnected = true;
          this.selectedAddress = result.address;
          this._emit('connect', { chainId: this.chainId });
        }
        return result;
      } catch (error) {
        this._emit('disconnect', { error });
        throw error;
      }
    },
    
    disconnect: function() {
      this.isConnected = false;
      this.selectedAddress = null;
      this._emit('disconnect', {});
    },
    
    // ============================================
    // ACCOUNT METHODS
    // ============================================
    
    getAccounts: async function() {
      try {
        const result = await this.request({ method: 'getWalletState', params: {} });
        if (result && result.address) {
          return [result.address];
        }
        return [];
      } catch (error) {
        console.error('getAccounts error:', error);
        return [];
      }
    },
    
    requestAccounts: async function() {
      await this.connect();
      return this.getAccounts();
    },
    
    // ============================================
    // BALANCE METHODS
    // ============================================
    
    getBalance: async function(address) {
      try {
        const result = await this.request({ method: 'getBalance', params: {} });
        if (result) {
          return {
            zec: result.zec || 0,
            usd: result.usd || 0,
            // Return balance in zatoshi (smallest unit) for compatibility
            zatoshi: Math.floor((result.zec || 0) * 100000000)
          };
        }
        return { zec: 0, usd: 0, zatoshi: 0 };
      } catch (error) {
        console.error('getBalance error:', error);
        return { zec: 0, usd: 0, zatoshi: 0 };
      }
    },
    
    // ============================================
    // TRANSACTION METHODS
    // ============================================
    
    sendTransaction: async function(txParams) {
      if (!txParams.to) {
        throw new Error('Recipient address (to) is required');
      }
      if (!txParams.value && !txParams.amount) {
        throw new Error('Amount is required');
      }
      
      const amount = txParams.amount || parseFloat(txParams.value);
      
      return this.request({
        method: 'sendTransaction',
        params: {
          address: txParams.to,
          amount: amount,
          comment: txParams.memo || txParams.comment || ''
        }
      });
    },
    
    // ============================================
    // ADDRESS METHODS
    // ============================================
    
    validateAddress: async function(address) {
      return this.request({
        method: 'validateAddress',
        params: { address }
      });
    },
    
    generateAddress: async function() {
      return this.request({
        method: 'generateAddress',
        params: {}
      });
    },
    
    // ============================================
    // BLOCKCHAIN INFO METHODS
    // ============================================
    
    getBlockchainInfo: async function() {
      return this.request({ method: 'getBlockchainInfo', params: {} });
    },
    
    getNetworkInfo: async function() {
      return this.request({ method: 'getNetworkInfo', params: {} });
    },
    
    estimateFee: async function(nblocks = 6) {
      return this.request({
        method: 'estimateFee',
        params: { nblocks }
      });
    },
    
    // ============================================
    // TRANSACTION HISTORY
    // ============================================
    
    getTransactions: async function(count = 10, skip = 0) {
      return this.request({
        method: 'getTransactions',
        params: { count, skip }
      });
    },
    
    // ============================================
    // EVENT HANDLING
    // ============================================
    
    on: function(event, callback) {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(callback);
      return this;
    },
    
    off: function(event, callback) {
      if (eventListeners.has(event)) {
        const listeners = eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      return this;
    },
    
    once: function(event, callback) {
      const wrapper = (...args) => {
        this.off(event, wrapper);
        callback(...args);
      };
      return this.on(event, wrapper);
    },
    
    removeAllListeners: function(event) {
      if (event) {
        eventListeners.delete(event);
      } else {
        eventListeners.clear();
      }
      return this;
    },
    
    _emit: function(event, data) {
      if (eventListeners.has(event)) {
        eventListeners.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${event} listener:`, error);
          }
        });
      }
    },
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    // Convert ZEC to zatoshi
    toZatoshi: function(zec) {
      return Math.floor(zec * 100000000);
    },
    
    // Convert zatoshi to ZEC
    fromZatoshi: function(zatoshi) {
      return zatoshi / 100000000;
    },
    
    // Check if extension is installed
    isInstalled: function() {
      return true;
    },
    
    // Get provider version
    getVersion: function() {
      return '1.0.0';
    }
  };
  
  // ============================================
  // MESSAGE HANDLING
  // ============================================
  
  // Listen for responses from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    // Handle responses
    if (event.data.type === 'ZCASHDEFI_RESPONSE') {
      const { id, response } = event.data;
      const pending = pendingRequests.get(id);
      
      if (pending) {
        pendingRequests.delete(id);
        
        if (response && response.success) {
          pending.resolve(response.data);
        } else {
          pending.reject(new Error(response?.error || 'Request failed'));
        }
      }
    }
    
    // Handle events from extension
    if (event.data.type === 'ZCASHDEFI_EVENT') {
      const { event: eventName, data } = event.data;
      
      // Update internal state based on events
      if (eventName === 'accountsChanged' && data && data.length > 0) {
        zcashDefi.selectedAddress = data[0];
      }
      
      if (eventName === 'connect') {
        zcashDefi.isConnected = true;
      }
      
      if (eventName === 'disconnect') {
        zcashDefi.isConnected = false;
        zcashDefi.selectedAddress = null;
      }
      
      // Emit event to listeners
      zcashDefi._emit(eventName, data);
    }
  });
  
  // ============================================
  // GLOBAL INJECTION
  // ============================================
  
  // Inject as window.zcashDefi
  Object.defineProperty(window, 'zcashDefi', {
    value: zcashDefi,
    writable: false,
    configurable: false
  });
  
  // Also inject as window.zcash for convenience
  if (!window.zcash) {
    Object.defineProperty(window, 'zcash', {
      value: zcashDefi,
      writable: false,
      configurable: false
    });
  }
  
  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('zcashdefi#initialized'));
  window.dispatchEvent(new CustomEvent('zcash#initialized'));
  
  console.log('Shield provider ready - Access via window.zcashDefi or window.zcash');
  
  // Announce provider for dApp detection
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'shield-wallet-001',
        name: 'Shield',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>',
        rdns: 'com.zcashdefi.wallet'
      },
      provider: zcashDefi
    }
  }));
  
})();
