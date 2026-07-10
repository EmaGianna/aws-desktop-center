import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderRDS() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading RDS...</div>';
  try {
    const [instances, clusters] = await Promise.all([
      invoke('rds_list_instances', { profile: state.profile }),
      invoke('rds_list_clusters', { profile: state.profile }),
    ]);
    content.innerHTML = `
      <h2 class="panel-title">${icon('rds', 'icon-md')} RDS</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter instances/clusters..." id="rds-filter" />
      ${clusters.length ? `<h3 class="section-title">Clusters (${clusters.length})</h3>
      <div class="item-grid" id="rds-clusters">${clusters.map(c => `
        <div class="item-tile rds-item" data-id="${c.id}" data-type="cluster">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.engine} ${c.engine_version}</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}</div>` : ''}
      <h3 class="section-title">Instances (${instances.length})</h3>
      <div class="item-grid" id="rds-instances">${instances.map(i => `
        <div class="item-tile rds-item" data-id="${i.id}" data-type="instance">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${i.id}</span>
          <span class="item-meta">${i.engine} | ${i.class}</span>
          <span class="item-meta rds-status-${i.status}">${i.status}</span>
        </div>`).join('')}${instances.length === 0 ? '<p class="empty">No instances</p>' : ''}</div>`;

    // Filter
    document.getElementById('rds-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.rds-item').forEach(el => {
        el.style.display = el.dataset.id.toLowerCase().includes(filter) ? '' : 'none';
      });
    };

    // Click to detail
    document.querySelectorAll('[data-type="instance"]').forEach(el => {
      el.onclick = () => renderRDSInstanceDetail(el.dataset.id, instances.find(i => i.id === el.dataset.id));
    });
    document.querySelectorAll('[data-type="cluster"]').forEach(el => {
      el.onclick = () => renderRDSClusterDetail(el.dataset.id, clusters.find(c => c.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderRDSInstanceDetail(id, instance) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('rds', 'icon-xs')} ${id}</span>
      <div class="s3-toolbar">
        ${instance.status === 'available' ? `<button class="s3-toolbar-btn rds-stop-btn">Stop Instance</button>` : ''}
        ${instance.status === 'stopped' ? `<button class="s3-toolbar-btn rds-start-btn">Start Instance</button>` : ''}
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Instance Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${instance.status}">${instance.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${instance.engine} ${instance.engine_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Class</span><span class="dynamo-value">${instance.class}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Multi-AZ</span><span class="dynamo-value">${instance.multi_az ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AZ</span><span class="dynamo-value">${instance.availability_zone}</span></div>
        ${instance.cluster_id ? `<div class="dynamo-info-row"><span class="dynamo-label">Cluster</span><span class="dynamo-value">${instance.cluster_id}</span></div>` : ''}
      </div>
      <div class="dynamo-info-card">
        <h3>Connection</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Endpoint</span><span class="dynamo-value rds-endpoint">${instance.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${instance.port}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">VPC</span><span class="dynamo-value">${instance.vpc_id}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Storage</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Allocated</span><span class="dynamo-value">${instance.storage_gb} GB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${instance.storage_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Backup Retention</span><span class="dynamo-value">${instance.backup_retention} days</span></div>
      </div>
    </div>
    <h3 class="section-title">Snapshots</h3>
    <div id="rds-snapshots"><div class="loading">Loading snapshots...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderRDS();

  // Start/Stop actions
  const stopBtn = document.querySelector('.rds-stop-btn');
  const startBtn = document.querySelector('.rds-start-btn');
  if (stopBtn) stopBtn.onclick = async () => {
    const confirmed = await showConfirm('Stop Instance', `Are you sure you want to stop ${id}?`);
    if (!confirmed) return;
    try { await invoke('rds_stop_instance', { profile: state.profile, instanceId: id }); showAlert('Success', `Stopping ${id}...`); } catch (e) { showAlert('Error', e); }
  };
  if (startBtn) startBtn.onclick = async () => {
    const confirmed = await showConfirm('Start Instance', `Start instance ${id}?`);
    if (!confirmed) return;
    try { await invoke('rds_start_instance', { profile: state.profile, instanceId: id }); showAlert('Success', `Starting ${id}...`); } catch (e) { showAlert('Error', e); }
  };

  // Load snapshots
  try {
    const snapshots = await invoke('rds_list_snapshots', { profile: state.profile, instanceId: id });
    const snapDiv = document.getElementById('rds-snapshots');
    if (snapshots.length === 0) { snapDiv.innerHTML = '<p class="empty">No snapshots</p>'; return; }
    snapDiv.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Snapshot ID</th><th>Type</th><th>Status</th><th>Created</th><th>Size</th></tr></thead>
      <tbody>${snapshots.map(s => `<tr><td>${s.id}</td><td>${s.snapshot_type}</td><td>${s.status}</td><td>${s.created}</td><td>${s.storage_gb} GB</td></tr>`).join('')}</tbody>
    </table></div>`;
  } catch (e) { document.getElementById('rds-snapshots').innerHTML = `<p class="empty">${e}</p>`; }
}

async function renderRDSClusterDetail(id, cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('rds', 'icon-xs')} Cluster: ${id}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Cluster Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cluster.status}">${cluster.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${cluster.engine} ${cluster.engine_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Multi-AZ</span><span class="dynamo-value">${cluster.multi_az ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Encrypted</span><span class="dynamo-value">${cluster.storage_encrypted ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Backup Retention</span><span class="dynamo-value">${cluster.backup_retention} days</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Endpoints</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Writer</span><span class="dynamo-value rds-endpoint">${cluster.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Reader</span><span class="dynamo-value rds-endpoint">${cluster.reader_endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${cluster.port}</span></div>
      </div>
    </div>
    <h3 class="section-title">Members</h3>
    <div class="table-container"><table>
      <thead><tr><th>Instance ID</th><th>Role</th></tr></thead>
      <tbody>${cluster.members.map(m => `<tr><td>${m.instance_id}</td><td>${m.is_writer ? 'Writer' : 'Reader'}</td></tr>`).join('')}</tbody>
    </table></div>`;

  document.querySelector('.back-btn').onclick = () => renderRDS();
}
