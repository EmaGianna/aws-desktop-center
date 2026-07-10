import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderAthena() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Athena...</div>';
  try {
    const [databases, executions] = await Promise.all([
      invoke('athena_list_databases', { profile: state.profile, catalog: '' }),
      invoke('list_executions', { profile: state.profile }),
    ]);

    content.innerHTML = `
      <h2 class="panel-title">${icon('athena', 'icon-md')} Athena</h2>
      <div class="tabs">
        <button class="tab active" id="athena-tab-editor">Query Editor</button>
        <button class="tab" id="athena-tab-history">History (${executions.length})</button>
        <button class="tab" id="athena-tab-saved">Saved Queries</button>
      </div>
      <div id="athena-content"></div>`;

    // Render editor initially
    renderAthenaEditor(databases);

    // Tab switching
    document.getElementById('athena-tab-editor').onclick = () => {
      setAthenaTab('athena-tab-editor');
      renderAthenaEditor(databases);
    };
    document.getElementById('athena-tab-history').onclick = () => {
      setAthenaTab('athena-tab-history');
      renderAthenaHistory(executions);
    };
    document.getElementById('athena-tab-saved').onclick = () => {
      setAthenaTab('athena-tab-saved');
      renderAthenaSaved(databases);
    };
  } catch (e) { content.innerHTML = formatError(e); }
}

function setAthenaTab(activeId) {
  ['athena-tab-editor', 'athena-tab-history', 'athena-tab-saved'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === activeId);
  });
}

function renderAthenaEditor(databases) {
  document.getElementById('athena-content').innerHTML = `
    <div class="athena-editor">
      <div class="athena-editor-toolbar">
        <select class="athena-select" id="athena-db">
          ${databases.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
        </select>
        <button class="s3-toolbar-btn" id="athena-show-tables">Show Tables</button>
        <select class="athena-select" id="athena-output" style="flex:2"><option value="">Loading buckets...</option></select>
        <button class="s3-toolbar-btn" id="athena-run" style="background:var(--accent);color:white;border:none">Run Query</button>
      </div>
      <div class="athena-editor-body">
        <div class="athena-tables-panel hidden" id="athena-tables-panel">
          <div class="athena-tables-header">Tables <button class="s3-close-btn" id="athena-close-tables">x</button></div>
          <div id="athena-tables-list"></div>
        </div>
        <textarea class="athena-textarea" id="athena-sql" placeholder="SELECT * FROM table LIMIT 10" rows="6"></textarea>
      </div>
    </div>
    <div id="athena-results"></div>`;
  document.getElementById('athena-run').onclick = () => athenaRunQuery();
  document.getElementById('athena-show-tables').onclick = () => athenaLoadTables();
  document.getElementById('athena-close-tables').onclick = () => {
    document.getElementById('athena-tables-panel').classList.add('hidden');
  };
  document.getElementById('athena-db').onchange = () => {
    if (!document.getElementById('athena-tables-panel').classList.contains('hidden')) {
      athenaLoadTables();
    }
  };
  // Load athena buckets
  athenaLoadOutputBuckets();
}

async function athenaLoadOutputBuckets() {
  try {
    const buckets = await invoke('list_buckets', { profile: state.profile });
    const athenaBuckets = buckets.filter(b => b.name.toLowerCase().includes('athena'));
    const select = document.getElementById('athena-output');
    if (!select) return;
    select.innerHTML = athenaBuckets.map(b => `<option value="s3://${b.name}/">s3://${b.name}/</option>`).join('');
    if (athenaBuckets.length === 0) {
      select.innerHTML = '<option value="">No buckets with "athena" found</option>';
    }
  } catch (e) {
    const select = document.getElementById('athena-output');
    if (select) select.innerHTML = '<option value="">Error loading buckets</option>';
  }
}

async function athenaLoadTables() {
  const db = document.getElementById('athena-db').value;
  const panel = document.getElementById('athena-tables-panel');
  const list = document.getElementById('athena-tables-list');
  panel.classList.remove('hidden');
  list.innerHTML = '<div class="loading" style="height:auto;font-size:0.8rem">Loading...</div>';
  try {
    const tables = await invoke('glue_list_tables', { profile: state.profile, databaseName: db });
    list.innerHTML = `<input type="text" class="athena-tables-filter" placeholder="Filter..." id="athena-tbl-filter" />
      <ul class="athena-tables-ul">${tables.map(t => `<li class="athena-table-item" title="${t.name}">${t.name}</li>`).join('')}</ul>`;
    document.getElementById('athena-tbl-filter').oninput = (e) => {
      const f = e.target.value.toLowerCase();
      document.querySelectorAll('.athena-table-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(f) ? '' : 'none';
      });
    };
    document.querySelectorAll('.athena-table-item').forEach(el => {
      el.onclick = () => {
        const sql = document.getElementById('athena-sql');
        sql.value = `SELECT * FROM ${db}.${el.textContent} LIMIT 10`;
        sql.focus();
      };
    });
  } catch (e) { list.innerHTML = formatError(e); }
}

async function athenaRunQuery() {
  const sql = document.getElementById('athena-sql').value.trim();
  const database = document.getElementById('athena-db').value;
  const outputLocation = document.getElementById('athena-output').value.trim();
  if (!sql || !outputLocation) { showAlert('Missing fields', 'SQL and output location are required'); return; }

  const results = document.getElementById('athena-results');
  results.innerHTML = '<div class="loading">Executing query...</div>';

  try {
    const queryId = await invoke('start_query', { profile: state.profile, query: sql, database, outputLocation });
    athenaPolling(queryId, outputLocation);
  } catch (e) { results.innerHTML = formatError(e); }
}

async function athenaPolling(queryId, outputLocation) {
  const results = document.getElementById('athena-results');
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const status = await invoke('athena_get_query_status', { profile: state.profile, queryExecutionId: queryId });
      const st = status.state.toUpperCase();
      if (st.includes('SUCCEEDED') || st.includes('FINISHED')) {
        results.innerHTML = '<div class="loading">Fetching results...</div>';
        const data = await invoke('get_results', { profile: state.profile, queryExecutionId: queryId });
        renderAthenaResults(data, status, queryId);
      } else if (st.includes('FAILED') || st.includes('CANCELLED')) {
        results.innerHTML = `<div class="error">Query ${status.state}</div>`;
      } else if (attempts < 30) {
        results.innerHTML = `<div class="loading">Running... (${attempts}s)</div>`;
        setTimeout(poll, 2000);
      } else {
        results.innerHTML = '<div class="error">Query timeout - still running in background</div>';
      }
    } catch (e) { results.innerHTML = formatError(e); }
  };
  setTimeout(poll, 1500);
}

function renderAthenaResults(data, status, queryId) {
  const results = document.getElementById('athena-results');
  const scannedMB = (status.data_scanned_bytes / 1048576).toFixed(2);
  const timeS = (status.execution_time_ms / 1000).toFixed(2);
  const outputCsv = status.output_location.includes(queryId) ? status.output_location : status.output_location.replace(/\/?$/, '/') + queryId + '.csv';
  const displayLimit = 199;
  const showingPartial = data.total_rows >= displayLimit;

  results.innerHTML = `
    <div class="athena-results-bar">
      <span>${data.total_rows} rows shown${showingPartial ? ' (display limited to ~200)' : ''} | ${scannedMB} MB scanned | ${timeS}s</span>
      <div class="athena-results-actions">
        <button class="s3-toolbar-btn" id="athena-download-csv">Download Full CSV</button>
        <button class="s3-toolbar-btn" id="athena-gen-link">Generate Link</button>
      </div>
    </div>
    ${showingPartial ? `<div class="athena-notice">Showing first ${displayLimit} rows. Use "Download Full CSV" or "Generate Link" to get the complete result set.</div>` : ''}
    <div id="athena-link-result"></div>
    <div class="table-container"><table>
      <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${data.rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

  document.getElementById('athena-download-csv').onclick = async () => {
    const destPath = await showPrompt('Download Results', 'Save CSV to:', `/tmp/athena_${queryId}.csv`);
    if (!destPath) return;
    try {
      const msg = await invoke('athena_download_results', { profile: state.profile, outputLocation: outputCsv, destPath });
      showAlert('Downloaded', msg);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('athena-gen-link').onclick = async () => {
    try {
      const url = await invoke('athena_generate_results_link', { profile: state.profile, outputLocation: outputCsv, expirySecs: 3600 });
      document.getElementById('athena-link-result').innerHTML = `<div class="s3-presign-url"><input type="text" value="${url}" readonly class="s3-url-input" /><span class="item-meta">Expires in 1 hour</span></div>`;
    } catch (e) { showAlert('Error', e); }
  };
}

function renderAthenaHistory(executions) {
  const container = document.getElementById('athena-content');
  container.innerHTML = `
    <input type="text" class="s3-filter-input" placeholder="Filter queries..." id="athena-hist-filter" />
    <div class="table-container"><table>
      <thead><tr><th>Query</th><th>Database</th><th>Status</th><th>Duration</th><th>Scanned</th><th>Submitted</th><th>Actions</th></tr></thead>
      <tbody>${executions.map(e => `<tr class="athena-hist-row">
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.query.replace(/"/g, '&quot;')}">${e.query.substring(0, 60)}</td>
        <td>${e.database}</td>
        <td class="glue-status-${e.state.toLowerCase().replace(/"/g, '')}">${e.state}</td>
        <td>${(e.execution_time_ms / 1000).toFixed(1)}s</td>
        <td>${(e.data_scanned_bytes / 1048576).toFixed(1)} MB</td>
        <td style="font-size:0.7rem">${e.submitted}</td>
        <td><button class="s3-action-btn athena-rerun-btn" data-query="${e.query.replace(/"/g, '&quot;')}" data-db="${e.database}">Reuse</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

  document.getElementById('athena-hist-filter')?.addEventListener('input', (ev) => {
    const filter = ev.target.value.toLowerCase();
    document.querySelectorAll('.athena-hist-row').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
  });

  document.querySelectorAll('.athena-rerun-btn').forEach(btn => {
    btn.onclick = () => {
      setAthenaTab('athena-tab-editor');
      renderAthenaEditor([]);
      setTimeout(() => {
        const sqlEl = document.getElementById('athena-sql');
        if (sqlEl) sqlEl.value = btn.dataset.query;
      }, 100);
    };
  });
}

async function renderAthenaSaved(databases) {
  const container = document.getElementById('athena-content');
  container.innerHTML = '<div class="loading">Loading saved queries...</div>';
  try {
    const saved = await invoke('athena_list_saved_queries', { profile: state.profile });
    if (saved.length === 0) { container.innerHTML = '<p class="empty">No saved queries</p>'; return; }
    container.innerHTML = `
      <div class="item-grid">${saved.map(q => `
        <div class="item-tile athena-saved-tile" data-query="${q.query.replace(/"/g, '&quot;')}" data-db="${q.database}">
          ${icon('athena', 'icon-lg')}
          <span class="item-name">${q.name}</span>
          <span class="item-meta">${q.database}</span>
        </div>`).join('')}</div>`;
    document.querySelectorAll('.athena-saved-tile').forEach(el => {
      el.onclick = () => {
        setAthenaTab('athena-tab-editor');
        renderAthenaEditor(databases);
        setTimeout(() => {
          const sqlEl = document.getElementById('athena-sql');
          if (sqlEl) sqlEl.value = el.dataset.query;
          const dbEl = document.getElementById('athena-db');
          if (dbEl) dbEl.value = el.dataset.db;
        }, 100);
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
