import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderFirehose() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Data Firehose...</div>';
  try {
    const streams = await invoke('firehose_list_streams', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} Data Firehose (${streams.length})</h2>
      <div class="item-grid">${streams.map(s => `
        <div class="item-tile fh-item" data-name="${s.name}">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta">${s.stream_type}</span>
          <span class="item-meta rds-status-${s.status.toLowerCase()}">${s.status}</span>
        </div>`).join('')}${streams.length === 0 ? '<p class="empty">No delivery streams</p>' : ''}</div>`;

    document.querySelectorAll('.fh-item').forEach(el => {
      el.onclick = () => renderFirehoseDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderFirehoseDetail(name) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('cloudwatch', 'icon-xs')} ${name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="fh-put-btn">Put Record</button>
        <button class="s3-toolbar-btn" id="fh-delete-btn">Delete Stream</button>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderFirehose();
  document.getElementById('fh-put-btn').onclick = async () => {
    const data = await showPrompt('Put Record', 'Record data:', '');
    if (data === null || data === '') return;
    try {
      const msg = await invoke('firehose_put_record', { profile: state.profile, deliveryStreamName: name, data });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('fh-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Delivery Stream', `Delete "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('firehose_delete_stream', { profile: state.profile, deliveryStreamName: name });
      showAlert('Success', msg);
      renderFirehose();
    } catch (e) { showAlert('Error', e); }
  };
}
