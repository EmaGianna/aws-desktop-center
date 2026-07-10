import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderDocDb() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading DocumentDB...</div>';
  try {
    const clusters = await invoke('docdb_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('rds', 'icon-md')} DocumentDB Clusters (${clusters.length})</h2>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile docdb-item" data-id="${c.id}">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.engine} ${c.engine_version}</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.querySelectorAll('.docdb-item').forEach(el => {
      el.onclick = () => renderDocDbDetail(clusters.find(c => c.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderDocDbDetail(cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('rds', 'icon-xs')} ${cluster.id}</span>
      <div class="s3-toolbar">
        ${cluster.status === 'available' ? '<button class="s3-toolbar-btn" id="docdb-stop-btn">Stop</button>' : ''}
        ${cluster.status === 'stopped' ? '<button class="s3-toolbar-btn" id="docdb-start-btn">Start</button>' : ''}
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Cluster Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cluster.status}">${cluster.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${cluster.engine} ${cluster.engine_version}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Connection</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Endpoint</span><span class="dynamo-value rds-endpoint">${cluster.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${cluster.port}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderDocDb();

  const stopBtn = document.getElementById('docdb-stop-btn');
  if (stopBtn) stopBtn.onclick = async () => {
    const confirmed = await showConfirm('Stop Cluster', `Stop cluster "${cluster.id}"?`);
    if (!confirmed) return;
    try { const msg = await invoke('docdb_stop_cluster', { profile: state.profile, clusterId: cluster.id }); showAlert('Success', msg); renderDocDb(); } catch (e) { showAlert('Error', e); }
  };
  const startBtn = document.getElementById('docdb-start-btn');
  if (startBtn) startBtn.onclick = async () => {
    try { const msg = await invoke('docdb_start_cluster', { profile: state.profile, clusterId: cluster.id }); showAlert('Success', msg); renderDocDb(); } catch (e) { showAlert('Error', e); }
  };
}
