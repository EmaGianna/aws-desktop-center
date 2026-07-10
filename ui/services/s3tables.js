import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderS3Tables() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading S3 Tables...</div>';
  try {
    const buckets = await invoke('s3tables_list_buckets', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} S3 Table Buckets (${buckets.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="s3t-create-btn">+ Create Table Bucket</button></div>
      <div class="item-grid">${buckets.map(b => `
        <div class="item-tile s3t-item" data-arn="${b.arn}" data-name="${b.name}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${b.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${b.created_at}</span>
        </div>`).join('')}${buckets.length === 0 ? '<p class="empty">No table buckets</p>' : ''}</div>`;

    document.getElementById('s3t-create-btn').onclick = async () => {
      const name = await showPrompt('Create Table Bucket', 'Bucket name:', '');
      if (!name) return;
      try {
        await invoke('s3tables_create_bucket', { profile: state.profile, name });
        showAlert('Success', 'Table bucket created');
        renderS3Tables();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.s3t-item').forEach(el => {
      el.onclick = () => renderS3TablesBucketDetail(el.dataset.arn, el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderS3TablesBucketDetail(bucketArn, bucketName, namespace = '') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${bucketName}${namespace ? ' / ' + namespace : ''}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="s3t-delete-btn">Delete Bucket</button></div>
    </div>
    ${namespace ? '<h3 class="section-title">Tables</h3>' : '<h3 class="section-title">Namespaces</h3>'}
    <div id="s3t-content"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => namespace ? renderS3TablesBucketDetail(bucketArn, bucketName) : renderS3Tables();
  document.getElementById('s3t-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Table Bucket', `Delete "${bucketName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('s3tables_delete_bucket', { profile: state.profile, tableBucketArn: bucketArn });
      showAlert('Success', msg);
      renderS3Tables();
    } catch (e) { showAlert('Error', e); }
  };

  const container = document.getElementById('s3t-content');
  try {
    if (namespace) {
      const tables = await invoke('s3tables_list_tables', { profile: state.profile, tableBucketArn: bucketArn, namespace });
      container.innerHTML = `<div class="item-grid">${tables.map(t => `
        <div class="item-tile">${icon('file', 'icon-lg')}<span class="item-name">${t.name}</span></div>`).join('')}${tables.length === 0 ? '<p class="empty">No tables</p>' : ''}</div>`;
    } else {
      const namespaces = await invoke('s3tables_list_namespaces', { profile: state.profile, tableBucketArn: bucketArn });
      container.innerHTML = `<div class="item-grid">${namespaces.map(n => `
        <div class="item-tile s3t-ns-item" data-ns="${n.namespace}">${icon('folder', 'icon-lg')}<span class="item-name">${n.namespace}</span></div>`).join('')}${namespaces.length === 0 ? '<p class="empty">No namespaces</p>' : ''}</div>`;
      document.querySelectorAll('.s3t-ns-item').forEach(el => {
        el.onclick = () => renderS3TablesBucketDetail(bucketArn, bucketName, el.dataset.ns);
      });
    }
  } catch (e) { container.innerHTML = formatError(e); }
}
