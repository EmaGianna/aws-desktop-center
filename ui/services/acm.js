import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderAcm() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading ACM...</div>';
  try {
    const certs = await invoke('acm_list_certificates', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} ACM Certificates (${certs.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="acm-request-btn">+ Request Certificate</button></div>
      <div class="item-grid">${certs.map(c => `
        <div class="item-tile acm-item" data-arn="${c.arn}">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${c.domain_name}</span>
          <span class="item-meta rds-status-${c.status.toLowerCase()}">${c.status}</span>
        </div>`).join('')}${certs.length === 0 ? '<p class="empty">No certificates</p>' : ''}</div>`;

    document.getElementById('acm-request-btn').onclick = async () => {
      const domain = await showPrompt('Request Certificate', 'Domain name (e.g. example.com):', '');
      if (!domain) return;
      try {
        const arn = await invoke('acm_request_certificate', { profile: state.profile, domainName: domain });
        showAlert('Success', 'Certificate requested: ' + arn);
        renderAcm();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.acm-item').forEach(el => {
      el.onclick = () => renderCertDetail(el.dataset.arn, certs.find(c => c.arn === el.dataset.arn));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderCertDetail(arn, cert) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${cert.domain_name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="acm-delete-btn">Delete Certificate</button></div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Certificate Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cert.status.toLowerCase()}">${cert.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">ARN</span><span class="dynamo-value" style="font-size:0.65rem;word-break:break-all">${cert.arn}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderAcm();
  document.getElementById('acm-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Certificate', `Delete certificate for "${cert.domain_name}"?`);
    if (!confirmed) return;
    try {
      const msg = await invoke('acm_delete_certificate', { profile: state.profile, certificateArn: arn });
      showAlert('Success', msg);
      renderAcm();
    } catch (e) { showAlert('Error', e); }
  };
}
