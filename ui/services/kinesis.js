import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderKinesis() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Kinesis...</div>';
  try {
    const streams = await invoke('kinesis_list_streams', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} Kinesis Data Streams (${streams.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="kn-create-btn">+ Create Stream</button></div>
      <div class="item-grid">${streams.map(s => `
        <div class="item-tile kn-item" data-name="${s.name}">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta">${s.shard_count} shards | ${s.retention_hours}h retention</span>
          <span class="item-meta rds-status-${s.status.toLowerCase()}">${s.status}</span>
        </div>`).join('')}${streams.length === 0 ? '<p class="empty">No streams</p>' : ''}</div>`;

    document.getElementById('kn-create-btn').onclick = async () => {
      const name = await showPrompt('Create Stream', 'Stream name:', '');
      if (!name) return;
      const shards = await showPrompt('Create Stream', 'Shard count:', '1');
      if (!shards) return;
      try {
        const msg = await invoke('kinesis_create_stream', { profile: state.profile, streamName: name, shardCount: parseInt(shards, 10) });
        showAlert('Success', msg);
        renderKinesis();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.kn-item').forEach(el => {
      el.onclick = () => renderKinesisDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderKinesisDetail(streamName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('cloudwatch', 'icon-xs')} ${streamName}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="kn-put-btn">Put Record</button>
        <button class="s3-toolbar-btn" id="kn-read-btn">Read Records</button>
        <button class="s3-toolbar-btn" id="kn-delete-btn">Delete Stream</button>
      </div>
    </div>
    <div id="kn-records"></div>`;

  document.querySelector('.back-btn').onclick = () => renderKinesis();

  document.getElementById('kn-put-btn').onclick = async () => {
    const data = await showPrompt('Put Record', 'Record data:', '');
    if (data === null || data === '') return;
    const partitionKey = await showPrompt('Put Record', 'Partition key:', 'default');
    if (!partitionKey) return;
    try {
      const msg = await invoke('kinesis_put_record', { profile: state.profile, streamName, data, partitionKey });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('kn-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Stream', `Delete stream "${streamName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('kinesis_delete_stream', { profile: state.profile, streamName });
      showAlert('Success', msg);
      renderKinesis();
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('kn-read-btn').onclick = async () => {
    const recDiv = document.getElementById('kn-records');
    recDiv.innerHTML = '<div class="loading">Reading records...</div>';
    try {
      const records = await invoke('kinesis_get_records', { profile: state.profile, streamName });
      if (records.length === 0) { recDiv.innerHTML = '<p class="empty">No records available on the first shard (from TRIM_HORIZON)</p>'; return; }
      recDiv.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Partition Key</th><th>Sequence Number</th><th>Data</th></tr></thead>
        <tbody>${records.map(r => `<tr>
          <td>${r.partition_key}</td>
          <td style="font-size:0.65rem">${r.sequence_number}</td>
          <td style="font-size:0.75rem;max-width:350px;overflow:hidden;text-overflow:ellipsis">${r.data}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    } catch (e) { recDiv.innerHTML = formatError(e); }
  };
}
