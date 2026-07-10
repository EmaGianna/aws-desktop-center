import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCloudFormation() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CloudFormation...</div>';
  try {
    const stacks = await invoke('cfn_list_stacks', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('glue', 'icon-md')} CloudFormation Stacks (${stacks.length})</h2>
      <div class="item-grid">${stacks.map(s => `
        <div class="item-tile cfn-item" data-name="${s.name}">
          ${icon('glue', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta glue-status-${s.status.toLowerCase()}">${s.status}</span>
        </div>`).join('')}${stacks.length === 0 ? '<p class="empty">No stacks</p>' : ''}</div>`;

    document.querySelectorAll('.cfn-item').forEach(el => {
      el.onclick = () => renderStackDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderStackDetail(stackName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('glue', 'icon-xs')} ${stackName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="cfn-delete-btn">Delete Stack</button></div>
    </div>
    <h3 class="section-title">Resources</h3>
    <div id="cfn-resources"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCloudFormation();
  document.getElementById('cfn-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Stack', `Delete stack "${stackName}"? This will delete all its resources.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('cfn_delete_stack', { profile: state.profile, stackName });
      showAlert('Success', msg);
      renderCloudFormation();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const resources = await invoke('cfn_list_stack_resources', { profile: state.profile, stackName });
    document.getElementById('cfn-resources').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Logical ID</th><th>Type</th><th>Status</th></tr></thead>
      <tbody>${resources.map(r => `<tr><td>${r.logical_id}</td><td style="font-size:0.75rem">${r.resource_type}</td><td class="glue-status-${r.status.toLowerCase()}">${r.status}</td></tr>`).join('')}</tbody>
    </table></div>${resources.length === 0 ? '<p class="empty">No resources</p>' : ''}`;
  } catch (e) { document.getElementById('cfn-resources').innerHTML = formatError(e); }
}
