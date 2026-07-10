import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderEbs(view = 'volumes') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EBS...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('s3', 'icon-md')} EBS</h2>
      <div class="tabs">
        <button class="tab ${view === 'volumes' ? 'active' : ''}" data-view="volumes">Volumes</button>
        <button class="tab ${view === 'snapshots' ? 'active' : ''}" data-view="snapshots">Snapshots</button>
      </div>`;

    if (view === 'snapshots') {
      const snapshots = await invoke('ebs_list_snapshots', { profile: state.profile });
      html += `<div class="table-container"><table>
        <thead><tr><th>ID</th><th>Volume</th><th>State</th><th>Size</th><th>Description</th><th>Started</th></tr></thead>
        <tbody>${snapshots.map(s => `<tr><td style="font-size:0.7rem">${s.id}</td><td style="font-size:0.7rem">${s.volume_id}</td><td>${s.state}</td><td>${s.volume_size_gb} GB</td><td>${s.description}</td><td style="font-size:0.7rem">${s.start_time}</td></tr>`).join('')}</tbody>
      </table></div>${snapshots.length === 0 ? '<p class="empty">No snapshots</p>' : ''}`;
      content.innerHTML = html;
    } else {
      const volumes = await invoke('ebs_list_volumes', { profile: state.profile });
      html += `
        <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="ebs-create-btn">+ Create Volume</button></div>
        <div class="item-grid">${volumes.map(v => `
        <div class="item-tile ebs-item" data-id="${v.id}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${v.id}</span>
          <span class="item-meta">${v.size_gb} GB | ${v.volume_type}</span>
          <span class="item-meta rds-status-${v.state}">${v.state}</span>
        </div>`).join('')}${volumes.length === 0 ? '<p class="empty">No volumes</p>' : ''}</div>`;
      content.innerHTML = html;

      document.getElementById('ebs-create-btn').onclick = async () => {
        const az = await showPrompt('Create Volume', 'Availability Zone (e.g. us-east-1a):', '');
        if (!az) return;
        const size = await showPrompt('Create Volume', 'Size (GB):', '10');
        if (!size) return;
        try {
          const id = await invoke('ebs_create_volume', { profile: state.profile, availabilityZone: az, sizeGb: parseInt(size, 10), volumeType: 'gp3' });
          showAlert('Success', 'Volume created: ' + id);
          renderEbs('volumes');
        } catch (e) { showAlert('Error', e); }
      };
      document.querySelectorAll('.ebs-item').forEach(el => {
        el.onclick = () => renderEbsVolumeDetail(volumes.find(v => v.id === el.dataset.id));
      });
    }

    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderEbs(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderEbsVolumeDetail(volume) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${volume.id}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="ebs-snapshot-btn">Create Snapshot</button>
        ${volume.attached_instance ? '<button class="s3-toolbar-btn" id="ebs-detach-btn">Detach</button>' : '<button class="s3-toolbar-btn" id="ebs-attach-btn">Attach</button>'}
        ${!volume.attached_instance ? '<button class="s3-toolbar-btn" id="ebs-delete-btn">Delete</button>' : ''}
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Volume Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value rds-status-${volume.state}">${volume.state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Size</span><span class="dynamo-value">${volume.size_gb} GB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Type</span><span class="dynamo-value">${volume.volume_type}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">AZ</span><span class="dynamo-value">${volume.availability_zone}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Encrypted</span><span class="dynamo-value">${volume.encrypted ? 'Yes' : 'No'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value" style="font-size:0.7rem">${volume.create_time}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Attachment</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Instance</span><span class="dynamo-value">${volume.attached_instance || 'Not attached'}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Device</span><span class="dynamo-value">${volume.device || '-'}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderEbs('volumes');

  document.getElementById('ebs-snapshot-btn').onclick = async () => {
    const description = await showPrompt('Create Snapshot', 'Description:', `Snapshot of ${volume.id}`);
    if (description === null) return;
    try {
      const id = await invoke('ebs_create_snapshot', { profile: state.profile, volumeId: volume.id, description });
      showAlert('Success', 'Snapshot created: ' + id);
    } catch (e) { showAlert('Error', e); }
  };

  const attachBtn = document.getElementById('ebs-attach-btn');
  if (attachBtn) attachBtn.onclick = async () => {
    const instanceId = await showPrompt('Attach Volume', 'Instance ID:', '');
    if (!instanceId) return;
    const device = await showPrompt('Attach Volume', 'Device (e.g. /dev/sdf):', '/dev/sdf');
    if (!device) return;
    try {
      const msg = await invoke('ebs_attach_volume', { profile: state.profile, volumeId: volume.id, instanceId, device });
      showAlert('Success', msg);
      renderEbs('volumes');
    } catch (e) { showAlert('Error', e); }
  };

  const detachBtn = document.getElementById('ebs-detach-btn');
  if (detachBtn) detachBtn.onclick = async () => {
    const confirmed = await showConfirm('Detach Volume', `Detach ${volume.id}?`);
    if (!confirmed) return;
    try {
      const msg = await invoke('ebs_detach_volume', { profile: state.profile, volumeId: volume.id });
      showAlert('Success', msg);
      renderEbs('volumes');
    } catch (e) { showAlert('Error', e); }
  };

  const deleteBtn = document.getElementById('ebs-delete-btn');
  if (deleteBtn) deleteBtn.onclick = async () => {
    const confirmed = await showConfirm('Delete Volume', `Delete ${volume.id}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('ebs_delete_volume', { profile: state.profile, volumeId: volume.id });
      showAlert('Success', msg);
      renderEbs('volumes');
    } catch (e) { showAlert('Error', e); }
  };
}
