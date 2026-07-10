import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError, formatSize } from './shared.js';

export async function renderS3(bucket, prefix = '') {
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
