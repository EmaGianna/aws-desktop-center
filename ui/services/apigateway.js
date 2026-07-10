import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderApiGateway() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading API Gateway (REST)...</div>';
  try {
    const apis = await invoke('apigw_list_apis', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} API Gateway REST APIs (${apis.length})</h2>
      <div class="item-grid">${apis.map(a => `
        <div class="item-tile apigw-item" data-id="${a.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.description}</span>
        </div>`).join('')}${apis.length === 0 ? '<p class="empty">No REST APIs</p>' : ''}</div>`;

    document.querySelectorAll('.apigw-item').forEach(el => {
      el.onclick = () => renderApiDetail(el.dataset.id, apis.find(a => a.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderApiDetail(apiId, apiName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${apiName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="apigw-delete-btn">Delete API</button></div>
    </div>
    <h3 class="section-title">Resources</h3>
    <div id="apigw-resources"><div class="loading">Loading...</div></div>
    <h3 class="section-title">Stages</h3>
    <div id="apigw-stages"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderApiGateway();
  document.getElementById('apigw-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete API', `Delete REST API "${apiName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('apigw_delete_api', { profile: state.profile, restApiId: apiId });
      showAlert('Success', msg);
      renderApiGateway();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const resources = await invoke('apigw_list_resources', { profile: state.profile, restApiId: apiId });
    document.getElementById('apigw-resources').innerHTML = `<div class="item-grid">${resources.map(r => `
      <div class="item-tile"><span class="item-name" style="font-size:0.8rem">${r.path}</span></div>`).join('')}${resources.length === 0 ? '<p class="empty">No resources</p>' : ''}</div>`;
  } catch (e) { document.getElementById('apigw-resources').innerHTML = formatError(e); }

  try {
    const stages = await invoke('apigw_list_stages', { profile: state.profile, restApiId: apiId });
    document.getElementById('apigw-stages').innerHTML = `<div class="item-grid">${stages.map(s => `
      <div class="item-tile"><span class="item-name">${s.name}</span></div>`).join('')}${stages.length === 0 ? '<p class="empty">No stages deployed</p>' : ''}</div>`;
  } catch (e) { document.getElementById('apigw-stages').innerHTML = formatError(e); }
}
