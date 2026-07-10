import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCloudMap() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Cloud Map...</div>';
  try {
    const namespaces = await invoke('cloudmap_list_namespaces', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} Cloud Map Namespaces (${namespaces.length})</h2>
      <div class="item-grid">${namespaces.map(n => `
        <div class="item-tile cm-item" data-id="${n.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${n.name}</span>
          <span class="item-meta">${n.ns_type}</span>
        </div>`).join('')}${namespaces.length === 0 ? '<p class="empty">No namespaces</p>' : ''}</div>`;

    document.querySelectorAll('.cm-item').forEach(el => {
      el.onclick = () => renderNamespaceDetail(el.dataset.id, namespaces.find(n => n.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderNamespaceDetail(namespaceId, namespaceName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${namespaceName}</span>
    </div>
    <h3 class="section-title">Services</h3>
    <div id="cm-services"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCloudMap();

  try {
    const services = await invoke('cloudmap_list_services', { profile: state.profile, namespaceId });
    document.getElementById('cm-services').innerHTML = `<div class="item-grid">${services.map(s => `
      <div class="item-tile cm-svc-item" data-id="${s.id}" data-name="${s.name}">
        ${icon('eventbridge', 'icon-lg')}
        <span class="item-name">${s.name}</span>
      </div>`).join('')}${services.length === 0 ? '<p class="empty">No services</p>' : ''}</div>
      <div id="cm-instances"></div>`;

    document.querySelectorAll('.cm-svc-item').forEach(el => {
      el.onclick = () => renderServiceDetail(el.dataset.id, el.dataset.name);
    });
  } catch (e) { document.getElementById('cm-services').innerHTML = formatError(e); }
}

async function renderServiceDetail(serviceId, serviceName) {
  const instancesDiv = document.getElementById('cm-instances');
  instancesDiv.innerHTML = `
    <div class="s3-toolbar" style="margin:1rem 0">
      <span class="item-meta">${serviceName}</span>
      <button class="s3-toolbar-btn" id="cm-delete-svc-btn">Delete Service</button>
    </div>
    <h3 class="section-title">Instances</h3>
    <div id="cm-instances-list"><div class="loading">Loading...</div></div>`;

  document.getElementById('cm-delete-svc-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Service', `Delete service "${serviceName}"?`);
    if (!confirmed) return;
    try {
      await invoke('cloudmap_delete_service', { profile: state.profile, serviceId });
      instancesDiv.innerHTML = '<p class="empty">Service deleted</p>';
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const instances = await invoke('cloudmap_list_instances', { profile: state.profile, serviceId });
    document.getElementById('cm-instances-list').innerHTML = `<div class="item-grid">${instances.map(i => `
      <div class="item-tile"><span class="item-name" style="font-size:0.75rem">${i.id}</span></div>`).join('')}${instances.length === 0 ? '<p class="empty">No instances registered</p>' : ''}</div>`;
  } catch (e) { document.getElementById('cm-instances-list').innerHTML = formatError(e); }
}
