import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderAppSync() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading AppSync...</div>';
  try {
    const apis = await invoke('appsync_list_apis', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('athena', 'icon-md')} AppSync GraphQL APIs (${apis.length})</h2>
      <div class="item-grid">${apis.map(a => `
        <div class="item-tile appsync-item" data-id="${a.id}">
          ${icon('athena', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.authentication_type}</span>
        </div>`).join('')}${apis.length === 0 ? '<p class="empty">No GraphQL APIs</p>' : ''}</div>`;

    document.querySelectorAll('.appsync-item').forEach(el => {
      el.onclick = () => renderAppSyncDetail(el.dataset.id, apis.find(a => a.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderAppSyncDetail(apiId, apiName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('athena', 'icon-xs')} ${apiName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="appsync-delete-btn">Delete API</button></div>
    </div>
    <h3 class="section-title">Data Sources</h3>
    <div id="appsync-datasources"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderAppSync();
  document.getElementById('appsync-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete API', `Delete GraphQL API "${apiName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('appsync_delete_api', { profile: state.profile, apiId });
      showAlert('Success', msg);
      renderAppSync();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const sources = await invoke('appsync_list_data_sources', { profile: state.profile, apiId });
    document.getElementById('appsync-datasources').innerHTML = `<div class="item-grid">${sources.map(s => `
      <div class="item-tile"><span class="item-name">${s.name}</span><span class="item-meta">${s.source_type}</span></div>`).join('')}${sources.length === 0 ? '<p class="empty">No data sources</p>' : ''}</div>`;
  } catch (e) { document.getElementById('appsync-datasources').innerHTML = formatError(e); }
}
