import { invoke, state, icon, formatError } from './shared.js';

export async function renderRedshift() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Redshift...</div>';
  try {
    const clusters = await invoke('redshift_list_clusters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('redshift', 'icon-md')} Redshift</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter clusters..." />
      <div class="item-grid">${clusters.map(c => `
        <div class="item-tile rs-item" data-id="${c.id}">
          ${icon('redshift', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.node_type} x ${c.num_nodes} nodes</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}${clusters.length === 0 ? '<p class="empty">No clusters</p>' : ''}</div>`;

    document.querySelector('.s3-filter-input').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.rs-item').forEach(el => {
        el.style.display = el.dataset.id.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.rs-item').forEach(el => {
      el.onclick = () => renderRedshiftDetail(clusters.find(c => c.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderRedshiftDetail(cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('redshift', 'icon-xs')} ${cluster.id}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Cluster Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cluster.status}">${cluster.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Node Type</span><span class="dynamo-value">${cluster.node_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Nodes</span><span class="dynamo-value">${cluster.num_nodes}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Version</span><span class="dynamo-value">${cluster.cluster_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AZ</span><span class="dynamo-value">${cluster.availability_zone}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Encrypted</span><span class="dynamo-value">${cluster.encrypted ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value">${cluster.creation_date}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Connection</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Endpoint</span><span class="dynamo-value rds-endpoint">${cluster.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${cluster.port}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Database</span><span class="dynamo-value">${cluster.database}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Master User</span><span class="dynamo-value">${cluster.master_username}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">VPC</span><span class="dynamo-value">${cluster.vpc_id}</span></div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" id="rs-tab-query">Query Editor</button>
      <button class="tab" id="rs-tab-tables">Tables</button>
      <button class="tab" id="rs-tab-snapshots">Snapshots</button>
    </div>
    <div id="rs-tab-content">
      <div class="athena-query-box">
        <textarea class="athena-textarea" id="rs-sql" placeholder="SELECT * FROM ..." rows="4"></textarea>
        <button class="s3-toolbar-btn" id="rs-run-query">Run Query</button>
      </div>
      <div id="rs-query-results"></div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderRedshift();

  // Tab switching
  document.getElementById('rs-tab-query').onclick = () => {
    setActiveRsTab('rs-tab-query');
    document.getElementById('rs-tab-content').innerHTML = `
      <div class="athena-query-box">
        <textarea class="athena-textarea" id="rs-sql" placeholder="SELECT * FROM ..." rows="4"></textarea>
        <button class="s3-toolbar-btn" id="rs-run-query">Run Query</button>
      </div>
      <div id="rs-query-results"></div>`;
    document.getElementById('rs-run-query').onclick = () => rsRunQuery(cluster.id, cluster.database);
  };

  document.getElementById('rs-tab-tables').onclick = () => {
    setActiveRsTab('rs-tab-tables');
    rsLoadTables(cluster.id, cluster.database);
  };

  document.getElementById('rs-tab-snapshots').onclick = () => {
    setActiveRsTab('rs-tab-snapshots');
    rsLoadSnapshots(cluster.id);
  };

  // Initial query tab
  document.getElementById('rs-run-query').onclick = () => rsRunQuery(cluster.id, cluster.database);
}

function setActiveRsTab(activeId) {
  ['rs-tab-query', 'rs-tab-tables', 'rs-tab-snapshots'].forEach(id => {
    document.getElementById(id).classList.toggle('active', id === activeId);
  });
}

async function rsRunQuery(clusterId, database) {
  const sql = document.getElementById('rs-sql').value.trim();
  if (!sql) return;
  const results = document.getElementById('rs-query-results');
  results.innerHTML = '<div class="loading">Executing...</div>';
  try {
    const stmtId = await invoke('redshift_execute_query', { profile: state.profile, clusterId, database, sql });
    // Poll for results
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const status = await invoke('redshift_get_query_status', { profile: state.profile, statementId: stmtId });
      if (status.includes('FINISHED')) {
        const data = await invoke('redshift_get_query_results', { profile: state.profile, statementId: stmtId });
        results.innerHTML = `
          <div class="dynamo-results-header">${data.total_rows} rows</div>
          <div class="table-container"><table>
            <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${data.rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`;
      } else if (status.includes('FAILED') || status.includes('ABORTED')) {
        results.innerHTML = `<div class="error">Query ${status}</div>`;
      } else if (attempts < 20) {
        setTimeout(poll, 1500);
      } else {
        results.innerHTML = '<div class="error">Query timeout - still running</div>';
      }
    };
    setTimeout(poll, 2000);
  } catch (e) { results.innerHTML = formatError(e); }
}

async function rsLoadTables(clusterId, database) {
  const tabContent = document.getElementById('rs-tab-content');
  tabContent.innerHTML = '<div class="loading">Loading tables...</div>';
  try {
    const tables = await invoke('redshift_list_tables', { profile: state.profile, clusterId, database });
    tabContent.innerHTML = `
      <input type="text" class="s3-filter-input" placeholder="Filter tables..." id="rs-table-filter" />
      <div class="table-container"><table>
        <thead><tr><th>Schema</th><th>Table</th><th>Type</th></tr></thead>
        <tbody>${tables.map(t => `<tr class="rs-table-row"><td>${t.schema_name}</td><td>${t.table_name}</td><td>${t.table_type}</td></tr>`).join('')}</tbody>
      </table></div>
      ${tables.length === 0 ? '<p class="empty">No tables found</p>' : ''}`;
    document.getElementById('rs-table-filter')?.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.rs-table-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    });
  } catch (e) { tabContent.innerHTML = formatError(e); }
}

async function rsLoadSnapshots(clusterId) {
  const tabContent = document.getElementById('rs-tab-content');
  tabContent.innerHTML = '<div class="loading">Loading snapshots...</div>';
  try {
    const snapshots = await invoke('redshift_list_snapshots', { profile: state.profile, clusterId });
    tabContent.innerHTML = `
      <div class="table-container"><table>
        <thead><tr><th>Snapshot ID</th><th>Type</th><th>Status</th><th>Created</th><th>Size (MB)</th><th>Nodes</th></tr></thead>
        <tbody>${snapshots.map(s => `<tr><td>${s.id}</td><td>${s.snapshot_type}</td><td>${s.status}</td><td>${s.created}</td><td>${s.size_mb.toFixed(1)}</td><td>${s.num_nodes}</td></tr>`).join('')}</tbody>
      </table></div>
      ${snapshots.length === 0 ? '<p class="empty">No snapshots</p>' : ''}`;
  } catch (e) { tabContent.innerHTML = formatError(e); }
}
