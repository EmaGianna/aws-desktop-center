import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderKms() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading KMS...</div>';
  try {
    const keys = await invoke('kms_list_keys', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} KMS Keys (${keys.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="kms-create-btn">+ Create Key</button></div>
      <div class="item-grid">${keys.map(k => `
        <div class="item-tile kms-item" data-id="${k.id}">
          ${icon('profile', 'icon-lg')}
          <span class="item-name" style="font-size:0.75rem">${k.description || k.id}</span>
          <span class="item-meta rds-status-${k.state.toLowerCase()}">${k.state}</span>
        </div>`).join('')}${keys.length === 0 ? '<p class="empty">No keys</p>' : ''}</div>`;

    document.getElementById('kms-create-btn').onclick = async () => {
      const description = await showPrompt('Create Key', 'Description:', '');
      if (description === null) return;
      try {
        const keyId = await invoke('kms_create_key', { profile: state.profile, description });
        showAlert('Success', 'Key created: ' + keyId);
        renderKms();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.kms-item').forEach(el => {
      el.onclick = () => renderKmsDetail(keys.find(k => k.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderKmsDetail(key) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${key.description || key.id}</span>
      <div class="s3-toolbar">
        ${key.enabled ? '<button class="s3-toolbar-btn" id="kms-disable-btn">Disable</button>' : '<button class="s3-toolbar-btn" id="kms-enable-btn">Enable</button>'}
        <button class="s3-toolbar-btn" id="kms-delete-btn">Schedule Deletion</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Key Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value rds-status-${key.state.toLowerCase()}">${key.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Enabled</span><span class="dynamo-value">${key.enabled ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Key ID</span><span class="dynamo-value" style="font-size:0.7rem">${key.id}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">ARN</span><span class="dynamo-value" style="font-size:0.65rem;word-break:break-all">${key.arn}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderKms();

  const enableBtn = document.getElementById('kms-enable-btn');
  if (enableBtn) enableBtn.onclick = async () => {
    try { await invoke('kms_enable_key', { profile: state.profile, keyId: key.id }); renderKms(); } catch (e) { showAlert('Error', e); }
  };
  const disableBtn = document.getElementById('kms-disable-btn');
  if (disableBtn) disableBtn.onclick = async () => {
    try { await invoke('kms_disable_key', { profile: state.profile, keyId: key.id }); renderKms(); } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('kms-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Schedule Deletion', `Schedule deletion of this key in 7 days? This starts an irreversible process.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('kms_schedule_key_deletion', { profile: state.profile, keyId: key.id, pendingWindowDays: 7 });
      showAlert('Success', msg);
      renderKms();
    } catch (e) { showAlert('Error', e); }
  };
}
