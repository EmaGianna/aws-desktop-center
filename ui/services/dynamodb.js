import { invoke, state, icon, formatError, formatSize } from './shared.js';

export async function renderDynamoDB(tableName) {
  const content = document.getElementById('content');
  if (!tableName) {
    const tables = await invoke('dynamo_list_tables', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('dynamodb', 'icon-md')} DynamoDB Tables</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter tables..." />
      <div class="item-grid" id="dynamo-table-grid">${tables.map(t => `<div class="item-tile" data-table="${t}">${icon('dynamodb', 'icon-lg')}<span class="item-name">${t}</span></div>`).join('')}${tables.length === 0 ? '<p class="empty">No tables</p>' : ''}</div>`;
    document.querySelectorAll('[data-table]').forEach(el => { el.onclick = () => renderDynamoDB(el.dataset.table); });
    document.querySelector('.s3-filter-input').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('[data-table]').forEach(el => {
        el.style.display = el.dataset.table.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
  } else {
    content.innerHTML = '<div class="loading">Loading table...</div>';
    try {
      const info = await invoke('describe_table', { profile: state.profile, tableName });
      content.innerHTML = `
        <div class="breadcrumb">
          <button class="back-btn">← Back</button>
          <span class="path-text">${icon('dynamodb', 'icon-xs')} ${tableName}</span>
        </div>
        <div class="dynamo-detail-grid">
          <div class="dynamo-info-card">
            <h3>Table Info</h3>
            <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value">${info.status}</span></div>
            <div class="dynamo-info-row"><span class="dynamo-label">Items</span><span class="dynamo-value">~${info.item_count.toLocaleString()}</span></div>
            <div class="dynamo-info-row"><span class="dynamo-label">Size</span><span class="dynamo-value">${formatSize(info.size_bytes)}</span></div>
            <div class="dynamo-info-row"><span class="dynamo-label">Billing</span><span class="dynamo-value">${info.billing_mode}</span></div>
            <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value">${info.creation_date}</span></div>
          </div>
          <div class="dynamo-info-card">
            <h3>Keys</h3>
            <div class="dynamo-info-row"><span class="dynamo-label">Partition Key</span><span class="dynamo-value">${info.partition_key} (${info.partition_key_type})</span></div>
            ${info.sort_key ? `<div class="dynamo-info-row"><span class="dynamo-label">Sort Key</span><span class="dynamo-value">${info.sort_key} (${info.sort_key_type})</span></div>` : ''}
            ${info.gsi.length > 0 ? `<h4 style="margin-top:0.8rem;color:var(--accent)">GSI</h4>${info.gsi.map(g => `<div class="dynamo-info-row"><span class="dynamo-label">${g.name}</span><span class="dynamo-value">${g.partition_key}${g.sort_key ? ' / ' + g.sort_key : ''}</span></div>`).join('')}` : ''}
            ${info.lsi.length > 0 ? `<h4 style="margin-top:0.8rem;color:var(--accent)">LSI</h4>${info.lsi.map(l => `<div class="dynamo-info-row"><span class="dynamo-label">${l.name}</span><span class="dynamo-value">${l.partition_key}${l.sort_key ? ' / ' + l.sort_key : ''}</span></div>`).join('')}` : ''}
          </div>
        </div>
        <div class="dynamo-query-section">
          <div class="tabs">
            <button class="tab active" id="dynamo-tab-scan">Scan</button>
            <button class="tab" id="dynamo-tab-query">Query</button>
            <button class="tab" id="dynamo-tab-streams">Streams</button>
          </div>
          <div id="dynamo-query-form" class="dynamo-query-form hidden">
            <input type="text" class="dialog-input" id="dq-pk-value" placeholder="Partition key value (${info.partition_key})" />
            ${info.sort_key ? `<input type="text" class="dialog-input" id="dq-sk-value" placeholder="Sort key prefix (${info.sort_key}) - optional" />` : ''}
            <button class="s3-toolbar-btn" id="dynamo-run-query">Run Query</button>
          </div>
          <div id="dynamo-results"></div>
        </div>`;

      document.querySelector('.back-btn').onclick = () => renderDynamoDB();

      // Tabs
      const setActiveTab = (activeId) => {
        ['dynamo-tab-scan', 'dynamo-tab-query', 'dynamo-tab-streams'].forEach(id => {
          document.getElementById(id).classList.toggle('active', id === activeId);
        });
      };
      document.getElementById('dynamo-tab-scan').onclick = () => {
        setActiveTab('dynamo-tab-scan');
        document.getElementById('dynamo-query-form').classList.add('hidden');
        dynamoScan(tableName);
      };
      document.getElementById('dynamo-tab-query').onclick = () => {
        setActiveTab('dynamo-tab-query');
        document.getElementById('dynamo-query-form').classList.remove('hidden');
      };
      document.getElementById('dynamo-tab-streams').onclick = () => {
        setActiveTab('dynamo-tab-streams');
        document.getElementById('dynamo-query-form').classList.add('hidden');
        dynamoStreams(tableName);
      };
      document.getElementById('dynamo-run-query')?.addEventListener('click', () => {
        const pkVal = document.getElementById('dq-pk-value').value;
        const skVal = document.getElementById('dq-sk-value')?.value || '';
        if (!pkVal) return;
        dynamoQuery(tableName, info.partition_key, pkVal, info.sort_key, skVal);
      });

      // Initial scan
      dynamoScan(tableName);
    } catch (e) { content.innerHTML = formatError(e); }
  }
}

async function dynamoScan(tableName) {
  const results = document.getElementById('dynamo-results');
  results.innerHTML = '<div class="loading">Scanning...</div>';
  try {
    const scan = await invoke('scan_table', { profile: state.profile, tableName, limit: 50 });
    renderDynamoResults(scan);
  } catch (e) { results.innerHTML = formatError(e); }
}

async function dynamoQuery(tableName, pkName, pkValue, skName, skValue) {
  const results = document.getElementById('dynamo-results');
  results.innerHTML = '<div class="loading">Querying...</div>';
  try {
    const data = await invoke('dynamo_query_table', { profile: state.profile, tableName, partitionKeyName: pkName, partitionKeyValue: pkValue, sortKeyName: skName || '', sortKeyValue: skValue || '', limit: 50 });
    renderDynamoResults(data);
  } catch (e) { results.innerHTML = formatError(e); }
}

async function dynamoStreams(tableName) {
  const results = document.getElementById('dynamo-results');
  results.innerHTML = '<div class="loading">Loading streams...</div>';
  try {
    const streams = await invoke('dynamo_streams_list', { profile: state.profile, tableName });
    if (streams.length === 0) { results.innerHTML = '<p class="empty">No streams enabled for this table</p>'; return; }
    results.innerHTML = `
      <div class="s3-filter-input" style="cursor:default;background:transparent">Latest stream: ${streams[streams.length - 1].label}</div>
      <div id="dynamo-stream-records"><div class="loading">Loading records...</div></div>`;
    const records = await invoke('dynamo_streams_get_records', { profile: state.profile, streamArn: streams[streams.length - 1].arn });
    const recDiv = document.getElementById('dynamo-stream-records');
    if (records.length === 0) { recDiv.innerHTML = '<p class="empty">No records available in the latest shard</p>'; return; }
    recDiv.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Event</th><th>Keys</th><th>New Image</th></tr></thead>
      <tbody>${records.map(r => `<tr>
        <td>${r.event_name}</td>
        <td style="font-size:0.7rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">${r.keys}</td>
        <td style="font-size:0.65rem;max-width:350px;overflow:hidden;text-overflow:ellipsis">${r.new_image}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch (e) { results.innerHTML = formatError(e); }
}

function renderDynamoResults(data) {
  const results = document.getElementById('dynamo-results');
  if (data.items.length === 0) { results.innerHTML = '<p class="empty">No items found</p>'; return; }
  const keys = Object.keys(data.items[0]);
  results.innerHTML = `
    <div class="dynamo-results-header">
      <span>${data.count} items${data.has_more ? ' (more available)' : ''}</span>
    </div>
    <div class="table-container">
      <table>
        <thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}<th>View</th></tr></thead>
        <tbody>${data.items.map((item, i) => `<tr class="dynamo-row" data-idx="${i}">${keys.map(k => `<td>${item[k] || ''}</td>`).join('')}<td><button class="s3-action-btn dynamo-view-btn" data-idx="${i}">View</button></td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div id="dynamo-item-detail" class="s3-modal hidden"></div>`;
  document.querySelectorAll('.dynamo-view-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const item = data.items[idx];
      const modal = document.getElementById('dynamo-item-detail');
      modal.className = 's3-modal';
      modal.innerHTML = `
        <div class="s3-detail-panel">
          <div class="s3-detail-header"><h3>Item Detail</h3><button class="s3-close-btn" id="dynamo-close-detail">x</button></div>
          <div class="s3-detail-body">
            ${Object.entries(item).map(([k, v]) => `<div class="s3-detail-row"><span class="s3-detail-label">${k}</span><span class="s3-detail-value">${v}</span></div>`).join('')}
          </div>
        </div>`;
      document.getElementById('dynamo-close-detail').onclick = () => { modal.className = 's3-modal hidden'; };
    };
  });
}
