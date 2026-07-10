import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderCognito() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Cognito...</div>';
  try {
    const pools = await invoke('cognito_list_user_pools', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} Cognito User Pools (${pools.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="cog-create-btn">+ Create User Pool</button></div>
      <div class="item-grid">${pools.map(p => `
        <div class="item-tile cog-item" data-id="${p.id}">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${p.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${p.creation_date}</span>
        </div>`).join('')}${pools.length === 0 ? '<p class="empty">No user pools</p>' : ''}</div>`;

    document.getElementById('cog-create-btn').onclick = async () => {
      const name = await showPrompt('Create User Pool', 'Pool name:', '');
      if (!name) return;
      try {
        const id = await invoke('cognito_create_user_pool', { profile: state.profile, poolName: name });
        showAlert('Success', 'User pool created: ' + id);
        renderCognito();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.cog-item').forEach(el => {
      el.onclick = () => renderPoolDetail(el.dataset.id, pools.find(p => p.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderPoolDetail(poolId, poolName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${poolName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="cog-delete-btn">Delete Pool</button></div>
    </div>
    <h3 class="section-title">Users</h3>
    <div id="cog-users"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCognito();
  document.getElementById('cog-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete User Pool', `Delete "${poolName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await invoke('cognito_delete_user_pool', { profile: state.profile, userPoolId: poolId });
      showAlert('Success', 'User pool deleted');
      renderCognito();
    } catch (e) { showAlert('Error', e); }
  };

  loadUsers(poolId);
}

async function loadUsers(poolId) {
  const container = document.getElementById('cog-users');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const users = await invoke('cognito_list_users', { profile: state.profile, userPoolId: poolId });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Username</th><th>Status</th><th>Enabled</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u => `<tr>
        <td>${u.username}</td><td>${u.status}</td><td>${u.enabled ? 'Yes' : 'No'}</td><td style="font-size:0.7rem">${u.create_date}</td>
        <td>
          ${u.enabled ? `<button class="s3-action-btn cog-disable-btn" data-name="${u.username}">Disable</button>` : `<button class="s3-action-btn cog-enable-btn" data-name="${u.username}">Enable</button>`}
          <button class="s3-action-btn cog-delete-user-btn" data-name="${u.username}">Delete</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>${users.length === 0 ? '<p class="empty">No users</p>' : ''}`;

    document.querySelectorAll('.cog-enable-btn').forEach(btn => {
      btn.onclick = async () => { try { await invoke('cognito_enable_user', { profile: state.profile, userPoolId: poolId, username: btn.dataset.name }); loadUsers(poolId); } catch (e) { showAlert('Error', e); } };
    });
    document.querySelectorAll('.cog-disable-btn').forEach(btn => {
      btn.onclick = async () => { try { await invoke('cognito_disable_user', { profile: state.profile, userPoolId: poolId, username: btn.dataset.name }); loadUsers(poolId); } catch (e) { showAlert('Error', e); } };
    });
    document.querySelectorAll('.cog-delete-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Delete User', `Delete user "${btn.dataset.name}"?`);
        if (!confirmed) return;
        try { await invoke('cognito_delete_user', { profile: state.profile, userPoolId: poolId, username: btn.dataset.name }); loadUsers(poolId); } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
