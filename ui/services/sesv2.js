import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderSes() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading SES...</div>';
  try {
    const identities = await invoke('ses_list_identities', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} SES Identities (${identities.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="ses-create-btn">+ Add Identity</button></div>
      <div class="item-grid">${identities.map(i => `
        <div class="item-tile ses-item" data-name="${i.name}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${i.name}</span>
          <span class="item-meta">${i.identity_type}</span>
          <span class="item-meta rds-status-${i.verification_status.toLowerCase()}">${i.verification_status}</span>
        </div>`).join('')}${identities.length === 0 ? '<p class="empty">No identities</p>' : ''}</div>`;

    document.getElementById('ses-create-btn').onclick = async () => {
      const email = await showPrompt('Add Identity', 'Email address or domain:', '');
      if (!email) return;
      try {
        const msg = await invoke('ses_create_identity', { profile: state.profile, emailIdentity: email });
        showAlert('Success', msg);
        renderSes();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.ses-item').forEach(el => {
      el.onclick = () => renderIdentityDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderIdentityDetail(identityName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${identityName}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="ses-send-btn">Send Test Email</button>
        <button class="s3-toolbar-btn" id="ses-delete-btn">Delete Identity</button>
      </div>
    </div>
    <div id="ses-send-result"></div>`;

  document.querySelector('.back-btn').onclick = () => renderSes();
  document.getElementById('ses-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Identity', `Delete identity "${identityName}"?`);
    if (!confirmed) return;
    try {
      const msg = await invoke('ses_delete_identity', { profile: state.profile, emailIdentity: identityName });
      showAlert('Success', msg);
      renderSes();
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('ses-send-btn').onclick = async () => {
    const to = await showPrompt('Send Test Email', 'Recipient address:', '');
    if (!to) return;
    const subject = await showPrompt('Send Test Email', 'Subject:', 'Test from aws-desktop-center');
    if (!subject) return;
    const body = await showPrompt('Send Test Email', 'Body:', 'Hello!');
    if (body === null) return;
    try {
      const messageId = await invoke('ses_send_email', { profile: state.profile, fromEmail: identityName, toEmail: to, subject, body });
      document.getElementById('ses-send-result').innerHTML = `<div class="lambda-result-card"><span class="glue-status-succeeded">Sent: ${messageId}</span></div>`;
    } catch (e) { showAlert('Error', e); }
  };
}
