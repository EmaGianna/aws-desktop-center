import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderEmr() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EMR...</div>';
  try {
    const clusters = await invoke('emr_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('glue', 'icon-md')} EMR Clusters (${clusters.length})</h2>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile emr-item" data-id="${c.id}">
          ${icon('glue', 'icon-lg')}
          <span class="item-name">${c.name}</span>
          <span class="item-meta glue-status-${c.state.toLowerCase()}">${c.state}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.querySelectorAll('.emr-item').forEach(el => {
      el.onclick = () => renderEmrDetail(clusters.find(c => c.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEmrDetail(cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} ${cluster.name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="emr-terminate-btn">Terminate Cluster</button></div>
    </div>
    <h3 class="section-title">Steps</h3>
    <div id="emr-steps"><div class="loading">Loading steps...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderEmr();
  document.getElementById('emr-terminate-btn').onclick = async () => {
    const confirmed = await showConfirm('Terminate Cluster', `Terminate cluster "${cluster.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('emr_terminate_cluster', { profile: state.profile, clusterId: cluster.id });
      showAlert('Success', msg);
      renderEmr();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const steps = await invoke('emr_list_steps', { profile: state.profile, clusterId: cluster.id });
    document.getElementById('emr-steps').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Name</th><th>State</th></tr></thead>
      <tbody>${steps.map(s => `<tr><td>${s.name}</td><td class="glue-status-${s.state.toLowerCase()}">${s.state}</td></tr>`).join('')}</tbody>
    </table></div>${steps.length === 0 ? '<p class="empty">No steps</p>' : ''}`;
  } catch (e) { document.getElementById('emr-steps').innerHTML = formatError(e); }
}
