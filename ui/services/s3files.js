import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderS3Files() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading S3 Files...</div>';
  try {
    const filesystems = await invoke('s3files_list_file_systems', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} S3 File Systems (${filesystems.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="s3f-create-btn">+ Create File System</button></div>
      <div class="item-grid">${filesystems.map(f => `
        <div class="item-tile s3f-item" data-id="${f.id}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${f.id}</span>
          <span class="item-meta rds-status-${f.life_cycle_state}">${f.life_cycle_state}</span>
        </div>`).join('')}${filesystems.length === 0 ? '<p class="empty">No file systems</p>' : ''}</div>`;

    document.getElementById('s3f-create-btn').onclick = async () => {
      const confirmed = await showConfirm('Create File System', 'Create a new S3 File System?');
      if (!confirmed) return;
      try {
        const id = await invoke('s3files_create_file_system', { profile: state.profile });
        showAlert('Success', 'File system created: ' + id);
        renderS3Files();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.s3f-item').forEach(el => {
      el.onclick = () => renderS3FilesDetail(el.dataset.id);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderS3FilesDetail(fileSystemId) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${fileSystemId}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="s3f-mount-btn">+ Add Mount Target</button>
        <button class="s3-toolbar-btn" id="s3f-delete-btn">Delete</button>
      </div>
    </div>
    <h3 class="section-title">Mount Targets</h3>
    <div id="s3f-mount-targets"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderS3Files();
  document.getElementById('s3f-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete File System', `Delete "${fileSystemId}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('s3files_delete_file_system', { profile: state.profile, fileSystemId });
      showAlert('Success', msg);
      renderS3Files();
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('s3f-mount-btn').onclick = async () => {
    const subnetId = await showPrompt('Add Mount Target', 'Subnet ID:', '');
    if (!subnetId) return;
    try {
      const id = await invoke('s3files_create_mount_target', { profile: state.profile, fileSystemId, subnetId });
      showAlert('Success', 'Mount target created: ' + id);
      loadMountTargets(fileSystemId);
    } catch (e) { showAlert('Error', e); }
  };

  loadMountTargets(fileSystemId);
}

async function loadMountTargets(fileSystemId) {
  const container = document.getElementById('s3f-mount-targets');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const targets = await invoke('s3files_list_mount_targets', { profile: state.profile, fileSystemId });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>ID</th><th>Subnet</th><th>State</th><th>Actions</th></tr></thead>
      <tbody>${targets.map(t => `<tr>
        <td style="font-size:0.7rem">${t.id}</td><td>${t.subnet_id}</td><td>${t.life_cycle_state}</td>
        <td><button class="s3-action-btn s3f-remove-mount-btn" data-id="${t.id}">Remove</button></td>
      </tr>`).join('')}</tbody>
    </table></div>${targets.length === 0 ? '<p class="empty">No mount targets</p>' : ''}`;

    document.querySelectorAll('.s3f-remove-mount-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Remove Mount Target', `Remove mount target ${btn.dataset.id}?`);
        if (!confirmed) return;
        try {
          await invoke('s3files_delete_mount_target', { profile: state.profile, mountTargetId: btn.dataset.id });
          loadMountTargets(fileSystemId);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
