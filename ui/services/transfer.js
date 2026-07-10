import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderTransfer() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Transfer Family...</div>';
  try {
    const servers = await invoke('transfer_list_servers', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('s3', 'icon-md')} Transfer Family Servers (${servers.length})</h2>
      <div class="item-grid">${servers.map(s => `
        <div class="item-tile tf-item" data-id="${s.id}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${s.id}</span>
          <span class="item-meta">${s.domain} | ${s.identity_provider_type}</span>
          <span class="item-meta rds-status-${s.state.toLowerCase()}">${s.state}</span>
        </div>`).join('')}${servers.length === 0 ? '<p class="empty">No servers</p>' : ''}</div>`;

    document.querySelectorAll('.tf-item').forEach(el => {
      el.onclick = () => renderServerDetail(servers.find(s => s.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderServerDetail(server) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${server.id}</span>
      <div class="s3-toolbar">
        ${server.state === 'ONLINE' ? '<button class="s3-toolbar-btn" id="tf-stop-btn">Stop</button>' : ''}
        ${server.state === 'OFFLINE' ? '<button class="s3-toolbar-btn" id="tf-start-btn">Start</button>' : ''}
        <button class="s3-toolbar-btn" id="tf-delete-btn">Delete Server</button>
      </div>
    </div>
    <h3 class="section-title">Users</h3>
    <div id="tf-users"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderTransfer();

  const stopBtn = document.getElementById('tf-stop-btn');
  if (stopBtn) stopBtn.onclick = async () => {
    try { const msg = await invoke('transfer_stop_server', { profile: state.profile, serverId: server.id }); showAlert('Success', msg); renderTransfer(); } catch (e) { showAlert('Error', e); }
  };
  const startBtn = document.getElementById('tf-start-btn');
  if (startBtn) startBtn.onclick = async () => {
    try { const msg = await invoke('transfer_start_server', { profile: state.profile, serverId: server.id }); showAlert('Success', msg); renderTransfer(); } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('tf-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Server', `Delete server "${server.id}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('transfer_delete_server', { profile: state.profile, serverId: server.id });
      showAlert('Success', msg);
      renderTransfer();
    } catch (e) { showAlert('Error', e); }
  };

  loadUsers(server.id);
}

async function loadUsers(serverId) {
  const container = document.getElementById('tf-users');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const users = await invoke('transfer_list_users', { profile: state.profile, serverId });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Username</th><th>Home Directory</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u => `<tr>
        <td>${u.name}</td><td style="font-size:0.75rem">${u.home_directory}</td>
        <td><button class="s3-action-btn tf-remove-user-btn" data-name="${u.name}">Delete</button></td>
      </tr>`).join('')}</tbody>
    </table></div>${users.length === 0 ? '<p class="empty">No users</p>' : ''}`;

    document.querySelectorAll('.tf-remove-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Delete User', `Delete user "${btn.dataset.name}"?`);
        if (!confirmed) return;
        try {
          await invoke('transfer_delete_user', { profile: state.profile, serverId, userName: btn.dataset.name });
          loadUsers(serverId);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
