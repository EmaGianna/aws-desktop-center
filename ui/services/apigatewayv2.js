import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderApiGatewayV2() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading API Gateway (HTTP/WebSocket)...</div>';
  try {
    const apis = await invoke('apigwv2_list_apis', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} API Gateway v2 (${apis.length})</h2>
      <div class="item-grid">${apis.map(a => `
        <div class="item-tile apigwv2-item" data-id="${a.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.protocol_type}</span>
        </div>`).join('')}${apis.length === 0 ? '<p class="empty">No APIs</p>' : ''}</div>`;

    document.querySelectorAll('.apigwv2-item').forEach(el => {
      el.onclick = () => renderApiV2Detail(el.dataset.id, apis.find(a => a.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderApiV2Detail(apiId, apiName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${apiName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="apigwv2-delete-btn">Delete API</button></div>
    </div>
    <h3 class="section-title">Routes</h3>
    <div id="apigwv2-routes"><div class="loading">Loading...</div></div>
    <h3 class="section-title">Stages</h3>
    <div id="apigwv2-stages"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderApiGatewayV2();
  document.getElementById('apigwv2-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete API', `Delete API "${apiName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('apigwv2_delete_api', { profile: state.profile, apiId });
      showAlert('Success', msg);
      renderApiGatewayV2();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const routes = await invoke('apigwv2_list_routes', { profile: state.profile, apiId });
    document.getElementById('apigwv2-routes').innerHTML = `<div class="item-grid">${routes.map(r => `
      <div class="item-tile"><span class="item-name" style="font-size:0.8rem">${r.route_key}</span></div>`).join('')}${routes.length === 0 ? '<p class="empty">No routes</p>' : ''}</div>`;
  } catch (e) { document.getElementById('apigwv2-routes').innerHTML = formatError(e); }

  try {
    const stages = await invoke('apigwv2_list_stages', { profile: state.profile, apiId });
    document.getElementById('apigwv2-stages').innerHTML = `<div class="item-grid">${stages.map(s => `
      <div class="item-tile"><span class="item-name">${s.name}</span></div>`).join('')}${stages.length === 0 ? '<p class="empty">No stages</p>' : ''}</div>`;
  } catch (e) { document.getElementById('apigwv2-stages').innerHTML = formatError(e); }
}
