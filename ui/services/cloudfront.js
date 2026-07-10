import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderCloudFront() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CloudFront...</div>';
  try {
    const distributions = await invoke('cloudfront_list_distributions', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} CloudFront Distributions (${distributions.length})</h2>
      <div class="item-grid">${distributions.map(d => `
        <div class="item-tile cf-item" data-id="${d.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name" style="font-size:0.75rem">${d.domain_name}</span>
          <span class="item-meta">${d.enabled ? 'Enabled' : 'Disabled'}</span>
          <span class="item-meta rds-status-${d.status.toLowerCase()}">${d.status}</span>
        </div>`).join('')}${distributions.length === 0 ? '<p class="empty">No distributions</p>' : ''}</div>`;

    document.querySelectorAll('.cf-item').forEach(el => {
      el.onclick = () => renderDistDetail(el.dataset.id, distributions.find(d => d.id === el.dataset.id).domain_name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderDistDetail(distId, domainName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${domainName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="cf-invalidate-btn">Create Invalidation</button></div>
    </div>
    <div id="cf-invalidation-result"></div>`;

  document.querySelector('.back-btn').onclick = () => renderCloudFront();
  document.getElementById('cf-invalidate-btn').onclick = async () => {
    const pathsRaw = await showPrompt('Create Invalidation', 'Paths to invalidate (comma-separated, e.g. /*, /images/*):', '/*');
    if (!pathsRaw) return;
    const paths = pathsRaw.split(',').map(p => p.trim()).filter(Boolean);
    try {
      const invalidationId = await invoke('cloudfront_create_invalidation', { profile: state.profile, distributionId: distId, paths });
      showAlert('Success', 'Invalidation created: ' + invalidationId);
    } catch (e) { showAlert('Error', e); }
  };
}
