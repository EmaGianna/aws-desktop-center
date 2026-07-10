import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderKafka() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading MSK...</div>';
  try {
    const clusters = await invoke('kafka_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} MSK Clusters (${clusters.length})</h2>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile msk-item" data-arn="${c.arn}" data-name="${c.name}">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${c.name}</span>
          <span class="item-meta">${c.cluster_type}</span>
          <span class="item-meta rds-status-${c.state.toLowerCase()}">${c.state}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.querySelectorAll('.msk-item').forEach(el => {
      el.onclick = () => renderKafkaDetail(el.dataset.arn, el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderKafkaDetail(arn, name) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('cloudwatch', 'icon-xs')} ${name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="msk-delete-btn">Delete Cluster</button></div>
    </div>
    <h3 class="section-title">Broker Nodes</h3>
    <div id="msk-nodes"><div class="loading">Loading nodes...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderKafka();
  document.getElementById('msk-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Cluster', `Delete MSK cluster "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('kafka_delete_cluster', { profile: state.profile, clusterArn: arn });
      showAlert('Success', msg);
      renderKafka();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const nodes = await invoke('kafka_list_nodes', { profile: state.profile, clusterArn: arn });
    document.getElementById('msk-nodes').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Node ARN</th><th>Client Subnet</th></tr></thead>
      <tbody>${nodes.map(n => `<tr><td style="font-size:0.65rem;max-width:400px;overflow:hidden;text-overflow:ellipsis">${n.arn}</td><td>${n.client_subnet}</td></tr>`).join('')}</tbody>
    </table></div>${nodes.length === 0 ? '<p class="empty">No nodes</p>' : ''}`;
  } catch (e) { document.getElementById('msk-nodes').innerHTML = formatError(e); }
}
