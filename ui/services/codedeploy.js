import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCodeDeploy() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CodeDeploy...</div>';
  try {
    const apps = await invoke('codedeploy_list_applications', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} CodeDeploy Applications (${apps.length})</h2>
      <div class="item-grid">${apps.map(a => `
        <div class="item-tile cd-item" data-name="${a}">${icon('lambda', 'icon-lg')}<span class="item-name">${a}</span></div>`).join('')}${apps.length === 0 ? '<p class="empty">No applications</p>' : ''}</div>`;

    document.querySelectorAll('.cd-item').forEach(el => {
      el.onclick = () => renderGroups(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderGroups(applicationName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${applicationName}</span>
    </div>
    <h3 class="section-title">Deployment Groups</h3>
    <div id="cd-groups"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCodeDeploy();

  try {
    const groups = await invoke('codedeploy_list_deployment_groups', { profile: state.profile, applicationName });
    document.getElementById('cd-groups').innerHTML = `<div class="item-grid">${groups.map(g => `
      <div class="item-tile cd-group-item" data-name="${g}">${icon('lambda', 'icon-lg')}<span class="item-name">${g}</span></div>`).join('')}${groups.length === 0 ? '<p class="empty">No deployment groups</p>' : ''}</div>
      <div id="cd-deployments"></div>`;

    document.querySelectorAll('.cd-group-item').forEach(el => {
      el.onclick = async () => {
        const depDiv = document.getElementById('cd-deployments');
        depDiv.innerHTML = '<div class="loading">Loading deployments...</div>';
        try {
          const deployments = await invoke('codedeploy_list_deployments', { profile: state.profile, applicationName, deploymentGroupName: el.dataset.name });
          depDiv.innerHTML = `<h3 class="section-title">Deployments — ${el.dataset.name}</h3><div class="table-container"><table>
            <thead><tr><th>ID</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>${deployments.map(d => `<tr>
              <td style="font-size:0.7rem">${d.id}</td><td class="glue-status-${d.status.toLowerCase()}">${d.status}</td><td style="font-size:0.7rem">${d.create_time}</td>
              <td>${d.status === 'InProgress' ? `<button class="s3-action-btn cd-stop-btn" data-id="${d.id}">Stop</button>` : ''}</td>
            </tr>`).join('')}</tbody>
          </table></div>${deployments.length === 0 ? '<p class="empty">No deployments</p>' : ''}`;

          document.querySelectorAll('.cd-stop-btn').forEach(btn => {
            btn.onclick = async () => {
              const confirmed = await showConfirm('Stop Deployment', `Stop deployment ${btn.dataset.id}?`);
              if (!confirmed) return;
              try {
                await invoke('codedeploy_stop_deployment', { profile: state.profile, deploymentId: btn.dataset.id });
                el.click();
              } catch (e) { showAlert('Error', e); }
            };
          });
        } catch (e) { depDiv.innerHTML = formatError(e); }
      };
    });
  } catch (e) { document.getElementById('cd-groups').innerHTML = formatError(e); }
}
