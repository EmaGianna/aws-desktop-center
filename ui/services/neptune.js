import { invoke, state, icon, formatError } from './shared.js';

export async function renderNeptune() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Neptune...</div>';
  try {
    const [clusters, instances] = await Promise.all([
      invoke('neptune_list_clusters', { profile: state.profile }),
      invoke('neptune_list_instances', { profile: state.profile }),
    ]);
    content.innerHTML = `
      <h2 class="panel-title">${icon('rds', 'icon-md')} Neptune</h2>
      <h3 class="section-title">Clusters (${clusters.length})</h3>
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.engine} ${c.engine_version}</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>
      <h3 class="section-title">Instances (${instances.length})</h3>
      <div class="item-grid">${instances.map(i => `
        <div class="item-tile">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${i.id}</span>
          <span class="item-meta">${i.instance_class} | ${i.cluster_id}</span>
          <span class="item-meta rds-status-${i.status}">${i.status}</span>
        </div>`).join('')}${instances.length === 0 ? '<p class="empty">No instances</p>' : ''}</div>`;
  } catch (e) { content.innerHTML = formatError(e); }
}
