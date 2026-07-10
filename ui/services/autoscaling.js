import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderAutoScaling() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Auto Scaling...</div>';
  try {
    const groups = await invoke('asg_list_groups', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} Auto Scaling Groups (${groups.length})</h2>
      <div class="item-grid">${groups.map(g => `
        <div class="item-tile asg-item" data-name="${g.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${g.name}</span>
          <span class="item-meta">Min ${g.min_size} | Desired ${g.desired_capacity} | Max ${g.max_size}</span>
          <span class="item-meta">${g.instance_count} instances</span>
        </div>`).join('')}${groups.length === 0 ? '<p class="empty">No Auto Scaling groups</p>' : ''}</div>`;

    document.querySelectorAll('.asg-item').forEach(el => {
      el.onclick = () => renderGroupDetail(groups.find(g => g.name === el.dataset.name));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderGroupDetail(group) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${group.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="asg-scale-btn">Set Desired Capacity</button>
        <button class="s3-toolbar-btn" id="asg-delete-btn">Delete Group</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Scaling Config</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Min Size</span><span class="dynamo-value">${group.min_size}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Desired Capacity</span><span class="dynamo-value">${group.desired_capacity}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Max Size</span><span class="dynamo-value">${group.max_size}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Current Instances</span><span class="dynamo-value">${group.instance_count}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderAutoScaling();
  document.getElementById('asg-scale-btn').onclick = async () => {
    const desired = await showPrompt('Set Desired Capacity', `New desired capacity (min ${group.min_size}, max ${group.max_size}):`, String(group.desired_capacity));
    if (!desired) return;
    try {
      const msg = await invoke('asg_update_desired_capacity', { profile: state.profile, groupName: group.name, desiredCapacity: parseInt(desired, 10) });
      showAlert('Success', msg);
      renderAutoScaling();
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('asg-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Group', `Delete Auto Scaling group "${group.name}"? This will terminate its instances.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('asg_delete_group', { profile: state.profile, groupName: group.name });
      showAlert('Success', msg);
      renderAutoScaling();
    } catch (e) { showAlert('Error', e); }
  };
}
