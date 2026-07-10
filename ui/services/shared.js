import ICONS from '../icons.js';

export const { invoke } = window.__TAURI__.core;

export let state = { profile: null, activeService: null, profileInfo: null };

export function icon(name, cls = 'icon') {
  return `<span class="${cls}">${ICONS[name] || ''}</span>`;
}

function createModalOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  return overlay;
}

export function showAlert(title, message) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(); };
  });
}

export function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('dialog-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}

export function showPrompt(title, message, defaultValue) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <input type="text" class="dialog-input" id="dialog-input" value="${defaultValue || ''}" />
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('dialog-input');
    input.focus();
    input.select();
    input.onkeydown = (e) => { if (e.key === 'Enter') { overlay.remove(); resolve(input.value); } };
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(input.value); };
    document.getElementById('dialog-cancel').onclick = () => { overlay.remove(); resolve(null); };
  });
}

export function formatError(e) {
  const msg = typeof e === 'string' ? e : (e.message || JSON.stringify(e));
  const isExpired = /expired|ExpiredToken|InvalidIdentityToken|ExpiredTokenException|security token.*invalid|credentials.*expired|token.*expired|not authorized|AccessDenied|InvalidClientTokenId|AuthFailure|UnrecognizedClientException|service error/i.test(msg);
  if (isExpired) {
    return `<div class="error error-credentials">
      <strong>[!] AWS Credentials Error</strong><br/><br/>
      Your credentials may have expired or are invalid.<br/>
      Please update them in ~/.aws/credentials and restart the app or switch profile.<br/><br/>
      <span style="font-size:0.75rem;color:var(--text-secondary)">Detail: ${msg.substring(0, 150)}</span>
    </div>`;
  }
  return `<div class="error">[!] ${msg}</div>`;
}

export function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}
