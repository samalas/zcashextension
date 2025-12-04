// Shield Wallet Popup Script
// Handles UI interactions and communication with background service worker

// ============================================
// STATE MANAGEMENT
// ============================================

let currentState = {
  isConnected: false,
  balance: { zec: 0, usd: 0 },
  address: null,
  tokens: [],
  transactions: [],
  network: 'mainnet',
  config: {
    apiUrl: 'http://localhost:3000',
    apiKey: ''
  }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadWalletState();
  setupEventListeners();
});

async function loadWalletState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getWalletState' });
    
    if (response.success) {
      currentState = response.data;
      updateUI();
    } else {
      showError('Failed to load wallet state');
    }
  } catch (error) {
    console.error('Error loading wallet state:', error);
    showError('Extension error: ' + error.message);
  }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateUI() {
  updateConnectionStatus();
  updateBalance();
  updateAddress();
  renderTokens();
  renderActivity();
  updateBlockchainInfo();
  updateSettingsForm();
}

function updateConnectionStatus() {
  const statusDot = document.getElementById('statusDot');
  const networkName = document.getElementById('networkName');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  
  if (currentState.isConnected) {
    statusDot.className = 'status-dot connected';
    networkName.textContent = `Zcash ${capitalize(currentState.network)}`;
    errorBanner.classList.remove('show');
    enableActionButtons(true);
  } else {
    statusDot.className = 'status-dot disconnected';
    networkName.textContent = 'Disconnected';
    
    if (currentState.connectionError) {
      errorMessage.textContent = currentState.connectionError;
      errorBanner.classList.add('show');
    }
    enableActionButtons(false);
  }
}

function updateBalance() {
  const balanceZec = document.getElementById('balanceZec');
  const balanceUsd = document.getElementById('balanceUsd');
  const availableBalance = document.getElementById('availableBalance');
  
  balanceZec.textContent = `${formatNumber(currentState.balance.zec)} ZEC`;
  balanceUsd.textContent = `≈ $${formatNumber(currentState.balance.usd)} USD`;
  
  if (availableBalance) {
    availableBalance.textContent = formatNumber(currentState.balance.zec);
  }
}

function updateAddress() {
  const walletAddress = document.getElementById('walletAddress');
  const receiveAddress = document.getElementById('receiveAddress');
  
  if (currentState.address) {
    const truncated = truncateAddress(currentState.address);
    walletAddress.textContent = truncated;
    
    if (receiveAddress) {
      receiveAddress.textContent = currentState.address;
    }
  } else {
    walletAddress.textContent = 'No address - generate one';
    if (receiveAddress) {
      receiveAddress.textContent = 'Generate an address first';
    }
  }
}

function renderTokens() {
  const container = document.getElementById('tokensContent');
  const tokens = currentState.tokens || [];
  
  if (tokens.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div>No tokens yet</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '<div class="token-list">' + tokens.map(token => `
    <div class="token-item">
      <div class="token-info">
        <div class="token-icon">${token.icon || '⚡'}</div>
        <div class="token-details">
          <div class="token-name">${escapeHtml(token.name)}</div>
          <div class="token-symbol">${escapeHtml(token.symbol)}</div>
        </div>
      </div>
      <div class="token-balance">
        <div class="token-amount">${formatNumber(token.amount)}</div>
        <div class="token-value">$${formatNumber(token.value)}</div>
      </div>
    </div>
  `).join('') + '</div>';
}

function renderActivity() {
  const container = document.getElementById('activityContent');
  const transactions = currentState.transactions || [];
  
  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div>No transactions yet</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = transactions.slice(0, 10).map(tx => {
    const icon = tx.type === 'send' ? '📤' : tx.type === 'receive' ? '📥' : '🔄';
    const timeAgo = formatTimeAgo(tx.time);
    const isPositive = tx.amount >= 0;
    const amountClass = isPositive ? 'positive' : 'negative';
    const amountPrefix = isPositive ? '+' : '';
    
    return `
      <div class="activity-item" title="${tx.hash || ''}">
        <div class="activity-left">
          <div class="activity-icon">${icon}</div>
          <div class="activity-details">
            <div class="activity-type">${capitalize(tx.type)} ${escapeHtml(tx.token || 'ZEC')}</div>
            <div class="activity-time">${timeAgo} • ${tx.status || 'confirmed'}</div>
          </div>
        </div>
        <div class="activity-amount ${amountClass}">${amountPrefix}${formatNumber(tx.amount)} ZEC</div>
      </div>
    `;
  }).join('');
}

function updateBlockchainInfo() {
  const infoNetwork = document.getElementById('infoNetwork');
  const infoBlockHeight = document.getElementById('infoBlockHeight');
  const infoConnections = document.getElementById('infoConnections');
  const infoVersion = document.getElementById('infoVersion');
  
  if (currentState.blockchainInfo) {
    infoNetwork.textContent = currentState.blockchainInfo.chain || currentState.network;
    infoBlockHeight.textContent = currentState.blockchainInfo.blocks?.toLocaleString() || '-';
  } else {
    infoNetwork.textContent = currentState.network;
    infoBlockHeight.textContent = '-';
  }
  
  if (currentState.networkInfo) {
    infoConnections.textContent = currentState.networkInfo.connections || '-';
    infoVersion.textContent = currentState.networkInfo.subversion || currentState.networkInfo.version || '-';
  } else {
    infoConnections.textContent = '-';
    infoVersion.textContent = '-';
  }
}

function updateSettingsForm() {
  const apiUrl = document.getElementById('apiUrl');
  const apiKey = document.getElementById('apiKey');
  
  if (currentState.config) {
    apiUrl.value = currentState.config.apiUrl || 'http://localhost:3000';
    apiKey.value = currentState.config.apiKey || '';
  }
}

function enableActionButtons(enabled) {
  const sendBtn = document.getElementById('sendBtn');
  const receiveBtn = document.getElementById('receiveBtn');
  const swapBtn = document.getElementById('swapBtn');
  
  if (enabled) {
    sendBtn.style.opacity = '1';
    sendBtn.style.pointerEvents = 'auto';
    receiveBtn.style.opacity = '1';
    receiveBtn.style.pointerEvents = 'auto';
  } else {
    sendBtn.style.opacity = '0.5';
    sendBtn.style.pointerEvents = 'none';
    receiveBtn.style.opacity = '0.5';
    receiveBtn.style.pointerEvents = 'none';
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.getAttribute('data-tab');
      document.querySelectorAll('.content-section').forEach(c => c.style.display = 'none');
      document.getElementById(tabName + 'Content').style.display = 'block';
    });
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', handleRefresh);
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    openModal('settingsModal');
  });
  
  // Action buttons
  document.getElementById('sendBtn').addEventListener('click', () => {
    if (currentState.isConnected) {
      document.getElementById('availableBalance').textContent = formatNumber(currentState.balance.zec);
      openModal('sendModal');
    }
  });
  
  document.getElementById('receiveBtn').addEventListener('click', () => {
    if (currentState.isConnected) {
      document.getElementById('receiveAddress').textContent = currentState.address || 'No address';
      openModal('receiveModal');
    }
  });
  
  document.getElementById('swapBtn').addEventListener('click', () => {
    alert('Swap feature coming soon! This will connect to L2 DEX protocols.');
  });
  
  // Address copy
  document.getElementById('addressDisplay').addEventListener('click', () => {
    if (currentState.address) {
      copyToClipboard(currentState.address);
      showToast('Address copied!');
    }
  });
  
  // Modal close buttons
  document.getElementById('closeSendModal').addEventListener('click', () => closeModal('sendModal'));
  document.getElementById('closeReceiveModal').addEventListener('click', () => closeModal('receiveModal'));
  document.getElementById('closeSettingsModal').addEventListener('click', () => closeModal('settingsModal'));
  
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
      }
    });
  });
  
  // Send modal actions
  document.getElementById('confirmSendBtn').addEventListener('click', handleSendTransaction);
  
  // Receive modal actions
  document.getElementById('copyAddressBtn').addEventListener('click', () => {
    if (currentState.address) {
      copyToClipboard(currentState.address);
      showStatusMessage('receiveStatus', 'Address copied to clipboard!', 'success');
    }
  });
  
  document.getElementById('newAddressBtn').addEventListener('click', handleGenerateAddress);
  
  // Settings modal actions
  document.getElementById('saveSettingsBtn').addEventListener('click', handleSaveSettings);
  document.getElementById('testConnectionBtn').addEventListener('click', handleTestConnection);
}

// ============================================
// ACTION HANDLERS
// ============================================

async function handleRefresh() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('spinning');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'refreshWallet' });
    
    if (response.success) {
      currentState = response.data;
      updateUI();
      showToast('Wallet refreshed!');
    } else {
      showError(response.error || 'Failed to refresh');
    }
  } catch (error) {
    showError('Refresh failed: ' + error.message);
  } finally {
    setTimeout(() => {
      refreshBtn.classList.remove('spinning');
    }, 500);
  }
}

async function handleSendTransaction() {
  const address = document.getElementById('sendAddress').value.trim();
  const amount = parseFloat(document.getElementById('sendAmount').value);
  const comment = document.getElementById('sendComment').value.trim();
  const statusEl = document.getElementById('sendStatus');
  const sendBtn = document.getElementById('confirmSendBtn');
  
  // Validation
  if (!address) {
    showStatusMessage('sendStatus', 'Please enter a recipient address', 'error');
    return;
  }
  
  if (!amount || amount <= 0) {
    showStatusMessage('sendStatus', 'Please enter a valid amount', 'error');
    return;
  }
  
  if (amount > currentState.balance.zec) {
    showStatusMessage('sendStatus', 'Insufficient balance', 'error');
    return;
  }
  
  // Disable button and show loading
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
  showStatusMessage('sendStatus', 'Validating and sending transaction...', 'success');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'sendTransaction',
      data: { address, amount, comment }
    });
    
    if (response.success) {
      showStatusMessage('sendStatus', `Transaction sent! TxID: ${truncateAddress(response.data.hash)}`, 'success');
      
      // Clear form
      document.getElementById('sendAddress').value = '';
      document.getElementById('sendAmount').value = '';
      document.getElementById('sendComment').value = '';
      
      // Refresh wallet state
      await loadWalletState();
      
      // Close modal after delay
      setTimeout(() => {
        closeModal('sendModal');
      }, 2000);
    } else {
      showStatusMessage('sendStatus', response.error || 'Transaction failed', 'error');
    }
  } catch (error) {
    showStatusMessage('sendStatus', 'Error: ' + error.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send Transaction';
  }
}

async function handleGenerateAddress() {
  const newAddressBtn = document.getElementById('newAddressBtn');
  newAddressBtn.disabled = true;
  newAddressBtn.innerHTML = '<span class="loading-spinner"></span> Generating...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateAddress',
      data: {}
    });
    
    if (response.success) {
      currentState.address = response.data.address;
      document.getElementById('receiveAddress').textContent = response.data.address;
      updateAddress();
      showStatusMessage('receiveStatus', 'New address generated!', 'success');
    } else {
      showStatusMessage('receiveStatus', response.error || 'Failed to generate address', 'error');
    }
  } catch (error) {
    showStatusMessage('receiveStatus', 'Error: ' + error.message, 'error');
  } finally {
    newAddressBtn.disabled = false;
    newAddressBtn.innerHTML = 'Generate New Address';
  }
}

async function handleSaveSettings() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const saveBtn = document.getElementById('saveSettingsBtn');
  
  if (!apiUrl) {
    showStatusMessage('settingsStatus', 'Please enter an API URL', 'error');
    return;
  }
  
  if (!apiKey) {
    showStatusMessage('settingsStatus', 'Please enter an API key', 'error');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="loading-spinner"></span> Connecting...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateConfig',
      data: { apiUrl, apiKey }
    });
    
    if (response.success && response.data.isConnected) {
      currentState = response.data;
      updateUI();
      showStatusMessage('settingsStatus', 'Connected successfully!', 'success');
      
      setTimeout(() => {
        closeModal('settingsModal');
      }, 1500);
    } else {
      showStatusMessage('settingsStatus', response.data?.connectionError || 'Failed to connect', 'error');
    }
  } catch (error) {
    showStatusMessage('settingsStatus', 'Error: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save & Connect';
  }
}

async function handleTestConnection() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const testBtn = document.getElementById('testConnectionBtn');
  
  if (!apiUrl) {
    showStatusMessage('settingsStatus', 'Please enter an API URL', 'error');
    return;
  }
  
  testBtn.disabled = true;
  testBtn.innerHTML = '<span class="loading-spinner"></span> Testing...';
  
  try {
    const response = await fetch(`${apiUrl}/health`);
    const data = await response.json();
    
    if (response.ok) {
      showStatusMessage('settingsStatus', '✓ Server is reachable!', 'success');
    } else {
      showStatusMessage('settingsStatus', 'Server responded with error', 'error');
    }
  } catch (error) {
    showStatusMessage('settingsStatus', 'Cannot reach server: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = 'Test Connection';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
  // Clear status messages
  const statusEl = document.querySelector(`#${modalId} .status-message`);
  if (statusEl) {
    statusEl.classList.remove('show');
  }
}

function showStatusMessage(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status-message show ${type}`;
}

function showError(message) {
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorBanner.classList.add('show');
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(74, 222, 128, 0.9);
    color: #000;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function formatNumber(num) {
  if (typeof num !== 'number') return '0.00';
  return num.toFixed(num < 1 ? 8 : 2);
}

function truncateAddress(address) {
  if (!address) return '';
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
`;
document.head.appendChild(style);
