import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderEfs() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EFS...</div>';
  try {
    const filesystems = await invoke('efs_list_file_systems', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} EFS File Systems (${filesystems.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="efs-create-btn">+ Create File System</button></div>
      <div class="item-grid">${filesystems.map(f => `
        <div class="item-tile efs-item" data-id="${f.id}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${f.name || f.id}</span>
          <span class="item-meta">${(f.size_bytes / 1048576).toFixed(1)} MB | ${f.performance_mode}</span>
          <span class="item-meta rds-status-${f.life_cycle_state}">${f.life_cycle_state}</span>
        </div>`).join('')}${filesystems.length === 0 ? '<p class="empty">No file systems</p>' : ''}</div>`;

    document.getElementById('efs-create-btn').onclick = async () => {
      const confirmed = await showConfirm('Create File System', 'Create a new EFS file system (generalPurpose performance mode)?');
      if (!confirmed) return;
      try {
        const id = await invoke('efs_create_file_system', { profile: state.profile, performanceMode: 'generalPurpose' });
        showAlert('Success', 'File system created: ' + id);
        renderEfs();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.efs-item').forEach(el => {
      el.onclick = () => renderEfsDetail(filesystems.find(f => f.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEfsDetail(fs) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${fs.name || fs.id}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="efs-mount-btn">+ Add Mount Target</button>
        <button class="s3-toolbar-btn" id="efs-delete-btn">Delete</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>File System Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value rds-status-${fs.life_cycle_state}">${fs.life_cycle_state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Size</span><span class="dynamo-value">${(fs.size_bytes / 1048576).toFixed(1)} MB</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Performance Mode</span><span class="dynamo-value">${fs.performance_mode}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Throughput Mode</span><span class="dynamo-value">${fs.throughput_mode}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value" style="font-size:0.7rem">${fs.creation_time}</span></div>
      </div>
    </div>
    <h3 class="section-title">Mount Targets</h3>
    <div id="efs-mount-targets"><div class="loading">Loading mount targets...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderEfs();

  document.getElementById('efs-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete File System', `Delete "${fs.name || fs.id}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('efs_delete_file_system', { profile: state.profile, fileSystemId: fs.id });
      showAlert('Success', msg);
      renderEfs();
    } catch (e) { showAlert('Error', e); }
  };

  document.getElementById('efs-mount-btn').onclick = async () => {
    const subnetId = await showPrompt('Add Mount Target', 'Subnet ID:', '');
    if (!subnetId) return;
    try {
      const id = await invoke('efs_create_mount_target', { profile: state.profile, fileSystemId: fs.id, subnetId });
      showAlert('Success', 'Mount target created: ' + id);
      loadMountTargets(fs.id);
    } catch (e) { showAlert('Error', e); }
  };

  loadMountTargets(fs.id);
}

async function loadMountTargets(fileSystemId) {
  const container = document.getElementById('efs-mount-targets');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const targets = await invoke('efs_list_mount_targets', { profile: state.profile, fileSystemId });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>ID</th><th>Subnet</th><th>State</th><th>IP</th><th>Actions</th></tr></thead>
      <tbody>${targets.map(t => `<tr>
        <td style="font-size:0.7rem">${t.id}</td><td>${t.subnet_id}</td><td>${t.life_cycle_state}</td><td>${t.ip_address}</td>
        <td><button class="s3-action-btn efs-remove-mount-btn" data-id="${t.id}">Remove</button></td>
      </tr>`).join('')}</tbody>
    </table></div>${targets.length === 0 ? '<p class="empty">No mount targets</p>' : ''}`;

    document.querySelectorAll('.efs-remove-mount-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Remove Mount Target', `Remove mount target ${btn.dataset.id}?`);
        if (!confirmed) return;
        try {
          await invoke('efs_delete_mount_target', { profile: state.profile, mountTargetId: btn.dataset.id });
          loadMountTargets(fileSystemId);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
