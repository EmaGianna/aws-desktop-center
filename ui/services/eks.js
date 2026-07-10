import { invoke, state, icon, formatError } from './shared.js';

export async function renderEks() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EKS...</div>';
  try {
    const clusters = await invoke('eks_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} EKS Clusters (${clusters.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter clusters..." id="eks-filter" />
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile eks-item" data-name="${c.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${c.name}</span>
          <span class="item-meta">v${c.version} | ${c.platform_version}</span>
          <span class="item-meta rds-status-${c.status.toLowerCase()}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.getElementById('eks-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.eks-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.eks-item').forEach(el => {
      el.onclick = () => renderEksDetail(clusters.find(c => c.name === el.dataset.name));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEksDetail(cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${cluster.name}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Cluster Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cluster.status.toLowerCase()}">${cluster.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Version</span><span class="dynamo-value">${cluster.version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Platform Version</span><span class="dynamo-value">${cluster.platform_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value" style="font-size:0.7rem">${cluster.created_at}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Endpoint</h3>
        <div class="dynamo-info-row"><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${cluster.endpoint}</span></div>
      </div>
    </div>
    <h3 class="section-title">Node Groups</h3>
    <div id="eks-nodegroups"><div class="loading">Loading node groups...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderEks();

  try {
    const groups = await invoke('eks_list_nodegroups', { profile: state.profile, clusterName: cluster.name });
    document.getElementById('eks-nodegroups').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Name</th><th>Status</th><th>Instance Types</th><th>Min</th><th>Desired</th><th>Max</th></tr></thead>
      <tbody>${groups.map(g => `<tr><td>${g.name}</td><td>${g.status}</td><td>${g.instance_types.join(', ')}</td><td>${g.min_size}</td><td>${g.desired_size}</td><td>${g.max_size}</td></tr>`).join('')}</tbody>
    </table></div>${groups.length === 0 ? '<p class="empty">No node groups</p>' : ''}`;
  } catch (e) { document.getElementById('eks-nodegroups').innerHTML = formatError(e); }
}
