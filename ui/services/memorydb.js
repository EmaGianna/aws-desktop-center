import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderMemoryDb() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading MemoryDB...</div>';
  try {
    const clusters = await invoke('memorydb_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('rds', 'icon-md')} MemoryDB Clusters (${clusters.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="mdb-create-btn">+ Create Cluster</button></div>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile mdb-item" data-name="${c.name}">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.name}</span>
          <span class="item-meta">${c.node_type} | ${c.num_shards} shards</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.getElementById('mdb-create-btn').onclick = async () => {
      const name = await showPrompt('Create Cluster', 'Cluster name:', '');
      if (!name) return;
      const nodeType = await showPrompt('Create Cluster', 'Node type:', 'db.t4g.small');
      if (!nodeType) return;
      const aclName = await showPrompt('Create Cluster', 'ACL name (e.g. open-access):', 'open-access');
      if (!aclName) return;
      try {
        const msg = await invoke('memorydb_create_cluster', { profile: state.profile, clusterName: name, nodeType, aclName });
        showAlert('Success', msg);
        renderMemoryDb();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.mdb-item').forEach(el => {
      el.onclick = async () => {
        const confirmed = await showConfirm('Delete Cluster', `Delete cluster "${el.dataset.name}"? This cannot be undone.`);
        if (!confirmed) return;
        try {
          const msg = await invoke('memorydb_delete_cluster', { profile: state.profile, clusterName: el.dataset.name });
          showAlert('Success', msg);
          renderMemoryDb();
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}
