import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderElastiCache() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading ElastiCache...</div>';
  try {
    const clusters = await invoke('elasticache_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('rds', 'icon-md')} ElastiCache Clusters (${clusters.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="ec-create-btn">+ Create Cluster</button></div>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile ec-item" data-id="${c.id}">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.engine} ${c.engine_version} | ${c.node_type}</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.getElementById('ec-create-btn').onclick = async () => {
      const id = await showPrompt('Create Cluster', 'Cluster ID:', '');
      if (!id) return;
      const engine = await showPrompt('Create Cluster', 'Engine (redis or memcached):', 'redis');
      if (!engine) return;
      const nodeType = await showPrompt('Create Cluster', 'Node type:', 'cache.t3.micro');
      if (!nodeType) return;
      try {
        const msg = await invoke('elasticache_create_cluster', { profile: state.profile, clusterId: id, engine, nodeType, numNodes: 1 });
        showAlert('Success', msg);
        renderElastiCache();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.ec-item').forEach(el => {
      el.onclick = async () => {
        const confirmed = await showConfirm('Delete Cluster', `Delete cluster "${el.dataset.id}"? This cannot be undone.`);
        if (!confirmed) return;
        try {
          const msg = await invoke('elasticache_delete_cluster', { profile: state.profile, clusterId: el.dataset.id });
          showAlert('Success', msg);
          renderElastiCache();
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}
