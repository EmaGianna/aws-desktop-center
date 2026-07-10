import { invoke, state, icon, formatError } from './shared.js';

export async function renderAppConfig() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading AppConfig...</div>';
  try {
    const apps = await invoke('appconfig_list_applications', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} AppConfig Applications (${apps.length})</h2>
      <div class="item-grid">${apps.map(a => `
        <div class="item-tile ac-item" data-id="${a.id}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.description}</span>
        </div>`).join('')}${apps.length === 0 ? '<p class="empty">No applications</p>' : ''}</div>`;

    document.querySelectorAll('.ac-item').forEach(el => {
      el.onclick = () => renderAppDetail(el.dataset.id, apps.find(a => a.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderAppDetail(applicationId, appName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${appName}</span>
    </div>
    <h3 class="section-title">Environments</h3>
    <div id="ac-envs"><div class="loading">Loading...</div></div>
    <h3 class="section-title">Configuration Profiles</h3>
    <div id="ac-profiles"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderAppConfig();

  try {
    const envs = await invoke('appconfig_list_environments', { profile: state.profile, applicationId });
    document.getElementById('ac-envs').innerHTML = `<div class="item-grid">${envs.map(e => `
      <div class="item-tile ac-env-item" data-id="${e.id}" data-name="${e.name}">
        ${icon('lambda', 'icon-lg')}
        <span class="item-name">${e.name}</span>
        <span class="item-meta">${e.state}</span>
      </div>`).join('')}${envs.length === 0 ? '<p class="empty">No environments</p>' : ''}</div>
      <div id="ac-deployments"></div>`;

    document.querySelectorAll('.ac-env-item').forEach(el => {
      el.onclick = async () => {
        const depDiv = document.getElementById('ac-deployments');
        depDiv.innerHTML = '<div class="loading">Loading deployments...</div>';
        try {
          const deployments = await invoke('appconfig_list_deployments', { profile: state.profile, applicationId, environmentId: el.dataset.id });
          depDiv.innerHTML = `<h3 class="section-title">Deployments — ${el.dataset.name}</h3><div class="table-container"><table>
            <thead><tr><th>#</th><th>State</th></tr></thead>
            <tbody>${deployments.map(d => `<tr><td>${d.number}</td><td>${d.state}</td></tr>`).join('')}</tbody>
          </table></div>${deployments.length === 0 ? '<p class="empty">No deployments</p>' : ''}`;
        } catch (e) { depDiv.innerHTML = formatError(e); }
      };
    });
  } catch (e) { document.getElementById('ac-envs').innerHTML = formatError(e); }

  try {
    const profiles = await invoke('appconfig_list_profiles', { profile: state.profile, applicationId });
    document.getElementById('ac-profiles').innerHTML = `<div class="item-grid">${profiles.map(p => `
      <div class="item-tile"><span class="item-name">${p.name}</span></div>`).join('')}${profiles.length === 0 ? '<p class="empty">No configuration profiles</p>' : ''}</div>`;
  } catch (e) { document.getElementById('ac-profiles').innerHTML = formatError(e); }
}
