import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderIam(view = 'users') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading IAM...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('profile', 'icon-md')} IAM</h2>
      <div class="tabs">
        <button class="tab ${view === 'users' ? 'active' : ''}" data-view="users">Users</button>
        <button class="tab ${view === 'roles' ? 'active' : ''}" data-view="roles">Roles</button>
        <button class="tab ${view === 'groups' ? 'active' : ''}" data-view="groups">Groups</button>
        <button class="tab ${view === 'policies' ? 'active' : ''}" data-view="policies">Policies</button>
      </div>`;

    if (view === 'users') {
      const users = await invoke('iam_list_users', { profile: state.profile });
      html += `<div class="s3-toolbar" style="margin:1rem 0"><button class="s3-toolbar-btn" id="iam-create-btn">+ Create User</button></div>
        <div class="item-grid">${users.map(u => `<div class="item-tile iam-item" data-name="${u.name}">${icon('profile', 'icon-lg')}<span class="item-name">${u.name}</span><span class="item-meta" style="font-size:0.65rem">${u.create_date}</span></div>`).join('')}${users.length === 0 ? '<p class="empty">No users</p>' : ''}</div>`;
      content.innerHTML = html;
      document.getElementById('iam-create-btn').onclick = async () => {
        const name = await showPrompt('Create User', 'User name:', '');
        if (!name) return;
        try { await invoke('iam_create_user', { profile: state.profile, userName: name }); renderIam('users'); } catch (e) { showAlert('Error', e); }
      };
      document.querySelectorAll('.iam-item').forEach(el => { el.onclick = () => renderIamUserDetail(el.dataset.name); });
    } else if (view === 'roles') {
      const roles = await invoke('iam_list_roles', { profile: state.profile });
      html += `<div class="s3-toolbar" style="margin:1rem 0"><button class="s3-toolbar-btn" id="iam-create-role-btn">+ Create Role</button></div>
        <div class="item-grid">${roles.map(r => `<div class="item-tile iam-item" data-name="${r.name}">${icon('profile', 'icon-lg')}<span class="item-name">${r.name}</span></div>`).join('')}${roles.length === 0 ? '<p class="empty">No roles</p>' : ''}</div>`;
      content.innerHTML = html;
      document.getElementById('iam-create-role-btn').onclick = async () => {
        const name = await showPrompt('Create Role', 'Role name:', '');
        if (!name) return;
        const policy = await showPrompt('Create Role', 'Trust policy JSON:', '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}');
        if (!policy) return;
        try { await invoke('iam_create_role', { profile: state.profile, roleName: name, assumeRolePolicyDocument: policy }); renderIam('roles'); } catch (e) { showAlert('Error', e); }
      };
      document.querySelectorAll('.iam-item').forEach(el => { el.onclick = () => renderIamRoleDetail(el.dataset.name); });
    } else if (view === 'groups') {
      const groups = await invoke('iam_list_groups', { profile: state.profile });
      html += `<div class="item-grid">${groups.map(g => `<div class="item-tile">${icon('profile', 'icon-lg')}<span class="item-name">${g.name}</span></div>`).join('')}${groups.length === 0 ? '<p class="empty">No groups</p>' : ''}</div>`;
      content.innerHTML = html;
    } else if (view === 'policies') {
      const policies = await invoke('iam_list_policies', { profile: state.profile });
      html += `<div class="table-container"><table>
        <thead><tr><th>Name</th><th>ARN</th><th>Attachments</th></tr></thead>
        <tbody>${policies.map(p => `<tr><td>${p.name}</td><td style="font-size:0.65rem">${p.arn}</td><td>${p.attachment_count}</td></tr>`).join('')}</tbody>
      </table></div>${policies.length === 0 ? '<p class="empty">No customer-managed policies</p>' : ''}`;
      content.innerHTML = html;
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderIam(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderIamUserDetail(userName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${userName}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="iam-attach-btn">+ Attach Policy</button>
        <button class="s3-toolbar-btn" id="iam-delete-user-btn">Delete User</button>
      </div>
    </div>
    <h3 class="section-title">Attached Policies</h3>
    <div id="iam-user-policies"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderIam('users');
  document.getElementById('iam-delete-user-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete User', `Delete user "${userName}"? This cannot be undone.`);
    if (!confirmed) return;
    try { await invoke('iam_delete_user', { profile: state.profile, userName }); renderIam('users'); } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('iam-attach-btn').onclick = async () => {
    const arn = await showPrompt('Attach Policy', 'Policy ARN:', 'arn:aws:iam::aws:policy/');
    if (!arn) return;
    try {
      await invoke('iam_attach_user_policy', { profile: state.profile, userName, policyArn: arn });
      loadUserPolicies(userName);
    } catch (e) { showAlert('Error', e); }
  };
  loadUserPolicies(userName);
}

async function loadUserPolicies(userName) {
  const container = document.getElementById('iam-user-policies');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const policies = await invoke('iam_list_attached_user_policies', { profile: state.profile, userName });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Policy</th><th>ARN</th><th>Actions</th></tr></thead>
      <tbody>${policies.map(p => `<tr><td>${p.name}</td><td style="font-size:0.65rem">${p.arn}</td><td><button class="s3-action-btn iam-detach-btn" data-arn="${p.arn}">Detach</button></td></tr>`).join('')}</tbody>
    </table></div>${policies.length === 0 ? '<p class="empty">No policies attached</p>' : ''}`;

    document.querySelectorAll('.iam-detach-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Detach Policy', 'Detach this policy?');
        if (!confirmed) return;
        try {
          await invoke('iam_detach_user_policy', { profile: state.profile, userName, policyArn: btn.dataset.arn });
          loadUserPolicies(userName);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}

async function renderIamRoleDetail(roleName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('profile', 'icon-xs')} ${roleName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="iam-delete-role-btn">Delete Role</button></div>
    </div>
    <h3 class="section-title">Attached Policies</h3>
    <div id="iam-role-policies"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderIam('roles');
  document.getElementById('iam-delete-role-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Role', `Delete role "${roleName}"? This cannot be undone.`);
    if (!confirmed) return;
    try { await invoke('iam_delete_role', { profile: state.profile, roleName }); renderIam('roles'); } catch (e) { showAlert('Error', e); }
  };

  try {
    const policies = await invoke('iam_list_attached_role_policies', { profile: state.profile, roleName });
    document.getElementById('iam-role-policies').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Policy</th><th>ARN</th></tr></thead>
      <tbody>${policies.map(p => `<tr><td>${p.name}</td><td style="font-size:0.65rem">${p.arn}</td></tr>`).join('')}</tbody>
    </table></div>${policies.length === 0 ? '<p class="empty">No policies attached</p>' : ''}`;
  } catch (e) { document.getElementById('iam-role-policies').innerHTML = formatError(e); }
}
