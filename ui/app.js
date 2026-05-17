import ICONS from './icons.js';

const { invoke } = window.__TAURI__.core;

const SERVICES = [
  { id: 's3', name: 'S3', icon: 's3', description: 'Object Storage' },
  { id: 'dynamodb', name: 'DynamoDB', icon: 'dynamodb', description: 'NoSQL Database' },
  { id: 'rds', name: 'RDS', icon: 'rds', description: 'Relational Database' },
  { id: 'redshift', name: 'Redshift', icon: 'redshift', description: 'Data Warehouse' },
  { id: 'glue', name: 'Glue', icon: 'glue', description: 'ETL Service' },
  { id: 'athena', name: 'Athena', icon: 'athena', description: 'Query Service' },
  { id: 'lambda', name: 'Lambda', icon: 'lambda', description: 'Serverless Functions' },
  { id: 'cloudwatch', name: 'CloudWatch', icon: 'cloudwatch', description: 'Monitoring & Logs' },
  { id: 'eventbridge', name: 'EventBridge', icon: 'eventbridge', description: 'Event Bus' },
  { id: 'lakeformation', name: 'Lake Formation', icon: 'glue', description: 'Data Governance' },
];

let state = { profile: null, activeService: null };

function icon(name, cls = 'icon') {
  return `<span class="${cls}">${ICONS[name] || ''}</span>`;
}

async function init() {
  const profiles = await invoke('get_profiles');
  renderProfileSelector(profiles);
}

function renderProfileSelector(profiles) {
  document.getElementById('root').innerHTML = `
    <div class="profile-selector">
      <div class="profile-card">
        <h1 class="app-title">AWS Data Center</h1>
        <p class="app-subtitle">Select an AWS Profile</p>
        <div class="profile-list">
          ${profiles.map(p => `<button class="profile-btn" data-profile="${p}">${icon('profile', 'icon-sm')} ${p}</button>`).join('')}
          ${profiles.length === 0 ? '<p style="color:var(--text-secondary)">No profiles found in ~/.aws/credentials</p>' : ''}
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.onclick = () => { state.profile = btn.dataset.profile; renderApp(); };
  });
}

function renderApp() {
  document.getElementById('root').innerHTML = `
    <div class="app-container">
      <nav class="sidebar">
        <div class="sidebar-header"><h2>AWS Data Center</h2><span class="profile-badge">${state.profile}</span></div>
        <ul class="sidebar-menu">
          ${SERVICES.map(s => `<li class="sidebar-item ${state.activeService === s.id ? 'active' : ''}" data-id="${s.id}">${icon(s.icon, 'icon-sm')} <span>${s.name}</span></li>`).join('')}
        </ul>
        <button class="logout-btn">${icon('power', 'icon-xs')} Switch Profile</button>
      </nav>
      <main class="content-area" id="content"></main>
    </div>`;
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.onclick = () => { state.activeService = item.dataset.id; renderApp(); loadService(item.dataset.id); };
  });
  document.querySelector('.logout-btn').onclick = () => { state.profile = null; state.activeService = null; init(); };
  if (state.activeService) loadService(state.activeService);
  else renderServiceGrid();
}

function renderServiceGrid() {
  document.getElementById('content').innerHTML = `
    <div class="service-grid">
      ${SERVICES.map(s => `<div class="service-tile" data-id="${s.id}">${icon(s.icon, 'icon-lg')}<span class="tile-name">${s.name}</span><span class="tile-desc">${s.description}</span></div>`).join('')}
    </div>`;
  document.querySelectorAll('.service-tile').forEach(tile => {
    tile.onclick = () => { state.activeService = tile.dataset.id; renderApp(); loadService(tile.dataset.id); };
  });
}

async function loadService(id) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading...</div>';
  try {
    switch (id) {
      case 's3': await renderS3(); break;
      case 'dynamodb': await renderDynamoDB(); break;
      case 'rds': await renderRDS(); break;
      case 'redshift': await renderRedshift(); break;
      case 'glue': await renderGlue(); break;
      case 'athena': await renderAthena(); break;
      case 'lambda': await renderLambda(); break;
      case 'cloudwatch': await renderCloudWatch(); break;
      case 'eventbridge': await renderEventBridge(); break;
      case 'lakeformation': await renderLakeFormation(); break;
    }
  } catch (e) { content.innerHTML = formatError(e); }
}

// S3
async function renderS3(bucket, prefix = '') {
  const content = document.getElementById('content');
  if (!bucket) {
    const buckets = await invoke('list_buckets', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} S3 Buckets</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter buckets..." />
      <div class="item-grid" id="s3-bucket-grid">${buckets.map(b => `<div class="item-tile" data-bucket="${b.name}">${icon('bucket', 'icon-lg')}<span class="item-name">${b.name}</span><span class="item-meta">${b.creation_date}</span></div>`).join('')}${buckets.length === 0 ? '<p class="empty">No buckets</p>' : ''}</div>`;
    document.querySelectorAll('[data-bucket]').forEach(el => { el.onclick = () => renderS3(el.dataset.bucket); });
    document.querySelector('.s3-filter-input').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('[data-bucket]').forEach(el => {
        el.style.display = el.dataset.bucket.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
  } else {
    const { objects, prefixes } = await invoke('list_objects', { profile: state.profile, bucket, prefix });
    content.innerHTML = `
      <div class="breadcrumb">
        <button class="back-btn">← Back</button>
        <span class="path-text">${icon('s3', 'icon-xs')} ${bucket}${prefix ? ' / ' + prefix : ''}</span>
        <div class="s3-toolbar">
          <input type="text" class="s3-search-input" placeholder="Search in bucket..." />
          <button class="s3-toolbar-btn" id="s3-search-btn">🔍</button>
          <button class="s3-toolbar-btn" id="s3-upload-btn">⬆ Upload</button>
        </div>
      </div>
      <div class="item-grid">
        ${prefixes.map(p => `<div class="item-tile" data-prefix="${p.prefix}">${icon('folder', 'icon-lg')}<span class="item-name">${p.prefix.replace(prefix, '').replace('/', '')}</span></div>`).join('')}
        ${objects.filter(o => o.key !== prefix).map(o => `
          <div class="item-tile s3-obj-tile" data-key="${o.key}">
            ${icon('file', 'icon-lg')}
            <span class="item-name">${o.key.replace(prefix, '')}</span>
            <span class="item-meta">${formatSize(o.size)}</span>
            <span class="item-meta">${o.last_modified ? new Date(o.last_modified).toLocaleDateString() : ''}</span>
            <div class="s3-obj-actions">
              <button class="s3-action-btn" data-action="detail" title="Details">Info</button>
              <button class="s3-action-btn" data-action="download" title="Download">Down</button>
              <button class="s3-action-btn" data-action="copy" title="Copy">Copy</button>
              <button class="s3-action-btn" data-action="delete" title="Delete">Del</button>
            </div>
          </div>
        `).join('')}
        ${prefixes.length === 0 && objects.length === 0 ? '<p class="empty">Empty</p>' : ''}
      </div>
      <div id="s3-modal" class="s3-modal hidden"></div>`;

    // Navigation
    document.querySelector('.back-btn').onclick = () => {
      if (prefix) { const parts = prefix.replace(/\/$/, '').split('/'); parts.pop(); renderS3(bucket, parts.length ? parts.join('/') + '/' : ''); }
      else renderS3();
    };
    document.querySelectorAll('[data-prefix]').forEach(el => { el.onclick = () => renderS3(bucket, el.dataset.prefix); });

    // Search
    document.getElementById('s3-search-btn').onclick = () => s3Search(bucket, prefix);
    document.querySelector('.s3-search-input').onkeydown = (e) => { if (e.key === 'Enter') s3Search(bucket, prefix); };

    // Upload
    document.getElementById('s3-upload-btn').onclick = () => s3Upload(bucket, prefix);

    // Object actions
    document.querySelectorAll('.s3-action-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const key = btn.closest('.s3-obj-tile').dataset.key;
        const action = btn.dataset.action;
        if (action === 'detail') s3Detail(bucket, key);
        else if (action === 'download') s3Download(bucket, key);
        else if (action === 'copy') s3CopyDialog(bucket, key);
        else if (action === 'delete') s3Delete(bucket, key, prefix);
      };
    });
  }
}

async function s3Search(bucket, prefix) {
  const query = document.querySelector('.s3-search-input').value.trim();
  if (!query) return;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Searching...</div>';
  try {
    const result = await invoke('search_objects', { profile: state.profile, bucket, prefix, query, maxResults: 100 });
    content.innerHTML = `
      <div class="breadcrumb">
        <button class="back-btn">← Back</button>
        <span class="path-text">🔍 Results for "${query}" in ${bucket} (${result.total} found)</span>
      </div>
      <div class="item-grid">
        ${result.objects.map(o => `
          <div class="item-tile s3-obj-tile" data-key="${o.key}">
            ${icon('file', 'icon-lg')}
            <span class="item-name">${o.key}</span>
            <span class="item-meta">${formatSize(o.size)}</span>
            <div class="s3-obj-actions">
              <button class="s3-action-btn" data-action="detail" title="Details">Info</button>
              <button class="s3-action-btn" data-action="download" title="Download">Down</button>
            </div>
          </div>
        `).join('')}
        ${result.objects.length === 0 ? '<p class="empty">No results</p>' : ''}
      </div>`;
    document.querySelector('.back-btn').onclick = () => renderS3(bucket, prefix);
    document.querySelectorAll('.s3-action-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const key = btn.closest('.s3-obj-tile').dataset.key;
        if (btn.dataset.action === 'detail') s3Detail(bucket, key);
        else if (btn.dataset.action === 'download') s3Download(bucket, key);
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function s3Detail(bucket, key) {
  const modal = document.getElementById('s3-modal') || document.createElement('div');
  modal.className = 's3-modal';
  modal.innerHTML = '<div class="loading">Loading details...</div>';
  if (!document.getElementById('s3-modal')) { modal.id = 's3-modal'; document.getElementById('content').appendChild(modal); }

  try {
    const detail = await invoke('get_object_detail', { profile: state.profile, bucket, key });
    const metaEntries = Object.entries(detail.metadata);
    const tagEntries = Object.entries(detail.tags);
    modal.innerHTML = `
      <div class="s3-detail-panel">
        <div class="s3-detail-header">
          <h3>Object Details</h3>
          <button class="s3-close-btn" id="s3-close-detail">✕</button>
        </div>
        <div class="s3-detail-body">
          <div class="s3-detail-row"><span class="s3-detail-label">Key</span><span class="s3-detail-value">${detail.key}</span></div>
          <div class="s3-detail-row"><span class="s3-detail-label">Size</span><span class="s3-detail-value">${formatSize(detail.size)}</span></div>
          <div class="s3-detail-row"><span class="s3-detail-label">Last Modified</span><span class="s3-detail-value">${detail.last_modified}</span></div>
          <div class="s3-detail-row"><span class="s3-detail-label">Content Type</span><span class="s3-detail-value">${detail.content_type}</span></div>
          <div class="s3-detail-row"><span class="s3-detail-label">ETag</span><span class="s3-detail-value">${detail.etag}</span></div>
          <div class="s3-detail-row"><span class="s3-detail-label">Storage Class</span><span class="s3-detail-value">${detail.storage_class}</span></div>
          ${metaEntries.length > 0 ? `<h4 class="s3-section-label">Metadata</h4>${metaEntries.map(([k,v]) => `<div class="s3-detail-row"><span class="s3-detail-label">${k}</span><span class="s3-detail-value">${v}</span></div>`).join('')}` : ''}
          ${tagEntries.length > 0 ? `<h4 class="s3-section-label">Tags</h4>${tagEntries.map(([k,v]) => `<div class="s3-detail-row"><span class="s3-detail-label">${k}</span><span class="s3-detail-value">${v}</span></div>`).join('')}` : ''}
          <div class="s3-detail-actions">
            <button class="s3-toolbar-btn" id="s3-presign-btn">Generate Link</button>
          </div>
          <div id="s3-presign-result"></div>
        </div>
      </div>`;
    document.getElementById('s3-close-detail').onclick = () => { modal.className = 's3-modal hidden'; };
    document.getElementById('s3-presign-btn').onclick = async () => {
      const url = await invoke('generate_presigned_url', { profile: state.profile, bucket, key, expirySecs: 3600 });
      document.getElementById('s3-presign-result').innerHTML = `<div class="s3-presign-url"><input type="text" value="${url}" readonly class="s3-url-input" /><span class="item-meta">Expires in 1 hour</span></div>`;
    };
  } catch (e) { modal.innerHTML = formatError(e); }
}

async function s3Download(bucket, key) {
  const fileName = key.split('/').pop();
  const destPath = await showPrompt('Download Object', 'Save to path:', `/tmp/${fileName}`);
  if (!destPath) return;
  try {
    const msg = await invoke('download_object', { profile: state.profile, bucket, key, destPath });
    showAlert('Download Complete', msg);
  } catch (e) { showAlert('Error', e); }
}

async function s3Upload(bucket, prefix) {
  const filePath = await showPrompt('Upload Object', 'File path to upload:', '');
  if (!filePath) return;
  const fileName = filePath.split('/').pop().split('\\').pop();
  const key = prefix + fileName;
  try {
    const msg = await invoke('upload_object', { profile: state.profile, bucket, key, filePath });
    showAlert('Upload Complete', msg);
    renderS3(bucket, prefix);
  } catch (e) { showAlert('Error', e); }
}

async function s3Delete(bucket, key, prefix) {
  const confirmed = await showConfirm('Delete Object', `Delete s3://${bucket}/${key}?`);
  if (!confirmed) return;
  try {
    await invoke('delete_object', { profile: state.profile, bucket, key });
    renderS3(bucket, prefix);
  } catch (e) { showAlert('Error', e); }
}

async function s3CopyDialog(bucket, key) {
  const destBucket = await showPrompt('Copy/Move Object', 'Destination bucket:', bucket);
  if (!destBucket) return;
  const destKey = await showPrompt('Copy/Move Object', 'Destination key:', key);
  if (!destKey) return;
  const move = await showConfirm('Copy or Move?', 'OK = Move, Cancel = Copy only');
  try {
    if (move) {
      await invoke('move_object', { profile: state.profile, sourceBucket: bucket, sourceKey: key, destBucket, destKey });
    } else {
      await invoke('copy_object', { profile: state.profile, sourceBucket: bucket, sourceKey: key, destBucket, destKey });
    }
    showAlert('Success', move ? 'Object moved!' : 'Object copied!');
    renderS3(bucket, '');
  } catch (e) { showAlert('Error', e); }
}

// Custom modal dialogs
function showAlert(title, message) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(); };
  });
}

function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('dialog-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}

function showPrompt(title, message, defaultValue) {
  return new Promise((resolve) => {
    const overlay = createModalOverlay();
    overlay.innerHTML = `
      <div class="custom-dialog">
        <h3 class="dialog-title">${title}</h3>
        <p class="dialog-message">${message}</p>
        <input type="text" class="dialog-input" id="dialog-input" value="${defaultValue || ''}" />
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" id="dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('dialog-input');
    input.focus();
    input.select();
    input.onkeydown = (e) => { if (e.key === 'Enter') { overlay.remove(); resolve(input.value); } };
    document.getElementById('dialog-ok').onclick = () => { overlay.remove(); resolve(input.value); };
    document.getElementById('dialog-cancel').onclick = () => { overlay.remove(); resolve(null); };
  });
}

function createModalOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  return overlay;
}

// DynamoDB
async function renderDynamoDB(tableName) {
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
      document.getElementById('dynamo-tab-scan').onclick = () => {
        document.getElementById('dynamo-tab-scan').classList.add('active');
        document.getElementById('dynamo-tab-query').classList.remove('active');
        document.getElementById('dynamo-query-form').classList.add('hidden');
        dynamoScan(tableName);
      };
      document.getElementById('dynamo-tab-query').onclick = () => {
        document.getElementById('dynamo-tab-query').classList.add('active');
        document.getElementById('dynamo-tab-scan').classList.remove('active');
        document.getElementById('dynamo-query-form').classList.remove('hidden');
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

// RDS
async function renderRDS() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading RDS...</div>';
  try {
    const [instances, clusters] = await Promise.all([
      invoke('rds_list_instances', { profile: state.profile }),
      invoke('rds_list_clusters', { profile: state.profile }),
    ]);
    content.innerHTML = `
      <h2 class="panel-title">${icon('rds', 'icon-md')} RDS</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter instances/clusters..." id="rds-filter" />
      ${clusters.length ? `<h3 class="section-title">Clusters (${clusters.length})</h3>
      <div class="item-grid" id="rds-clusters">${clusters.map(c => `
        <div class="item-tile rds-item" data-id="${c.id}" data-type="cluster">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${c.id}</span>
          <span class="item-meta">${c.engine} ${c.engine_version}</span>
          <span class="item-meta rds-status-${c.status}">${c.status}</span>
        </div>`).join('')}</div>` : ''}
      <h3 class="section-title">Instances (${instances.length})</h3>
      <div class="item-grid" id="rds-instances">${instances.map(i => `
        <div class="item-tile rds-item" data-id="${i.id}" data-type="instance">
          ${icon('rds', 'icon-lg')}
          <span class="item-name">${i.id}</span>
          <span class="item-meta">${i.engine} | ${i.class}</span>
          <span class="item-meta rds-status-${i.status}">${i.status}</span>
        </div>`).join('')}${instances.length === 0 ? '<p class="empty">No instances</p>' : ''}</div>`;

    // Filter
    document.getElementById('rds-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.rds-item').forEach(el => {
        el.style.display = el.dataset.id.toLowerCase().includes(filter) ? '' : 'none';
      });
    };

    // Click to detail
    document.querySelectorAll('[data-type="instance"]').forEach(el => {
      el.onclick = () => renderRDSInstanceDetail(el.dataset.id, instances.find(i => i.id === el.dataset.id));
    });
    document.querySelectorAll('[data-type="cluster"]').forEach(el => {
      el.onclick = () => renderRDSClusterDetail(el.dataset.id, clusters.find(c => c.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderRDSInstanceDetail(id, instance) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('rds', 'icon-xs')} ${id}</span>
      <div class="s3-toolbar">
        ${instance.status === 'available' ? `<button class="s3-toolbar-btn rds-stop-btn">Stop Instance</button>` : ''}
        ${instance.status === 'stopped' ? `<button class="s3-toolbar-btn rds-start-btn">Start Instance</button>` : ''}
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Instance Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${instance.status}">${instance.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${instance.engine} ${instance.engine_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Class</span><span class="dynamo-value">${instance.class}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Multi-AZ</span><span class="dynamo-value">${instance.multi_az ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AZ</span><span class="dynamo-value">${instance.availability_zone}</span></div>
        ${instance.cluster_id ? `<div class="dynamo-info-row"><span class="dynamo-label">Cluster</span><span class="dynamo-value">${instance.cluster_id}</span></div>` : ''}
      </div>
      <div class="dynamo-info-card">
        <h3>Connection</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Endpoint</span><span class="dynamo-value rds-endpoint">${instance.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${instance.port}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">VPC</span><span class="dynamo-value">${instance.vpc_id}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Storage</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Allocated</span><span class="dynamo-value">${instance.storage_gb} GB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${instance.storage_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Backup Retention</span><span class="dynamo-value">${instance.backup_retention} days</span></div>
      </div>
    </div>
    <h3 class="section-title">Snapshots</h3>
    <div id="rds-snapshots"><div class="loading">Loading snapshots...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderRDS();

  // Start/Stop actions
  const stopBtn = document.querySelector('.rds-stop-btn');
  const startBtn = document.querySelector('.rds-start-btn');
  if (stopBtn) stopBtn.onclick = async () => {
    const confirmed = await showConfirm('Stop Instance', `Are you sure you want to stop ${id}?`);
    if (!confirmed) return;
    try { await invoke('rds_stop_instance', { profile: state.profile, instanceId: id }); showAlert('Success', `Stopping ${id}...`); } catch (e) { showAlert('Error', e); }
  };
  if (startBtn) startBtn.onclick = async () => {
    const confirmed = await showConfirm('Start Instance', `Start instance ${id}?`);
    if (!confirmed) return;
    try { await invoke('rds_start_instance', { profile: state.profile, instanceId: id }); showAlert('Success', `Starting ${id}...`); } catch (e) { showAlert('Error', e); }
  };

  // Load snapshots
  try {
    const snapshots = await invoke('rds_list_snapshots', { profile: state.profile, instanceId: id });
    const snapDiv = document.getElementById('rds-snapshots');
    if (snapshots.length === 0) { snapDiv.innerHTML = '<p class="empty">No snapshots</p>'; return; }
    snapDiv.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Snapshot ID</th><th>Type</th><th>Status</th><th>Created</th><th>Size</th></tr></thead>
      <tbody>${snapshots.map(s => `<tr><td>${s.id}</td><td>${s.snapshot_type}</td><td>${s.status}</td><td>${s.created}</td><td>${s.storage_gb} GB</td></tr>`).join('')}</tbody>
    </table></div>`;
  } catch (e) { document.getElementById('rds-snapshots').innerHTML = `<p class="empty">${e}</p>`; }
}

async function renderRDSClusterDetail(id, cluster) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('rds', 'icon-xs')} Cluster: ${id}</span>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Cluster Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Status</span><span class="dynamo-value rds-status-${cluster.status}">${cluster.status}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${cluster.engine} ${cluster.engine_version}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Multi-AZ</span><span class="dynamo-value">${cluster.multi_az ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Encrypted</span><span class="dynamo-value">${cluster.storage_encrypted ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Backup Retention</span><span class="dynamo-value">${cluster.backup_retention} days</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Endpoints</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Writer</span><span class="dynamo-value rds-endpoint">${cluster.endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Reader</span><span class="dynamo-value rds-endpoint">${cluster.reader_endpoint}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Port</span><span class="dynamo-value">${cluster.port}</span></div>
      </div>
    </div>
    <h3 class="section-title">Members</h3>
    <div class="table-container"><table>
      <thead><tr><th>Instance ID</th><th>Role</th></tr></thead>
      <tbody>${cluster.members.map(m => `<tr><td>${m.instance_id}</td><td>${m.is_writer ? 'Writer' : 'Reader'}</td></tr>`).join('')}</tbody>
    </table></div>`;

  document.querySelector('.back-btn').onclick = () => renderRDS();
}

// Redshift
async function renderRedshift() {
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

// Glue
async function renderGlue(view = 'databases', dbName) {
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

// Athena
async function renderAthena() {
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

// Lambda
async function renderLambda() {
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

// CloudWatch
async function renderCloudWatch(view = 'alarms') {
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

// EventBridge
async function renderEventBridge(busName) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EventBridge...</div>';
  try {
    if (!busName) {
      const buses = await invoke('eb_list_buses', { profile: state.profile });
      content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} EventBridge</h2>
        <input type="text" class="s3-filter-input" placeholder="Filter buses..." id="eb-filter" />
        <div class="item-grid">${buses.map(b => `<div class="item-tile eb-item" data-bus="${b.name}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${b.name}</span>
          <span class="item-meta" style="font-size:0.65rem;word-break:break-all">${b.arn}</span>
        </div>`).join('')}${buses.length === 0 ? '<p class="empty">No event buses</p>' : ''}</div>`;
      document.getElementById('eb-filter').oninput = (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.eb-item').forEach(el => { el.style.display = el.dataset.bus.toLowerCase().includes(f) ? '' : 'none'; });
      };
      document.querySelectorAll('[data-bus]').forEach(el => { el.onclick = () => renderEventBridge(el.dataset.bus); });
    } else {
      const rules = await invoke('eb_list_rules', { profile: state.profile, busName });
      content.innerHTML = `
        <div class="breadcrumb">
          <button class="back-btn">← Back</button>
          <span class="path-text">${icon('eventbridge', 'icon-xs')} ${busName}</span>
          <div class="s3-toolbar">
            <button class="s3-toolbar-btn" id="eb-send-event-btn">Send Test Event</button>
          </div>
        </div>
        <input type="text" class="s3-filter-input" placeholder="Filter rules..." id="eb-rule-filter" />
        <div class="item-grid">${rules.map(r => `<div class="item-tile eb-rule-item" data-rule='${JSON.stringify(r).replace(/'/g, "&#39;")}'>
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${r.name}</span>
          <span class="item-meta">${r.schedule || 'Event pattern'}</span>
          <span class="item-meta eb-state-${r.state.toLowerCase()}">${r.state}</span>
        </div>`).join('')}${rules.length === 0 ? '<p class="empty">No rules</p>' : ''}</div>`;

      document.querySelector('.back-btn').onclick = () => renderEventBridge();
      document.getElementById('eb-rule-filter').oninput = (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.eb-rule-item').forEach(el => {
          el.style.display = el.querySelector('.item-name').textContent.toLowerCase().includes(f) ? '' : 'none';
        });
      };
      document.querySelectorAll('.eb-rule-item').forEach(el => {
        el.onclick = () => renderEbRuleDetail(JSON.parse(el.dataset.rule));
      });
      document.getElementById('eb-send-event-btn').onclick = () => renderEbSendEvent(busName);
    }
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEbRuleDetail(rule) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading rule...</div>';
  try {
    const targets = await invoke('eb_list_targets', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
    const isEnabled = !rule.state.toUpperCase().includes('DISABLED');
    content.innerHTML = `
      <div class="breadcrumb">
        <button class="back-btn">← Back</button>
        <span class="path-text">${icon('eventbridge', 'icon-xs')} Rule: ${rule.name}</span>
        <div class="s3-toolbar">
          <button class="s3-toolbar-btn" id="eb-toggle-rule">${isEnabled ? 'Disable Rule' : 'Enable Rule'}</button>
        </div>
      </div>
      <div class="dynamo-detail-grid">
        <div class="dynamo-info-card">
          <h3>Rule Config</h3>
          <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value eb-state-${rule.state.toLowerCase()}">${rule.state}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Bus</span><span class="dynamo-value">${rule.event_bus_name}</span></div>
          ${rule.schedule ? `<div class="dynamo-info-row"><span class="dynamo-label">Schedule</span><span class="dynamo-value">${rule.schedule}</span></div>` : ''}
          ${rule.description ? `<div class="dynamo-info-row"><span class="dynamo-label">Description</span><span class="dynamo-value">${rule.description}</span></div>` : ''}
        </div>
        <div class="dynamo-info-card">
          <h3>Targets (${targets.length})</h3>
          ${targets.map(t => `
            <div class="dynamo-info-row">
              <span class="dynamo-label">${t.id}</span>
              <span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${t.arn}</span>
            </div>
            ${t.input ? `<div class="dynamo-info-row"><span class="dynamo-label">Input</span><span class="dynamo-value" style="font-size:0.7rem">${t.input}</span></div>` : ''}
          `).join('')}
          ${targets.length === 0 ? '<p class="empty">No targets</p>' : ''}
        </div>
      </div>
      ${rule.event_pattern ? `
      <h3 class="section-title">Event Pattern</h3>
      <div class="glue-script-container"><pre class="glue-script-code" id="eb-pattern-pre"></pre></div>` : ''}`;

    document.querySelector('.back-btn').onclick = () => renderEventBridge(rule.event_bus_name);

    // Pretty print event pattern
    if (rule.event_pattern) {
      try {
        document.getElementById('eb-pattern-pre').textContent = JSON.stringify(JSON.parse(rule.event_pattern), null, 2);
      } catch (_) {
        document.getElementById('eb-pattern-pre').textContent = rule.event_pattern;
      }
    }

    // Enable/Disable
    document.getElementById('eb-toggle-rule').onclick = async () => {
      const action = isEnabled ? 'Disable' : 'Enable';
      const confirmed = await showConfirm(`${action} Rule`, `${action} rule "${rule.name}"?`);
      if (!confirmed) return;
      try {
        if (isEnabled) {
          await invoke('eb_disable_rule', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
        } else {
          await invoke('eb_enable_rule', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
        }
        showAlert('Success', `Rule ${action.toLowerCase()}d`);
        rule.state = isEnabled ? 'DISABLED' : 'ENABLED';
        renderEbRuleDetail(rule);
      } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEbSendEvent(busName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} Send Event to: ${busName}</span>
    </div>
    <div class="dynamo-info-card" style="margin-top:1rem">
      <h3>Test Event</h3>
      <div class="athena-editor-toolbar" style="margin-top:0.8rem">
        <input type="text" class="dialog-input" id="eb-source" placeholder="Source (e.g. my-app)" style="flex:1;margin:0" />
        <input type="text" class="dialog-input" id="eb-detail-type" placeholder="Detail Type (e.g. order.created)" style="flex:1;margin:0" />
      </div>
      <textarea class="athena-textarea" id="eb-detail" placeholder='{"key": "value"}' rows="5">{"test": true}</textarea>
      <button class="s3-toolbar-btn" id="eb-send-btn" style="margin-top:0.8rem;background:var(--accent);color:white;border:none">Send Event</button>
      <div id="eb-send-result"></div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderEventBridge(busName);
  document.getElementById('eb-send-btn').onclick = async () => {
    const source = document.getElementById('eb-source').value.trim();
    const detailType = document.getElementById('eb-detail-type').value.trim();
    const detail = document.getElementById('eb-detail').value.trim();
    if (!source || !detailType || !detail) { showAlert('Missing fields', 'Source, Detail Type and Detail are required'); return; }
    try {
      const msg = await invoke('eb_put_event', { profile: state.profile, busName, source, detailType, detail });
      document.getElementById('eb-send-result').innerHTML = `<div class="lambda-result-card" style="margin-top:0.8rem"><span class="glue-status-succeeded">${msg}</span></div>`;
    } catch (e) { document.getElementById('eb-send-result').innerHTML = formatError(e); }
  };
}

// Lake Formation
async function renderLakeFormation(view = 'settings') {
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

function formatError(e) {
  const msg = typeof e === 'string' ? e : (e.message || JSON.stringify(e));
  const isExpired = /expired|ExpiredToken|InvalidIdentityToken|ExpiredTokenException|security token.*invalid|credentials.*expired|token.*expired|not authorized|AccessDenied|InvalidClientTokenId|AuthFailure|UnrecognizedClientException|service error/i.test(msg);
  if (isExpired) {
    return `<div class="error error-credentials">
      <strong>[!] AWS Credentials Error</strong><br/><br/>
      Your credentials may have expired or are invalid.<br/>
      Please update them in ~/.aws/credentials and restart the app or switch profile.<br/><br/>
      <span style="font-size:0.75rem;color:var(--text-secondary)">Detail: ${msg.substring(0, 150)}</span>
    </div>`;
  }
  return `<div class="error">[!] ${msg}</div>`;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

init();
