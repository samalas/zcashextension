// Shield Content Script
// Bridge between web pages and the extension background service worker

console.log('Shield content script loaded');

// Inject the Web3-like provider into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script
window.addEventListener('message', async (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  if (event.data.type && event.data.type === 'ZCASHDEFI_REQUEST') {
    console.log('Content script received request:', event.data);
    
    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        action: event.data.action,
        data: event.data.data
      });
      
      // Send response back to page
      window.postMessage({
        type: 'ZCASHDEFI_RESPONSE',
        id: event.data.id,
        response: response
      }, '*');
    } catch (error) {
      // Handle extension context invalidated error
      window.postMessage({
        type: 'ZCASHDEFI_RESPONSE',
        id: event.data.id,
        response: { success: false, error: error.message }
      }, '*');
    }
  }
});

// Listen for messages from background script (for events)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Forward events to the page
  if (request.action === 'accountsChanged') {
    window.postMessage({
      type: 'ZCASHDEFI_EVENT',
      event: 'accountsChanged',
      data: request.data
    }, '*');
  }
  
  if (request.action === 'chainChanged') {
    window.postMessage({
      type: 'ZCASHDEFI_EVENT',
      event: 'chainChanged',
      data: request.data
    }, '*');
  }
  
  if (request.action === 'connect') {
    window.postMessage({
      type: 'ZCASHDEFI_EVENT',
      event: 'connect',
      data: request.data
    }, '*');
  }
  
  if (request.action === 'disconnect') {
    window.postMessage({
      type: 'ZCASHDEFI_EVENT',
      event: 'disconnect',
      data: request.data
    }, '*');
  }
  
  sendResponse({ received: true });
});

// Notify page that content script is ready
window.postMessage({ type: 'ZCASHDEFI_CONTENT_SCRIPT_READY' }, '*');
