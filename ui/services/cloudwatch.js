import { invoke, state, icon, formatError } from './shared.js';

export async function renderCloudWatch(view = 'alarms') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CloudWatch...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} CloudWatch</h2><div class="tabs"><button class="tab ${view === 'alarms' ? 'active' : ''}" data-view="alarms">Alarms</button><button class="tab ${view === 'logs' ? 'active' : ''}" data-view="logs">Log Groups</button><button class="tab ${view === 'metrics' ? 'active' : ''}" data-view="metrics">Metrics</button></div>`;

    if (view === 'alarms') {
      const alarms = await invoke('cw_list_alarms', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter alarms..." id="cw-filter" />
        <div class="item-grid">${alarms.map(a => `<div class="item-tile cw-item" data-alarm='${JSON.stringify(a).replace(/'/g, "&#39;")}'>
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.metric} | ${a.namespace}</span>
          <span class="item-meta cw-state-${a.state.toLowerCase()}">${a.state}</span>
        </div>`).join('')}${alarms.length === 0 ? '<p class="empty">No alarms</p>' : ''}</div>`;
    } else if (view === 'logs') {
      const logs = await invoke('cw_list_log_groups', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter log groups..." id="cw-filter" />
        <div class="item-grid">${logs.map(lg => `<div class="item-tile cw-item" data-loggroup="${lg.name}">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name" style="font-size:0.75rem">${lg.name}</span>
          <span class="item-meta">${(lg.stored_bytes/1024/1024).toFixed(1)} MB | Ret: ${lg.retention_days || 'Never'}</span>
        </div>`).join('')}${logs.length === 0 ? '<p class="empty">No log groups</p>' : ''}</div>`;
    } else if (view === 'metrics') {
      html += `<div class="athena-editor-toolbar" style="margin-bottom:1rem">
        <input type="text" class="dialog-input" id="cw-namespace" placeholder="Namespace (e.g. AWS/Lambda, AWS/RDS)" style="flex:1;margin:0" />
        <button class="s3-toolbar-btn" id="cw-load-metrics">Load Metrics</button>
      </div><div id="cw-metrics-list"></div>`;
    }

    content.innerHTML = html;
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderCloudWatch(t.dataset.view); });

    // Filter
    document.getElementById('cw-filter')?.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.cw-item').forEach(el => {
        const name = el.querySelector('.item-name').textContent.toLowerCase();
        el.style.display = name.includes(filter) ? '' : 'none';
      });
    });

    // Alarm detail
    if (view === 'alarms') {
      document.querySelectorAll('[data-alarm]').forEach(el => {
        el.onclick = () => renderCwAlarmDetail(JSON.parse(el.dataset.alarm));
      });
    }

    // Log group detail
    if (view === 'logs') {
      document.querySelectorAll('[data-loggroup]').forEach(el => {
        el.onclick = () => renderCwLogGroup(el.dataset.loggroup);
      });
    }

    // Metrics
    if (view === 'metrics') {
      document.getElementById('cw-load-metrics').onclick = () => cwLoadMetrics();
    }
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderCwAlarmDetail(alarm) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('cloudwatch', 'icon-xs')} Alarm: ${alarm.name}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Alarm Config</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value cw-state-${alarm.state.toLowerCase()}">${alarm.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Metric</span><span class="dynamo-value">${alarm.metric}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Namespace</span><span class="dynamo-value">${alarm.namespace}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Comparison</span><span class="dynamo-value">${alarm.comparison}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Threshold</span><span class="dynamo-value">${alarm.threshold}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Period</span><span class="dynamo-value">${alarm.period}s</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Eval Periods</span><span class="dynamo-value">${alarm.evaluation_periods}</span></div>
        ${alarm.description ? `<div class="dynamo-info-row"><span class="dynamo-label">Description</span><span class="dynamo-value">${alarm.description}</span></div>` : ''}
      </div>
      <div class="dynamo-info-card">
        <h3>State</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Reason</span><span class="dynamo-value" style="font-size:0.75rem">${alarm.state_reason}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Updated</span><span class="dynamo-value">${alarm.state_updated}</span></div>
        ${alarm.actions.length > 0 ? `<h3 style="margin-top:1rem">Actions</h3>${alarm.actions.map(a => `<div class="dynamo-info-row"><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${a}</span></div>`).join('')}` : ''}
      </div>
    </div>`;
  document.querySelector('.back-btn').onclick = () => renderCloudWatch('alarms');
}

async function renderCwLogGroup(logGroup) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading streams...</div>';
  try {
    const streams = await invoke('cw_list_log_streams', { profile: state.profile, logGroup });
    content.innerHTML = `
      <div class="breadcrumb">
        <button class="back-btn">← Back</button>
        <span class="path-text">${icon('cloudwatch', 'icon-xs')} ${logGroup}</span>
      </div>
      <div class="cw-search-bar">
        <input type="text" class="dialog-input" id="cw-search-pattern" placeholder="Filter pattern (e.g. ERROR, timeout)" style="flex:1;margin:0" />
        <button class="s3-toolbar-btn" id="cw-search-btn">Search (last 1h)</button>
      </div>
      <div id="cw-search-results"></div>
      <h3 class="section-title">Recent Streams (${streams.length})</h3>
      <div class="item-grid">${streams.map(s => `<div class="item-tile cw-stream-item" data-stream="${s.name}">
        ${icon('cloudwatch', 'icon-lg')}
        <span class="item-name" style="font-size:0.7rem">${s.name}</span>
        <span class="item-meta">${(s.stored_bytes/1024).toFixed(1)} KB</span>
      </div>`).join('')}${streams.length === 0 ? '<p class="empty">No streams</p>' : ''}</div>
      <div id="cw-log-events"></div>`;

    document.querySelector('.back-btn').onclick = () => renderCloudWatch('logs');

    // Search
    document.getElementById('cw-search-btn').onclick = async () => {
      const pattern = document.getElementById('cw-search-pattern').value.trim();
      if (!pattern) return;
      const resultsDiv = document.getElementById('cw-search-results');
      resultsDiv.innerHTML = '<div class="loading" style="height:auto">Searching...</div>';
      try {
        const events = await invoke('cw_filter_logs', { profile: state.profile, logGroup, filterPattern: pattern });
        if (events.length === 0) { resultsDiv.innerHTML = '<p class="empty">No matches</p>'; return; }
        resultsDiv.innerHTML = `<div class="glue-script-container" style="max-height:300px"><pre class="glue-script-code" id="cw-search-pre"></pre></div>`;
        document.getElementById('cw-search-pre').textContent = events.map(e => `[${new Date(e.timestamp).toISOString()}] ${e.message}`).join('');
      } catch (e) { resultsDiv.innerHTML = formatError(e); }
    };

    // Stream click
    document.querySelectorAll('.cw-stream-item').forEach(el => {
      el.onclick = async () => {
        const eventsDiv = document.getElementById('cw-log-events');
        eventsDiv.innerHTML = '<div class="loading" style="height:auto">Loading events...</div>';
        try {
          const events = await invoke('cw_get_log_events', { profile: state.profile, logGroup, logStream: el.dataset.stream });
          eventsDiv.innerHTML = `<h3 class="section-title">Events (${events.length})</h3><div class="glue-script-container" style="max-height:400px"><pre class="glue-script-code" id="cw-events-pre"></pre></div>`;
          document.getElementById('cw-events-pre').textContent = events.map(e => `[${new Date(e.timestamp).toISOString()}] ${e.message}`).join('');
        } catch (e) { eventsDiv.innerHTML = formatError(e); }
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function cwLoadMetrics() {
  const namespace = document.getElementById('cw-namespace').value.trim();
  const container = document.getElementById('cw-metrics-list');
  container.innerHTML = '<div class="loading" style="height:auto">Loading metrics...</div>';
  try {
    const metrics = await invoke('cw_list_metrics', { profile: state.profile, namespace });
    if (metrics.length === 0) { container.innerHTML = '<p class="empty">No metrics found</p>'; return; }
    container.innerHTML = `
      <input type="text" class="s3-filter-input" placeholder="Filter metrics..." id="cw-metric-filter" />
      <div class="table-container"><table>
        <thead><tr><th>Namespace</th><th>Metric</th><th>Dimensions</th></tr></thead>
        <tbody>${metrics.map(m => `<tr class="cw-metric-row"><td>${m.namespace}</td><td>${m.metric_name}</td><td style="font-size:0.7rem">${m.dimensions.join(', ')}</td></tr>`).join('')}</tbody>
      </table></div>`;
    document.getElementById('cw-metric-filter').oninput = (e) => {
      const f = e.target.value.toLowerCase();
      document.querySelectorAll('.cw-metric-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(f) ? '' : 'none';
      });
    };
  } catch (e) { container.innerHTML = formatError(e); }
}
