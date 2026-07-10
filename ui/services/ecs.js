import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderEcs() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading ECS...</div>';
  try {
    const clusters = await invoke('ecs_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} ECS Clusters (${clusters.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter clusters..." id="ecs-filter" />
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile ecs-item" data-name="${c.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${c.name}</span>
          <span class="item-meta">${c.running_tasks} running | ${c.pending_tasks} pending | ${c.active_services} services</span>
          <span class="item-meta rds-status-${c.status.toLowerCase()}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.getElementById('ecs-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.ecs-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.ecs-item').forEach(el => {
      el.onclick = () => renderEcsClusterDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEcsClusterDetail(cluster, tab = 'services') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${cluster}</span>
    </div>
    <div class="tabs">
      <button class="tab ${tab === 'services' ? 'active' : ''}" data-tab="services">Services</button>
      <button class="tab ${tab === 'tasks' ? 'active' : ''}" data-tab="tasks">Tasks</button>
    </div>
    <div id="ecs-tab-content"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderEcs();
  document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderEcsClusterDetail(cluster, t.dataset.tab); });

  const tabContent = document.getElementById('ecs-tab-content');
  try {
    if (tab === 'services') {
      const services = await invoke('ecs_list_services', { profile: state.profile, cluster });
      tabContent.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Name</th><th>Status</th><th>Desired</th><th>Running</th><th>Pending</th><th>Task Def</th><th>Actions</th></tr></thead>
        <tbody>${services.map(s => `<tr class="ecs-svc-row" data-name="${s.name}">
          <td>${s.name}</td><td>${s.status}</td><td>${s.desired_count}</td><td>${s.running_count}</td><td>${s.pending_count}</td>
          <td style="font-size:0.65rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${s.task_definition}</td>
          <td><button class="s3-action-btn ecs-scale-btn" data-name="${s.name}">Scale</button></td>
        </tr>`).join('')}</tbody>
      </table></div>${services.length === 0 ? '<p class="empty">No services</p>' : ''}`;

      document.querySelectorAll('.ecs-scale-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const desired = await showPrompt('Scale Service', `New desired count for ${btn.dataset.name}:`, '1');
          if (desired === null || desired === '') return;
          const n = parseInt(desired, 10);
          if (Number.isNaN(n) || n < 0) { showAlert('Invalid value', 'Enter a non-negative integer'); return; }
          try {
            const msg = await invoke('ecs_update_service_desired_count', { profile: state.profile, cluster, service: btn.dataset.name, desiredCount: n });
            showAlert('Success', msg);
            renderEcsClusterDetail(cluster, 'services');
          } catch (err) { showAlert('Error', err); }
        };
      });
    } else if (tab === 'tasks') {
      const tasks = await invoke('ecs_list_tasks', { profile: state.profile, cluster });
      tabContent.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Task</th><th>Status</th><th>Desired</th><th>CPU</th><th>Memory</th><th>Actions</th></tr></thead>
        <tbody>${tasks.map(t => `<tr>
          <td style="font-size:0.65rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">${t.arn}</td>
          <td>${t.last_status}</td><td>${t.desired_status}</td><td>${t.cpu}</td><td>${t.memory}</td>
          <td><button class="s3-action-btn ecs-stop-task-btn" data-arn="${t.arn}">Stop</button></td>
        </tr>`).join('')}</tbody>
      </table></div>${tasks.length === 0 ? '<p class="empty">No tasks</p>' : ''}`;

      document.querySelectorAll('.ecs-stop-task-btn').forEach(btn => {
        btn.onclick = async () => {
          const confirmed = await showConfirm('Stop Task', `Stop task ${btn.dataset.arn.split('/').pop()}?`);
          if (!confirmed) return;
          try {
            await invoke('ecs_stop_task', { profile: state.profile, cluster, task: btn.dataset.arn });
            renderEcsClusterDetail(cluster, 'tasks');
          } catch (err) { showAlert('Error', err); }
        };
      });
    }
  } catch (e) { tabContent.innerHTML = formatError(e); }
}
