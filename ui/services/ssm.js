import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderSsm() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Parameter Store...</div>';
  try {
    const params = await invoke('ssm_list_parameters', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} SSM Parameter Store (${params.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter parameters..." id="ssm-filter" />
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="ssm-create-btn">+ Create Parameter</button></div>
      <div class="table-container"><table>
        <thead><tr><th>Name</th><th>Type</th><th>Version</th><th>Modified</th><th>Actions</th></tr></thead>
        <tbody>${params.map(p => `<tr class="ssm-row" data-name="${p.name}">
          <td>${p.name}</td><td>${p.param_type}</td><td>${p.version}</td><td style="font-size:0.7rem">${p.last_modified_date}</td>
          <td>
            <button class="s3-action-btn ssm-view-btn" data-name="${p.name}">View</button>
            <button class="s3-action-btn ssm-delete-btn" data-name="${p.name}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>${params.length === 0 ? '<p class="empty">No parameters</p>' : ''}
      <div id="ssm-value"></div>`;

    document.getElementById('ssm-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.ssm-row').forEach(row => {
        row.style.display = row.dataset.name.toLowerCase().includes(filter) ? '' : 'none';
      });
    };

    document.getElementById('ssm-create-btn').onclick = async () => {
      const name = await showPrompt('Create Parameter', 'Parameter name (e.g. /app/config/key):', '');
      if (!name) return;
      const value = await showPrompt('Create Parameter', 'Value:', '');
      if (value === null) return;
      const isSecure = await showConfirm('Secure String?', 'OK = SecureString (encrypted), Cancel = plain String');
      try {
        await invoke('ssm_put_parameter', { profile: state.profile, name, value, paramType: isSecure ? 'SecureString' : 'String' });
        showAlert('Success', 'Parameter saved');
        renderSsm();
      } catch (e) { showAlert('Error', e); }
    };

    document.querySelectorAll('.ssm-view-btn').forEach(btn => {
      btn.onclick = async () => {
        const valueDiv = document.getElementById('ssm-value');
        valueDiv.innerHTML = '<div class="loading">Loading value...</div>';
        try {
          const value = await invoke('ssm_get_parameter', { profile: state.profile, name: btn.dataset.name });
          valueDiv.innerHTML = `<div class="dynamo-info-card"><h3>${btn.dataset.name}</h3><pre class="glue-script-code">${value}</pre></div>`;
        } catch (e) { valueDiv.innerHTML = formatError(e); }
      };
    });

    document.querySelectorAll('.ssm-delete-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Delete Parameter', `Delete "${btn.dataset.name}"?`);
        if (!confirmed) return;
        try {
          await invoke('ssm_delete_parameter', { profile: state.profile, name: btn.dataset.name });
          renderSsm();
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}
