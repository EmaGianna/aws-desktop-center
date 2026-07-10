import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderOpenSearch() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading OpenSearch...</div>';
  try {
    const domains = await invoke('opensearch_list_domains', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('athena', 'icon-md')} OpenSearch Domains (${domains.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="os-create-btn">+ Create Domain</button></div>
      <div class="item-grid">${domains.map(d => `
        <div class="item-tile os-item" data-name="${d.name}">
          ${icon('athena', 'icon-lg')}
          <span class="item-name">${d.name}</span>
          <span class="item-meta">${d.engine_version}</span>
          <span class="item-meta">${d.processing ? 'Processing...' : 'Active'}</span>
        </div>`).join('')}${domains.length === 0 ? '<p class="empty">No domains</p>' : ''}</div>`;

    document.getElementById('os-create-btn').onclick = async () => {
      const name = await showPrompt('Create Domain', 'Domain name:', '');
      if (!name) return;
      const version = await showPrompt('Create Domain', 'Engine version:', 'OpenSearch_2.11');
      if (!version) return;
      try {
        const msg = await invoke('opensearch_create_domain', { profile: state.profile, domainName: name, engineVersion: version });
        showAlert('Success', msg);
        renderOpenSearch();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.os-item').forEach(el => {
      el.onclick = () => renderOpenSearchDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderOpenSearchDetail(domainName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('athena', 'icon-xs')} ${domainName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="os-delete-btn">Delete Domain</button></div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderOpenSearch();
  document.getElementById('os-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Domain', `Delete domain "${domainName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('opensearch_delete_domain', { profile: state.profile, domainName });
      showAlert('Success', msg);
      renderOpenSearch();
    } catch (e) { showAlert('Error', e); }
  };
}
