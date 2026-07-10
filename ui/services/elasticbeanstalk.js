import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderElasticBeanstalk() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Elastic Beanstalk...</div>';
  try {
    const apps = await invoke('eb_list_applications', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} Elastic Beanstalk Applications (${apps.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter applications..." id="eb-app-filter" />
      <div class="item-grid">${apps.map(a => `
        <div class="item-tile eb-app-item" data-name="${a.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.versions.length} versions</span>
        </div>`).join('')}${apps.length === 0 ? '<p class="empty">No applications</p>' : ''}</div>`;

    document.getElementById('eb-app-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.eb-app-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.eb-app-item').forEach(el => {
      el.onclick = () => renderEbEnvironments(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEbEnvironments(applicationName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${applicationName}</span>
    </div>
    <div id="eb-envs"><div class="loading">Loading environments...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderElasticBeanstalk();

  try {
    const envs = await invoke('eb_list_environments', { profile: state.profile, applicationName });
    document.getElementById('eb-envs').innerHTML = `<div class="item-grid">${envs.map(e => `
      <div class="item-tile eb-env-item" data-name="${e.name}">
        ${icon('lambda', 'icon-lg')}
        <span class="item-name">${e.name}</span>
        <span class="item-meta">${e.solution_stack_name}</span>
        <span class="item-meta rds-status-${e.health.toLowerCase()}">${e.status} | ${e.health}</span>
      </div>`).join('')}${envs.length === 0 ? '<p class="empty">No environments</p>' : ''}</div>`;

    document.querySelectorAll('.eb-env-item').forEach(el => {
      el.onclick = () => renderEbEnvDetail(applicationName, envs.find(e => e.name === el.dataset.name));
    });
  } catch (e) { document.getElementById('eb-envs').innerHTML = formatError(e); }
}

function renderEbEnvDetail(applicationName, env) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${env.name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="eb-restart-btn">Restart App Server</button></div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Environment Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value">${env.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Health</span><span class="dynamo-value rds-status-${env.health.toLowerCase()}">${env.health}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Version</span><span class="dynamo-value">${env.version_label}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Solution Stack</span><span class="dynamo-value" style="font-size:0.7rem">${env.solution_stack_name}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Access</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">CNAME</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${env.cname}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Environment ID</span><span class="dynamo-value" style="font-size:0.7rem">${env.id}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderEbEnvironments(applicationName);
  document.getElementById('eb-restart-btn').onclick = async () => {
    const confirmed = await showConfirm('Restart App Server', `Restart the app server for "${env.name}"?`);
    if (!confirmed) return;
    try {
      const msg = await invoke('eb_restart_environment', { profile: state.profile, environmentName: env.name });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };
}
