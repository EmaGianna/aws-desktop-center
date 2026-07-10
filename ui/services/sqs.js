import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderSqs() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading SQS...</div>';
  try {
    const queues = await invoke('sqs_list_queues', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} SQS Queues (${queues.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="sqs-create-btn">+ Create Queue</button></div>
      <div class="item-grid">${queues.map(q => `
        <div class="item-tile sqs-item" data-url="${q.url}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${q.name}</span>
          <span class="item-meta">${q.approximate_messages} messages${q.fifo ? ' | FIFO' : ''}</span>
        </div>`).join('')}${queues.length === 0 ? '<p class="empty">No queues</p>' : ''}</div>`;

    document.getElementById('sqs-create-btn').onclick = async () => {
      const name = await showPrompt('Create Queue', 'Queue name:', '');
      if (!name) return;
      const fifo = await showConfirm('FIFO Queue?', 'OK = FIFO queue, Cancel = Standard queue');
      try {
        const url = await invoke('sqs_create_queue', { profile: state.profile, name: fifo ? (name.endsWith('.fifo') ? name : name + '.fifo') : name, fifo });
        showAlert('Success', 'Queue created: ' + url);
        renderSqs();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.sqs-item').forEach(el => {
      el.onclick = () => renderSqsDetail(el.dataset.url, queues.find(q => q.url === el.dataset.url));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderSqsDetail(queueUrl, queue) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${queue.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="sqs-send-btn">Send Message</button>
        <button class="s3-toolbar-btn" id="sqs-purge-btn">Purge</button>
        <button class="s3-toolbar-btn" id="sqs-delete-btn">Delete Queue</button>
      </div>
    </div>
    <h3 class="section-title">Messages (receive up to 10)</h3>
    <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="sqs-receive-btn">Receive Messages</button></div>
    <div id="sqs-messages"></div>`;

  document.querySelector('.back-btn').onclick = () => renderSqs();

  document.getElementById('sqs-send-btn').onclick = async () => {
    const body = await showPrompt('Send Message', 'Message body:', '');
    if (body === null || body === '') return;
    try {
      const id = await invoke('sqs_send_message', { profile: state.profile, queueUrl, messageBody: body });
      showAlert('Success', 'Message sent: ' + id);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sqs-purge-btn').onclick = async () => {
    const confirmed = await showConfirm('Purge Queue', `Delete ALL messages in ${queue.name}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('sqs_purge_queue', { profile: state.profile, queueUrl });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sqs-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Queue', `Delete queue "${queue.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await invoke('sqs_delete_queue', { profile: state.profile, queueUrl });
      showAlert('Success', 'Queue deleted');
      renderSqs();
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sqs-receive-btn').onclick = async () => {
    const msgDiv = document.getElementById('sqs-messages');
    msgDiv.innerHTML = '<div class="loading">Receiving...</div>';
    try {
      const messages = await invoke('sqs_receive_messages', { profile: state.profile, queueUrl });
      msgDiv.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Message ID</th><th>Body</th><th>Actions</th></tr></thead>
        <tbody>${messages.map(m => `<tr>
          <td style="font-size:0.65rem">${m.id}</td>
          <td style="font-size:0.75rem;max-width:350px;overflow:hidden;text-overflow:ellipsis">${m.body}</td>
          <td><button class="s3-action-btn sqs-delete-msg-btn" data-receipt="${m.receipt_handle.replace(/"/g, '&quot;')}">Delete</button></td>
        </tr>`).join('')}</tbody>
      </table></div>${messages.length === 0 ? '<p class="empty">No messages available</p>' : ''}`;

      document.querySelectorAll('.sqs-delete-msg-btn').forEach(btn => {
        btn.onclick = async () => {
          try {
            await invoke('sqs_delete_message', { profile: state.profile, queueUrl, receiptHandle: btn.dataset.receipt });
            btn.closest('tr').remove();
          } catch (e) { showAlert('Error', e); }
        };
      });
    } catch (e) { msgDiv.innerHTML = formatError(e); }
  };
}
