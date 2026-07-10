import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderGlue(view = 'databases', dbName) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('glue', 'icon-md')} Glue Data Catalog</h2><div class="tabs"><button class="tab ${view === 'databases' ? 'active' : ''}" data-view="databases">Databases</button><button class="tab ${view === 'jobs' ? 'active' : ''}" data-view="jobs">Jobs</button><button class="tab ${view === 'crawlers' ? 'active' : ''}" data-view="crawlers">Crawlers</button><button class="tab ${view === 'triggers' ? 'active' : ''}" data-view="triggers">Triggers</button></div>`;

    if (view === 'databases' && !dbName) {
      const dbs = await invoke('glue_list_databases', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter databases..." id="glue-filter" />
        <div class="item-grid">${dbs.map(d => `<div class="item-tile glue-item" data-db="${d.name}">${icon('glue', 'icon-lg')}<span class="item-name">${d.name}</span><span class="item-meta">${d.description}</span></div>`).join('')}${dbs.length === 0 ? '<p class="empty">No databases</p>' : ''}</div>`;
    } else if (view === 'databases' && dbName) {
      const tables = await invoke('glue_list_tables', { profile: state.profile, databaseName: dbName });
      html += `<div class="breadcrumb"><button class="back-btn">← Back</button><span class="path-text">${icon('glue', 'icon-xs')} ${dbName}</span></div>
        <input type="text" class="s3-filter-input" placeholder="Filter tables..." id="glue-filter" />
        <div class="item-grid">${tables.map(t => `<div class="item-tile glue-item" data-table='${JSON.stringify(t).replace(/'/g, "&#39;")}'>${icon('file', 'icon-lg')}<span class="item-name">${t.name}</span><span class="item-meta">${t.columns.length} cols</span></div>`).join('')}${tables.length === 0 ? '<p class="empty">No tables</p>' : ''}</div>`;
    } else if (view === 'jobs') {
      const jobs = await invoke('glue_list_jobs', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter jobs..." id="glue-filter" />
        <div class="item-grid">${jobs.map(j => `<div class="item-tile glue-item" data-job='${JSON.stringify(j).replace(/'/g, "&#39;")}'>${icon('glue', 'icon-lg')}<span class="item-name">${j.name}</span><span class="item-meta">${j.command_name} | ${j.glue_version}</span></div>`).join('')}${jobs.length === 0 ? '<p class="empty">No jobs</p>' : ''}</div>`;
    } else if (view === 'crawlers') {
      const crawlers = await invoke('glue_list_crawlers', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter crawlers..." id="glue-filter" />
        <div class="item-grid">${crawlers.map(c => `<div class="item-tile glue-item" data-crawler='${JSON.stringify(c).replace(/'/g, "&#39;")}'>${icon('glue', 'icon-lg')}<span class="item-name">${c.name}</span><span class="item-meta">${c.state}</span></div>`).join('')}${crawlers.length === 0 ? '<p class="empty">No crawlers</p>' : ''}</div>`;
    } else if (view === 'triggers') {
      const triggers = await invoke('glue_list_triggers', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter triggers..." id="glue-filter" />
        <div class="item-grid">${triggers.map(t => `<div class="item-tile glue-item" data-trigger='${JSON.stringify(t).replace(/'/g, "&#39;")}'>
          ${icon('glue', 'icon-lg')}
          <span class="item-name">${t.name}</span>
          <span class="item-meta">${t.trigger_type} | ${t.schedule || 'On demand'}</span>
          <span class="item-meta glue-status-${t.state.toLowerCase()}">${t.state}</span>
        </div>`).join('')}${triggers.length === 0 ? '<p class="empty">No triggers</p>' : ''}</div>`;
    }

    content.innerHTML = html;

    // Filter
    document.getElementById('glue-filter')?.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.glue-item').forEach(el => {
        el.style.display = el.querySelector('.item-name').textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderGlue(t.dataset.view); });

    // Database click -> tables
    document.querySelectorAll('[data-db]').forEach(el => { el.onclick = () => renderGlue('databases', el.dataset.db); });
    if (document.querySelector('.back-btn')) document.querySelector('.back-btn').onclick = () => renderGlue('databases');

    // Table detail
    document.querySelectorAll('[data-table]').forEach(el => {
      el.onclick = () => renderGlueTableDetail(dbName, JSON.parse(el.dataset.table));
    });

    // Job detail
    document.querySelectorAll('[data-job]').forEach(el => {
      el.onclick = () => renderGlueJobDetail(JSON.parse(el.dataset.job));
    });

    // Crawler detail
    document.querySelectorAll('[data-crawler]').forEach(el => {
      el.onclick = () => renderGlueCrawlerDetail(JSON.parse(el.dataset.crawler));
    });

    // Trigger detail
    document.querySelectorAll('[data-trigger]').forEach(el => {
      el.onclick = () => renderGlueTriggerDetail(JSON.parse(el.dataset.trigger));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderGlueTableDetail(dbName, table) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} ${dbName} / ${table.name}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Table Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Location</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${table.location}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Input Format</span><span class="dynamo-value" style="font-size:0.7rem">${table.input_format.split('.').pop()}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">SerDe</span><span class="dynamo-value" style="font-size:0.7rem">${table.serde.split('.').pop()}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value">${table.create_time}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Partition Keys (${table.partition_keys.length})</h3>
        ${table.partition_keys.length > 0 ? table.partition_keys.map(p => `<div class="dynamo-info-row"><span class="dynamo-label">${p.name}</span><span class="dynamo-value">${p.col_type}</span></div>`).join('') : '<p class="empty">No partitions</p>'}
      </div>
    </div>
    <h3 class="section-title">Columns (${table.columns.length})</h3>
    <div class="table-container"><table>
      <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Comment</th></tr></thead>
      <tbody>${table.columns.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.col_type}</td><td>${c.comment}</td></tr>`).join('')}</tbody>
    </table></div>`;
  document.querySelector('.back-btn').onclick = () => renderGlue('databases', dbName);
}

async function renderGlueJobDetail(job) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} Job: ${job.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="glue-start-job">Start Job</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Job Config</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${job.command_name}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Glue Version</span><span class="dynamo-value">${job.glue_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Python</span><span class="dynamo-value">${job.python_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Worker Type</span><span class="dynamo-value">${job.worker_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Workers</span><span class="dynamo-value">${job.num_workers}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Timeout</span><span class="dynamo-value">${job.timeout} min</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Max Retries</span><span class="dynamo-value">${job.max_retries}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Last Modified</span><span class="dynamo-value">${job.last_modified}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Script</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Location</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${job.script_location}</span></div>
        <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
          <button class="s3-toolbar-btn" id="glue-view-script">View Source</button>
          <button class="s3-toolbar-btn" id="glue-download-script">Download</button>
        </div>
      </div>
    </div>
    ${Object.keys(job.default_arguments).length > 0 ? `
    <h3 class="section-title">Parameters (${Object.keys(job.default_arguments).length})</h3>
    <div class="table-container"><table>
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>${Object.entries(job.default_arguments).map(([k, v]) => `<tr><td>${k}</td><td style="word-break:break-all">${v}</td></tr>`).join('')}</tbody>
    </table></div>` : ''}
    <div class="tabs" style="margin-top:1rem">
      <button class="tab active" id="glue-tab-runs">Job Runs</button>
      <button class="tab" id="glue-tab-script">Script Source</button>
    </div>
    <div id="glue-job-content"><div class="loading">Loading runs...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderGlue('jobs');

  // Start job
  document.getElementById('glue-start-job').onclick = async () => {
    const confirmed = await showConfirm('Start Job', 'Start job ' + job.name + '?');
    if (!confirmed) return;
    try {
      const runId = await invoke('glue_start_job', { profile: state.profile, jobName: job.name });
      showAlert('Job Started', 'Run ID: ' + runId);
    } catch (e) { showAlert('Error', e); }
  };

  // View script
  document.getElementById('glue-view-script').onclick = () => loadGlueScript(job.script_location);
  document.getElementById('glue-download-script').onclick = () => downloadGlueScript(job.script_location);

  // Tabs
  document.getElementById('glue-tab-runs').onclick = () => {
    document.getElementById('glue-tab-runs').classList.add('active');
    document.getElementById('glue-tab-script').classList.remove('active');
    loadGlueJobRuns(job.name);
  };
  document.getElementById('glue-tab-script').onclick = () => {
    document.getElementById('glue-tab-script').classList.add('active');
    document.getElementById('glue-tab-runs').classList.remove('active');
    loadGlueScript(job.script_location);
  };

  // Load runs
  loadGlueJobRuns(job.name);
}

async function loadGlueJobRuns(jobName) {
  const container = document.getElementById('glue-job-content');
  container.innerHTML = '<div class="loading">Loading runs...</div>';
  try {
    const runs = await invoke('glue_get_job_runs', { profile: state.profile, jobName });
    if (runs.length === 0) { container.innerHTML = '<p class="empty">No runs</p>'; return; }
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Run ID</th><th>Status</th><th>Started</th><th>Duration</th><th>Error</th></tr></thead>
      <tbody>${runs.map(r => `<tr>
        <td style="font-size:0.7rem">${r.id}</td>
        <td class="glue-status-${r.status.toLowerCase()}">${r.status}</td>
        <td>${r.started}</td>
        <td>${r.duration}s</td>
        <td style="font-size:0.7rem;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${r.error_message}">${r.error_message}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch (e) { container.innerHTML = formatError(e); }
}

async function loadGlueScript(scriptLocation) {
  const container = document.getElementById('glue-job-content');
  container.innerHTML = '<div class="loading">Loading script...</div>';
  try {
    const source = await invoke('glue_get_job_script', { profile: state.profile, scriptLocation });
    container.innerHTML = `<div class="glue-script-container"><pre class="glue-script-code" id="glue-code-block"></pre></div>`;
    document.getElementById('glue-code-block').textContent = source;
  } catch (e) { container.innerHTML = formatError(e); }
}

async function downloadGlueScript(scriptLocation) {
  const fileName = scriptLocation.split('/').pop();
  const destPath = await showPrompt('Download Script', 'Save to:', `/tmp/${fileName}`);
  if (!destPath) return;
  try {
    const source = await invoke('glue_get_job_script', { profile: state.profile, scriptLocation });
    // Write via a temp download approach - invoke download_object
    const parts = scriptLocation.replace('s3://', '').split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    await invoke('download_object', { profile: state.profile, bucket, key, destPath });
    showAlert('Downloaded', 'Saved to ' + destPath);
  } catch (e) { showAlert('Error', e); }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightPython(code) {
  // Tokenize to avoid overlapping replacements
  const tokens = [];
  let result = '';
  let i = 0;
  const lines = code.split('\n');

  return lines.map(line => {
    // Check if line is a comment
    const commentIdx = line.indexOf('#');
    if (commentIdx === 0) {
      return `<span class="hl-comment">${line}</span>`;
    }

    let before = commentIdx > 0 ? line.substring(0, commentIdx) : line;
    let after = commentIdx > 0 ? `<span class="hl-comment">${line.substring(commentIdx)}</span>` : '';

    // Highlight keywords in the non-comment part
    before = before.replace(/\b(import|from|def|class|return|if|elif|else|for|while|try|except|finally|with|as|in|not|and|or|True|False|None|lambda|yield|raise|pass|break|continue)\b/g, '<span class="hl-keyword">$1</span>');
    before = before.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|type|isinstance|getattr|setattr)\b/g, '<span class="hl-builtin">$1</span>');
    before = before.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
    before = before.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="hl-string">$&</span>');

    return before + after;
  }).join('\n');
}

async function renderGlueCrawlerDetail(crawler) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} Crawler: ${crawler.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="glue-start-crawler">Start Crawler</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Crawler Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value glue-status-${crawler.state.toLowerCase()}">${crawler.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Database</span><span class="dynamo-value">${crawler.database_name}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Schedule</span><span class="dynamo-value" style="font-size:0.75rem">${crawler.schedule || 'On demand'}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Last Crawl</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value">${crawler.last_crawl_status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Time</span><span class="dynamo-value">${crawler.last_crawl_time}</span></div>
      </div>
    </div>
    <h3 class="section-title">Targets</h3>
    <div class="item-grid">${crawler.targets.map(t => `<div class="item-tile"><span class="item-name" style="font-size:0.75rem;word-break:break-all">${t}</span></div>`).join('')}${crawler.targets.length === 0 ? '<p class="empty">No targets</p>' : ''}</div>`;

  document.querySelector('.back-btn').onclick = () => renderGlue('crawlers');
  document.getElementById('glue-start-crawler').onclick = async () => {
    const confirmed = await showConfirm('Start Crawler', 'Start crawler ' + crawler.name + '?');
    if (!confirmed) return;
    try {
      const msg = await invoke('glue_start_crawler', { profile: state.profile, crawlerName: crawler.name });
      showAlert('Crawler Started', msg);
    } catch (e) { showAlert('Error', e); }
  };
}

function renderGlueTriggerDetail(trigger) {
  const content = document.getElementById('content');
  const isActive = !trigger.state.toUpperCase().includes('DEACTIVAT');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} Trigger: ${trigger.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="glue-toggle-trigger">${isActive ? 'Deactivate' : 'Activate'}</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Trigger Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${trigger.trigger_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value glue-status-${trigger.state.toLowerCase()}">${trigger.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Schedule</span><span class="dynamo-value">${trigger.schedule || 'N/A'}</span></div>
        ${trigger.description ? `<div class="dynamo-info-row"><span class="dynamo-label">Description</span><span class="dynamo-value">${trigger.description}</span></div>` : ''}
      </div>
      <div class="dynamo-info-card">
        <h3>Actions (Jobs triggered)</h3>
        ${trigger.actions.length > 0 ? trigger.actions.map(a => `<div class="dynamo-info-row"><span class="dynamo-value">${a}</span></div>`).join('') : '<p class="empty">No actions</p>'}
      </div>
    </div>`;
  document.querySelector('.back-btn').onclick = () => renderGlue('triggers');
  document.getElementById('glue-toggle-trigger').onclick = async () => {
    const action = isActive ? 'Deactivate' : 'Activate';
    const confirmed = await showConfirm(`${action} Trigger`, `${action} trigger "${trigger.name}"?`);
    if (!confirmed) return;
    try {
      if (isActive) {
        await invoke('glue_stop_trigger', { profile: state.profile, triggerName: trigger.name });
      } else {
        await invoke('glue_start_trigger', { profile: state.profile, triggerName: trigger.name });
      }
      showAlert('Success', `Trigger ${action.toLowerCase()}d`);
      trigger.state = isActive ? 'DEACTIVATED' : 'ACTIVATED';
      renderGlueTriggerDetail(trigger);
    } catch (e) { showAlert('Error', e); }
  };
}
