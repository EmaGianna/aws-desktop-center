import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderMq() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Amazon MQ...</div>';
  try {
    const brokers = await invoke('mq_list_brokers', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} Amazon MQ Brokers (${brokers.length})</h2>
      <div class="item-grid">${brokers.map(b => `
        <div class="item-tile mq-item" data-id="${b.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${b.name}</span>
          <span class="item-meta">${b.engine_type} | ${b.instance_type}</span>
          <span class="item-meta rds-status-${b.state.toLowerCase()}">${b.state}</span>
        </div>`).join('')}${brokers.length === 0 ? '<p class="empty">No brokers</p>' : ''}</div>`;

    document.querySelectorAll('.mq-item').forEach(el => {
      el.onclick = () => renderMqDetail(brokers.find(b => b.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderMqDetail(broker) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${broker.name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="mq-reboot-btn">Reboot Broker</button></div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Broker Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value rds-status-${broker.state.toLowerCase()}">${broker.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Engine</span><span class="dynamo-value">${broker.engine_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Instance Type</span><span class="dynamo-value">${broker.instance_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Broker ID</span><span class="dynamo-value" style="font-size:0.7rem">${broker.id}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderMq();
  document.getElementById('mq-reboot-btn').onclick = async () => {
    const confirmed = await showConfirm('Reboot Broker', `Reboot broker "${broker.name}"? This will cause a brief downtime.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('mq_reboot_broker', { profile: state.profile, brokerId: broker.id });
      showAlert('Success', msg);
    } catch (e) { showAlert('Error', e); }
  };
}
