import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCodeBuild() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CodeBuild...</div>';
  try {
    const projects = await invoke('codebuild_list_projects', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} CodeBuild Projects (${projects.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter projects..." id="cb-filter" />
      <div class="item-grid">${projects.map(p => `
        <div class="item-tile cb-item" data-name="${p}">${icon('lambda', 'icon-lg')}<span class="item-name">${p}</span></div>`).join('')}${projects.length === 0 ? '<p class="empty">No projects</p>' : ''}</div>`;

    document.getElementById('cb-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.cb-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.cb-item').forEach(el => {
      el.onclick = () => renderCodeBuildDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderCodeBuildDetail(projectName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${projectName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="cb-start-btn">Start Build</button></div>
    </div>
    <div id="cb-builds"><div class="loading">Loading builds...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCodeBuild();
  document.getElementById('cb-start-btn').onclick = async () => {
    const confirmed = await showConfirm('Start Build', `Start a new build for ${projectName}?`);
    if (!confirmed) return;
    try {
      const buildId = await invoke('codebuild_start_build', { profile: state.profile, projectName });
      showAlert('Build Started', 'Build ID: ' + buildId);
      loadBuilds(projectName);
    } catch (e) { showAlert('Error', e); }
  };

  loadBuilds(projectName);
}

async function loadBuilds(projectName) {
  const container = document.getElementById('cb-builds');
  container.innerHTML = '<div class="loading">Loading builds...</div>';
  try {
    const builds = await invoke('codebuild_list_builds', { profile: state.profile, projectName });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Build ID</th><th>Status</th><th>Phase</th><th>Started</th><th>Ended</th><th>Actions</th></tr></thead>
      <tbody>${builds.map(b => `<tr>
        <td style="font-size:0.65rem">${b.id}</td>
        <td class="glue-status-${b.status.toLowerCase()}">${b.status}</td>
        <td>${b.current_phase}</td>
        <td style="font-size:0.7rem">${b.start_time}</td>
        <td style="font-size:0.7rem">${b.end_time}</td>
        <td>${b.status === 'IN_PROGRESS' ? `<button class="s3-action-btn cb-stop-btn" data-id="${b.id}">Stop</button>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table></div>${builds.length === 0 ? '<p class="empty">No builds</p>' : ''}`;

    document.querySelectorAll('.cb-stop-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Stop Build', `Stop build ${btn.dataset.id}?`);
        if (!confirmed) return;
        try { await invoke('codebuild_stop_build', { profile: state.profile, buildId: btn.dataset.id }); loadBuilds(projectName); } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
