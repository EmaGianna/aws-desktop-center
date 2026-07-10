import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderElbv2() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Load Balancers...</div>';
  try {
    const lbs = await invoke('elbv2_list_load_balancers', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} Load Balancers (${lbs.length})</h2>
      <div class="item-grid">${lbs.map(lb => `
        <div class="item-tile elb-item" data-arn="${lb.arn}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${lb.name}</span>
          <span class="item-meta">${lb.lb_type}</span>
          <span class="item-meta rds-status-${lb.state.toLowerCase()}">${lb.state}</span>
        </div>`).join('')}${lbs.length === 0 ? '<p class="empty">No load balancers</p>' : ''}</div>`;

    document.querySelectorAll('.elb-item').forEach(el => {
      el.onclick = () => renderElbDetail(el.dataset.arn, lbs.find(l => l.arn === el.dataset.arn).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderElbDetail(lbArn, lbName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${lbName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="elb-delete-btn">Delete Load Balancer</button></div>
    </div>
    <h3 class="section-title">Target Groups</h3>
    <div id="elb-target-groups"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderElbv2();
  document.getElementById('elb-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Load Balancer', `Delete "${lbName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('elbv2_delete_load_balancer', { profile: state.profile, loadBalancerArn: lbArn });
      showAlert('Success', msg);
      renderElbv2();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const groups = await invoke('elbv2_list_target_groups', { profile: state.profile, loadBalancerArn: lbArn });
    document.getElementById('elb-target-groups').innerHTML = `<div class="item-grid">${groups.map(g => `
      <div class="item-tile elb-tg-item" data-arn="${g.arn}">
        ${icon('eventbridge', 'icon-lg')}
        <span class="item-name">${g.name}</span>
        <span class="item-meta">${g.protocol}:${g.port}</span>
      </div>`).join('')}${groups.length === 0 ? '<p class="empty">No target groups</p>' : ''}</div>
      <div id="elb-target-health"></div>`;

    document.querySelectorAll('.elb-tg-item').forEach(el => {
      el.onclick = async () => {
        const healthDiv = document.getElementById('elb-target-health');
        healthDiv.innerHTML = '<div class="loading">Loading target health...</div>';
        try {
          const health = await invoke('elbv2_list_target_health', { profile: state.profile, targetGroupArn: el.dataset.arn });
          healthDiv.innerHTML = `<h3 class="section-title">Targets</h3><div class="table-container"><table>
            <thead><tr><th>Target</th><th>Port</th><th>State</th></tr></thead>
            <tbody>${health.map(h => `<tr><td>${h.id}</td><td>${h.port}</td><td>${h.state}</td></tr>`).join('')}</tbody>
          </table></div>${health.length === 0 ? '<p class="empty">No targets registered</p>' : ''}`;
        } catch (e) { healthDiv.innerHTML = formatError(e); }
      };
    });
  } catch (e) { document.getElementById('elb-target-groups').innerHTML = formatError(e); }
}
