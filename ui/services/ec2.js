import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderEc2() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EC2...</div>';
  try {
    const instances = await invoke('ec2_list_instances', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} EC2 Instances (${instances.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter instances..." id="ec2-filter" />
      <div class="item-grid">${instances.map(i => `
        <div class="item-tile ec2-item" data-id="${i.id}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${i.name || i.id}</span>
          <span class="item-meta">${i.instance_type} | ${i.availability_zone}</span>
          <span class="item-meta rds-status-${i.state}">${i.state}</span>
        </div>`).join('')}${instances.length === 0 ? '<p class="empty">No instances</p>' : ''}</div>`;

    document.getElementById('ec2-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.ec2-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.ec2-item').forEach(el => {
      el.onclick = () => renderEc2Detail(instances.find(i => i.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function ec2Actions(instance) {
  const actions = [];
  if (instance.state === 'running') {
    actions.push('<button class="s3-toolbar-btn ec2-stop-btn">Stop</button>');
    actions.push('<button class="s3-toolbar-btn ec2-reboot-btn">Reboot</button>');
  }
  if (instance.state === 'stopped') {
    actions.push('<button class="s3-toolbar-btn ec2-start-btn">Start</button>');
  }
  if (instance.state !== 'terminated' && instance.state !== 'shutting-down') {
    actions.push('<button class="s3-toolbar-btn ec2-terminate-btn">Terminate</button>');
  }
  return actions.join('');
}

function renderEc2Detail(instance) {
  const content = document.getElementById('content');
  const tagEntries = Object.entries(instance.tags);
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${instance.name || instance.id}</span>
      <div class="s3-toolbar">${ec2Actions(instance)}</div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Instance Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">ID</span><span class="dynamo-value">${instance.id}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value rds-status-${instance.state}">${instance.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${instance.instance_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AZ</span><span class="dynamo-value">${instance.availability_zone}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AMI</span><span class="dynamo-value" style="font-size:0.7rem">${instance.image_id}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Key Pair</span><span class="dynamo-value">${instance.key_name}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Launched</span><span class="dynamo-value" style="font-size:0.7rem">${instance.launch_time}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Network</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Public IP</span><span class="dynamo-value">${instance.public_ip || '-'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Private IP</span><span class="dynamo-value">${instance.private_ip || '-'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">VPC</span><span class="dynamo-value">${instance.vpc_id}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Subnet</span><span class="dynamo-value">${instance.subnet_id}</span></div>
      </div>
    </div>
    ${tagEntries.length > 0 ? `
    <h3 class="section-title">Tags (${tagEntries.length})</h3>
    <div class="table-container"><table>
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>${tagEntries.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody>
    </table></div>` : ''}`;

  document.querySelector('.back-btn').onclick = () => renderEc2();

  const bind = (sel, action, confirmMsg, invokeName) => {
    const btn = document.querySelector(sel);
    if (!btn) return;
    btn.onclick = async () => {
      const confirmed = await showConfirm(action, confirmMsg);
      if (!confirmed) return;
      try {
        const msg = await invoke(invokeName, { profile: state.profile, instanceId: instance.id });
        showAlert('Success', msg);
        renderEc2();
      } catch (e) { showAlert('Error', e); }
    };
  };
  bind('.ec2-start-btn', 'Start Instance', `Start ${instance.id}?`, 'ec2_start_instance');
  bind('.ec2-stop-btn', 'Stop Instance', `Stop ${instance.id}?`, 'ec2_stop_instance');
  bind('.ec2-reboot-btn', 'Reboot Instance', `Reboot ${instance.id}?`, 'ec2_reboot_instance');
  bind('.ec2-terminate-btn', 'Terminate Instance', `Terminate ${instance.id}? This cannot be undone.`, 'ec2_terminate_instance');
}
