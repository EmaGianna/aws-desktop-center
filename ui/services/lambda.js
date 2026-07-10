import { invoke, state, icon, formatError } from './shared.js';

export async function renderLambda() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Lambda...</div>';
  try {
    const functions = await invoke('lambda_list_functions', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} Lambda Functions (${functions.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter functions..." id="lambda-filter" />
      <div class="item-grid">${functions.map(f => `
        <div class="item-tile lambda-item" data-name="${f.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${f.name}</span>
          <span class="item-meta">${f.runtime} | ${f.memory}MB</span>
        </div>`).join('')}${functions.length === 0 ? '<p class="empty">No functions found</p>' : ''}</div>`;

    document.getElementById('lambda-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.lambda-item').forEach(el => {
        el.style.display = el.dataset.name.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.lambda-item').forEach(el => {
      el.onclick = () => {
        const fn = functions.find(f => f.name === el.dataset.name);
        renderLambdaDetail(fn);
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderLambdaDetail(fn) {
  const content = document.getElementById('content');
  const envEntries = Object.entries(fn.env_vars);
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${fn.name}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Configuration</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Runtime</span><span class="dynamo-value">${fn.runtime}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Handler</span><span class="dynamo-value">${fn.handler}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Memory</span><span class="dynamo-value">${fn.memory} MB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Timeout</span><span class="dynamo-value">${fn.timeout}s</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Code Size</span><span class="dynamo-value">${(fn.code_size / 1024).toFixed(1)} KB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Architecture</span><span class="dynamo-value">${fn.architectures.join(', ')}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Last Modified</span><span class="dynamo-value" style="font-size:0.7rem">${fn.last_modified}</span></div>
        ${fn.description ? `<div class="dynamo-info-row"><span class="dynamo-label">Description</span><span class="dynamo-value">${fn.description}</span></div>` : ''}
      </div>
      <div class="dynamo-info-card">
        <h3>Role</h3>
        <div class="dynamo-info-row"><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${fn.role}</span></div>
        ${fn.layers.length > 0 ? `<h3 style="margin-top:1rem">Layers (${fn.layers.length})</h3>${fn.layers.map(l => `<div class="dynamo-info-row"><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${l.arn}</span></div>`).join('')}` : ''}
      </div>
    </div>
    ${envEntries.length > 0 ? `
    <h3 class="section-title">Environment Variables (${envEntries.length})</h3>
    <div class="table-container"><table>
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>${envEntries.map(([k, v]) => `<tr><td>${k}</td><td style="word-break:break-all">${v}</td></tr>`).join('')}</tbody>
    </table></div>` : ''}
    <div class="tabs" style="margin-top:1.5rem">
      <button class="tab active" id="lambda-tab-invoke">Invoke</button>
      <button class="tab" id="lambda-tab-logs">Recent Logs</button>
      <button class="tab" id="lambda-tab-code">Code URL</button>
    </div>
    <div id="lambda-tab-content">
      <div class="lambda-invoke-section">
        <textarea class="athena-textarea" id="lambda-payload" placeholder='{"key": "value"}' rows="4">{}</textarea>
        <button class="s3-toolbar-btn" id="lambda-invoke-btn" style="margin-top:0.5rem;background:var(--accent);color:white;border:none">Invoke Function</button>
        <div id="lambda-invoke-result"></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderLambda();

  // Tabs
  document.getElementById('lambda-tab-invoke').onclick = () => {
    setLambdaTab('lambda-tab-invoke');
    renderLambdaInvoke(fn.name);
  };
  document.getElementById('lambda-tab-logs').onclick = () => {
    setLambdaTab('lambda-tab-logs');
    renderLambdaLogs(fn.name);
  };
  document.getElementById('lambda-tab-code').onclick = () => {
    setLambdaTab('lambda-tab-code');
    renderLambdaCode(fn.name);
  };

  // Invoke
  document.getElementById('lambda-invoke-btn').onclick = () => lambdaInvoke(fn.name);
}

function setLambdaTab(activeId) {
  ['lambda-tab-invoke', 'lambda-tab-logs', 'lambda-tab-code'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === activeId);
  });
}

function renderLambdaInvoke(fnName) {
  document.getElementById('lambda-tab-content').innerHTML = `
    <div class="lambda-invoke-section">
      <textarea class="athena-textarea" id="lambda-payload" placeholder='{"key": "value"}' rows="4">{}</textarea>
      <button class="s3-toolbar-btn" id="lambda-invoke-btn" style="margin-top:0.5rem;background:var(--accent);color:white;border:none">Invoke Function</button>
      <div id="lambda-invoke-result"></div>
    </div>`;
  document.getElementById('lambda-invoke-btn').onclick = () => lambdaInvoke(fnName);
}

async function lambdaInvoke(fnName) {
  const payload = document.getElementById('lambda-payload').value.trim();
  const resultDiv = document.getElementById('lambda-invoke-result');
  resultDiv.innerHTML = '<div class="loading" style="height:auto">Invoking...</div>';
  try {
    const result = await invoke('lambda_invoke', { profile: state.profile, functionName: fnName, payload });
    resultDiv.innerHTML = `
      <div class="lambda-result-card">
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value ${result.status_code === 200 ? 'glue-status-succeeded' : 'glue-status-failed'}">${result.status_code}</span></div>
        ${result.error ? `<div class="dynamo-info-row"><span class="dynamo-label">Error</span><span class="dynamo-value" style="color:var(--accent)">${result.error}</span></div>` : ''}
        <div class="dynamo-info-row"><span class="dynamo-label">Response</span></div>
        <pre class="glue-script-code" style="margin-top:0.5rem;padding:0.8rem;border-radius:6px;background:#0d1117;max-height:300px;overflow:auto">${result.payload}</pre>
      </div>`;
  } catch (e) { resultDiv.innerHTML = formatError(e); }
}

async function renderLambdaLogs(fnName) {
  const container = document.getElementById('lambda-tab-content');
  container.innerHTML = '<div class="loading">Loading logs...</div>';
  try {
    const logs = await invoke('lambda_get_recent_logs', { profile: state.profile, functionName: fnName });
    if (logs.length === 0) { container.innerHTML = '<p class="empty">No recent logs</p>'; return; }
    container.innerHTML = `<div class="glue-script-container" style="max-height:400px"><pre class="glue-script-code" id="lambda-logs-pre"></pre></div>`;
    document.getElementById('lambda-logs-pre').textContent = logs.join('');
  } catch (e) { container.innerHTML = formatError(e); }
}

async function renderLambdaCode(fnName) {
  const container = document.getElementById('lambda-tab-content');
  container.innerHTML = '<div class="loading">Downloading code...</div>';
  try {
    const url = await invoke('lambda_get_function_code', { profile: state.profile, functionName: fnName });
    container.innerHTML = '<div class="loading">Fetching and extracting code...</div>';
    // Download the zip and extract via backend
    const source = await invoke('lambda_download_and_extract', { profile: state.profile, functionName: fnName, codeUrl: url });
    container.innerHTML = `
      <div class="dynamo-info-card" style="margin-top:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3>Source Code</h3>
          <input type="text" value="${url}" readonly class="s3-url-input" style="width:50%;font-size:0.7rem" title="Download URL (expires ~10min)" />
        </div>
      </div>
      <div class="glue-script-container" style="margin-top:0.8rem;max-height:500px"><pre class="glue-script-code" id="lambda-code-pre"></pre></div>`;
    document.getElementById('lambda-code-pre').textContent = source;
  } catch (e) { container.innerHTML = formatError(e); }
}
