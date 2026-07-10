import { invoke, state, icon, formatError } from './shared.js';

export async function renderLakeFormation(view = 'settings') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Lake Formation...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('glue', 'icon-md')} Lake Formation</h2>
      <div class="tabs">
        <button class="tab ${view === 'settings' ? 'active' : ''}" data-view="settings">Settings</button>
        <button class="tab ${view === 'databases' ? 'active' : ''}" data-view="databases">Databases</button>
        <button class="tab ${view === 'permissions' ? 'active' : ''}" data-view="permissions">Permissions</button>
        <button class="tab ${view === 'resources' ? 'active' : ''}" data-view="resources">Registered Locations</button>
        <button class="tab ${view === 'tags' ? 'active' : ''}" data-view="tags">LF-Tags</button>
        <button class="tab ${view === 'tagperms' ? 'active' : ''}" data-view="tagperms">Tag Permissions</button>
      </div>
      <div id="lf-content"></div>`;
    content.innerHTML = html;
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderLakeFormation(t.dataset.view); });
    await lfLoadView(view);
  } catch (e) { content.innerHTML = formatError(e); }
}

async function lfLoadView(view) {
  const container = document.getElementById('lf-content');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    if (view === 'settings') {
      const settings = await invoke('lf_get_settings', { profile: state.profile });
      container.innerHTML = `
        <div class="dynamo-detail-grid">
          <div class="dynamo-info-card">
            <h3>Data Lake Admins</h3>
            ${settings.admins.length > 0 ? settings.admins.map(a => `<div class="dynamo-info-row"><span class="dynamo-value" style="font-size:0.75rem;word-break:break-all">${a}</span></div>`).join('') : '<p class="empty">No admins configured</p>'}
          </div>
          <div class="dynamo-info-card">
            <h3>Default Permissions</h3>
            <div class="dynamo-info-row"><span class="dynamo-label">Create Database</span><span class="dynamo-value">${settings.create_database_default_permissions.join(', ') || 'None'}</span></div>
            <div class="dynamo-info-row"><span class="dynamo-label">Create Table</span><span class="dynamo-value">${settings.create_table_default_permissions.join(', ') || 'None'}</span></div>
          </div>
        </div>`;
    } else if (view === 'databases') {
      const dbs = await invoke('lf_list_databases', { profile: state.profile });
      container.innerHTML = `<input type="text" class="s3-filter-input" placeholder="Filter databases..." id="lf-filter" />
        <div class="item-grid">${dbs.map(d => `<div class="item-tile lf-item" data-db="${d.name}">
          ${icon('glue', 'icon-lg')}
          <span class="item-name">${d.name}</span>
          <span class="item-meta">${d.catalog_id}</span>
        </div>`).join('')}${dbs.length === 0 ? '<p class="empty">No databases</p>' : ''}</div>`;
      document.getElementById('lf-filter').oninput = (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.lf-item').forEach(el => { el.style.display = el.dataset.db.toLowerCase().includes(f) ? '' : 'none'; });
      };
      document.querySelectorAll('[data-db]').forEach(el => {
        el.onclick = () => lfShowTables(el.dataset.db);
      });
    } else if (view === 'permissions') {
      const perms = await invoke('lf_list_permissions', { profile: state.profile });
      container.innerHTML = `<input type="text" class="s3-filter-input" placeholder="Filter permissions..." id="lf-filter" />
        <div class="table-container"><table>
          <thead><tr><th>Principal</th><th>Resource</th><th>Permissions</th><th>With Grant</th></tr></thead>
          <tbody>${perms.map(p => `<tr class="lf-perm-row">
            <td style="font-size:0.7rem;word-break:break-all">${p.principal}</td>
            <td style="font-size:0.7rem;max-width:250px;overflow:hidden;text-overflow:ellipsis" title="${p.resource}">${p.resource.substring(0, 80)}</td>
            <td style="font-size:0.7rem">${p.permissions.join(', ')}</td>
            <td style="font-size:0.7rem">${p.permissions_with_grant.join(', ') || '-'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${perms.length === 0 ? '<p class="empty">No permissions found</p>' : ''}`;
      document.getElementById('lf-filter')?.addEventListener('input', (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.lf-perm-row').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(f) ? '' : 'none'; });
      });
    } else if (view === 'resources') {
      const resources = await invoke('lf_list_resources', { profile: state.profile });
      container.innerHTML = `<div class="item-grid">${resources.map(r => `<div class="item-tile">
        ${icon('s3', 'icon-lg')}
        <span class="item-name" style="font-size:0.7rem;word-break:break-all">${r.resource_arn}</span>
        <span class="item-meta" style="font-size:0.65rem;word-break:break-all">${r.role_arn}</span>
      </div>`).join('')}${resources.length === 0 ? '<p class="empty">No registered locations</p>' : ''}</div>`;
    } else if (view === 'tags') {
      const tags = await invoke('lf_list_tags', { profile: state.profile });
      container.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Tag Key</th><th>Values</th><th>Catalog ID</th></tr></thead>
        <tbody>${tags.map(t => `<tr><td>${t.tag_key}</td><td>${t.tag_values.join(', ')}</td><td>${t.catalog_id}</td></tr>`).join('')}</tbody>
      </table></div>
      ${tags.length === 0 ? '<p class="empty">No LF-Tags defined</p>' : ''}`;
    } else if (view === 'tagperms') {
      const perms = await invoke('lf_list_tag_permissions', { profile: state.profile });
      container.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Principal</th><th>Tag Key</th><th>Tag Values</th><th>Permissions</th></tr></thead>
        <tbody>${perms.map(p => `<tr>
          <td style="font-size:0.7rem;word-break:break-all">${p.principal}</td>
          <td>${p.tag_key}</td>
          <td>${p.tag_values.join(', ')}</td>
          <td style="font-size:0.7rem">${p.permissions.join(', ')}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      ${perms.length === 0 ? '<p class="empty">No tag permissions (or LF-Tags not in use)</p>' : ''}`;
    }
  } catch (e) { container.innerHTML = formatError(e); }
}

async function lfShowTables(dbName) {
  const container = document.getElementById('lf-content');
  container.innerHTML = '<div class="loading">Loading tables...</div>';
  try {
    const tables = await invoke('lf_list_tables', { profile: state.profile, databaseName: dbName });
    container.innerHTML = `
      <div class="breadcrumb"><button class="back-btn">← Back</button><span class="path-text">${icon('glue', 'icon-xs')} ${dbName}</span></div>
      <input type="text" class="s3-filter-input" placeholder="Filter tables..." id="lf-tbl-filter" />
      <div class="item-grid">${tables.map(t => `<div class="item-tile lf-tbl-item">${icon('file', 'icon-lg')}<span class="item-name">${t.name}</span></div>`).join('')}${tables.length === 0 ? '<p class="empty">No tables</p>' : ''}</div>`;
    document.querySelector('.back-btn').onclick = () => lfLoadView('databases');
    document.getElementById('lf-tbl-filter').oninput = (e) => {
      const f = e.target.value.toLowerCase();
      document.querySelectorAll('.lf-tbl-item').forEach(el => { el.style.display = el.textContent.toLowerCase().includes(f) ? '' : 'none'; });
    };
  } catch (e) { container.innerHTML = formatError(e); }
}
