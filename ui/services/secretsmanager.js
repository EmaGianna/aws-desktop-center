import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderSecrets() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Secrets Manager...</div>';
  try {
    const secrets = await invoke('secrets_list', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} Secrets Manager (${secrets.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="sec-create-btn">+ Create Secret</button></div>
      <div class="item-grid">${secrets.map(s => `
        <div class="item-tile sec-item" data-id="${s.name}">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta">${s.description}</span>
        </div>`).join('')}${secrets.length === 0 ? '<p class="empty">No secrets</p>' : ''}</div>`;

    document.getElementById('sec-create-btn').onclick = async () => {
      const name = await showPrompt('Create Secret', 'Secret name:', '');
      if (!name) return;
      const value = await showPrompt('Create Secret', 'Secret value:', '');
      if (value === null) return;
      try {
        await invoke('secrets_create', { profile: state.profile, name, secretString: value });
        showAlert('Success', 'Secret created');
        renderSecrets();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.sec-item').forEach(el => {
      el.onclick = () => renderSecretDetail(el.dataset.id);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderSecretDetail(secretId) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${secretId}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="sec-reveal-btn">Reveal Value</button>
        <button class="s3-toolbar-btn" id="sec-update-btn">Update Value</button>
        <button class="s3-toolbar-btn" id="sec-delete-btn">Delete</button>
      </div>
    </div>
    <div id="sec-value"></div>`;

  document.querySelector('.back-btn').onclick = () => renderSecrets();

  document.getElementById('sec-reveal-btn').onclick = async () => {
    try {
      const value = await invoke('secrets_get_value', { profile: state.profile, secretId });
      document.getElementById('sec-value').innerHTML = `<div class="dynamo-info-card"><h3>Value</h3><pre class="glue-script-code">${value}</pre></div>`;
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sec-update-btn').onclick = async () => {
    const value = await showPrompt('Update Secret', 'New value:', '');
    if (value === null) return;
    try {
      const msg = await invoke('secrets_update_value', { profile: state.profile, secretId, secretString: value });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sec-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Secret', `Delete "${secretId}"? It will enter a recovery window before permanent deletion.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('secrets_delete', { profile: state.profile, secretId });
      showAlert('Success', msg);
      renderSecrets();
    } catch (e) { showAlert('Error', e); }
  };
}
