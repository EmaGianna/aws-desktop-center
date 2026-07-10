import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderS3Vectors() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading S3 Vectors...</div>';
  try {
    const buckets = await invoke('s3vectors_list_buckets', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} S3 Vector Buckets (${buckets.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="s3v-create-btn">+ Create Vector Bucket</button></div>
      <div class="item-grid">${buckets.map(b => `
        <div class="item-tile s3v-item" data-name="${b.name}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${b.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${b.created_at}</span>
        </div>`).join('')}${buckets.length === 0 ? '<p class="empty">No vector buckets</p>' : ''}</div>`;

    document.getElementById('s3v-create-btn').onclick = async () => {
      const name = await showPrompt('Create Vector Bucket', 'Bucket name:', '');
      if (!name) return;
      try {
        const msg = await invoke('s3vectors_create_bucket', { profile: state.profile, name });
        showAlert('Success', msg);
        renderS3Vectors();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.s3v-item').forEach(el => {
      el.onclick = () => renderS3VectorsBucketDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderS3VectorsBucketDetail(bucketName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${bucketName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="s3v-delete-btn">Delete Bucket</button></div>
    </div>
    <h3 class="section-title">Indexes</h3>
    <div id="s3v-indexes"><div class="loading">Loading indexes...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderS3Vectors();
  document.getElementById('s3v-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Vector Bucket', `Delete "${bucketName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('s3vectors_delete_bucket', { profile: state.profile, name: bucketName });
      showAlert('Success', msg);
      renderS3Vectors();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const indexes = await invoke('s3vectors_list_indexes', { profile: state.profile, vectorBucketName: bucketName });
    document.getElementById('s3v-indexes').innerHTML = `<div class="item-grid">${indexes.map(i => `
      <div class="item-tile">
        ${icon('file', 'icon-lg')}
        <span class="item-name">${i.name}</span>
        <span class="item-meta" style="font-size:0.65rem">${i.created_at}</span>
      </div>`).join('')}${indexes.length === 0 ? '<p class="empty">No indexes</p>' : ''}</div>`;
  } catch (e) { document.getElementById('s3v-indexes').innerHTML = formatError(e); }
}
