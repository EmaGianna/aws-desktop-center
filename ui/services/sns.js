import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderSns() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading SNS...</div>';
  try {
    const topics = await invoke('sns_list_topics', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} SNS Topics (${topics.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="sns-create-btn">+ Create Topic</button></div>
      <div class="item-grid">${topics.map(t => `
        <div class="item-tile sns-item" data-arn="${t.arn}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${t.name}</span>
        </div>`).join('')}${topics.length === 0 ? '<p class="empty">No topics</p>' : ''}</div>`;

    document.getElementById('sns-create-btn').onclick = async () => {
      const name = await showPrompt('Create Topic', 'Topic name:', '');
      if (!name) return;
      try {
        const arn = await invoke('sns_create_topic', { profile: state.profile, name });
        showAlert('Success', 'Topic created: ' + arn);
        renderSns();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.sns-item').forEach(el => {
      el.onclick = () => renderSnsDetail(el.dataset.arn, topics.find(t => t.arn === el.dataset.arn));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderSnsDetail(topicArn, topic) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${topic.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="sns-publish-btn">Publish Message</button>
        <button class="s3-toolbar-btn" id="sns-subscribe-btn">+ Subscribe</button>
        <button class="s3-toolbar-btn" id="sns-delete-btn">Delete Topic</button>
      </div>
    </div>
    <h3 class="section-title">Subscriptions</h3>
    <div id="sns-subscriptions"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderSns();

  document.getElementById('sns-publish-btn').onclick = async () => {
    const message = await showPrompt('Publish Message', 'Message:', '');
    if (!message) return;
    const subject = await showPrompt('Publish Message', 'Subject (optional):', '');
    try {
      const id = await invoke('sns_publish', { profile: state.profile, topicArn, message, subject: subject || '' });
      showAlert('Success', 'Published: ' + id);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sns-subscribe-btn').onclick = async () => {
    const protocol = await showPrompt('Subscribe', 'Protocol (email, sqs, lambda, http, https, sms):', 'email');
    if (!protocol) return;
    const endpoint = await showPrompt('Subscribe', 'Endpoint (address/ARN/URL):', '');
    if (!endpoint) return;
    try {
      const arn = await invoke('sns_subscribe', { profile: state.profile, topicArn, protocol, endpoint });
      showAlert('Success', 'Subscribed: ' + arn);
      loadSubscriptions(topicArn);
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('sns-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Topic', `Delete topic "${topic.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await invoke('sns_delete_topic', { profile: state.profile, topicArn });
      showAlert('Success', 'Topic deleted');
      renderSns();
    } catch (e) { showAlert('Error', e); }
  };

  loadSubscriptions(topicArn);
}

async function loadSubscriptions(topicArn) {
  const container = document.getElementById('sns-subscriptions');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const subs = await invoke('sns_list_subscriptions', { profile: state.profile, topicArn });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Protocol</th><th>Endpoint</th><th>Actions</th></tr></thead>
      <tbody>${subs.map(s => `<tr>
        <td>${s.protocol}</td>
        <td style="font-size:0.7rem;max-width:300px;overflow:hidden;text-overflow:ellipsis">${s.endpoint}</td>
        <td>${s.arn.startsWith('arn:') ? `<button class="s3-action-btn sns-unsub-btn" data-arn="${s.arn}">Unsubscribe</button>` : '<span class="item-meta">Pending confirmation</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>${subs.length === 0 ? '<p class="empty">No subscriptions</p>' : ''}`;

    document.querySelectorAll('.sns-unsub-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Unsubscribe', 'Remove this subscription?');
        if (!confirmed) return;
        try {
          await invoke('sns_unsubscribe', { profile: state.profile, subscriptionArn: btn.dataset.arn });
          loadSubscriptions(topicArn);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
