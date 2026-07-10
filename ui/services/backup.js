import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderBackup(view = 'vaults') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading AWS Backup...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('s3', 'icon-md')} AWS Backup</h2>
      <div class="tabs">
        <button class="tab ${view === 'vaults' ? 'active' : ''}" data-view="vaults">Backup Vaults</button>
        <button class="tab ${view === 'plans' ? 'active' : ''}" data-view="plans">Backup Plans</button>
      </div>`;

    if (view === 'plans') {
      const plans = await invoke('backup_list_plans', { profile: state.profile });
      html += `<div class="table-container"><table>
        <thead><tr><th>Name</th><th>ID</th><th>Created</th></tr></thead>
        <tbody>${plans.map(p => `<tr><td>${p.name}</td><td style="font-size:0.7rem">${p.id}</td><td style="font-size:0.7rem">${p.creation_date}</td></tr>`).join('')}</tbody>
      </table></div>${plans.length === 0 ? '<p class="empty">No backup plans</p>' : ''}`;
      content.innerHTML = html;
    } else {
      const vaults = await invoke('backup_list_vaults', { profile: state.profile });
      html += `<div class="item-grid">${vaults.map(v => `
        <div class="item-tile backup-vault-item" data-name="${v.name}">
          ${icon('s3', 'icon-lg')}
          <span class="item-name">${v.name}</span>
          <span class="item-meta">${v.recovery_points} recovery points</span>
        </div>`).join('')}${vaults.length === 0 ? '<p class="empty">No backup vaults</p>' : ''}</div>`;
      content.innerHTML = html;

      document.querySelectorAll('.backup-vault-item').forEach(el => {
        el.onclick = () => renderVaultDetail(el.dataset.name);
      });
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderBackup(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderVaultDetail(vaultName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('s3', 'icon-xs')} ${vaultName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="backup-start-btn">Start On-Demand Backup</button></div>
    </div>
    <h3 class="section-title">Recovery Points</h3>
    <div id="backup-recovery-points"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderBackup('vaults');
  document.getElementById('backup-start-btn').onclick = async () => {
    const resourceArn = await showPrompt('Start Backup', 'Resource ARN to back up:', '');
    if (!resourceArn) return;
    const iamRoleArn = await showPrompt('Start Backup', 'IAM Role ARN (with backup permissions):', '');
    if (!iamRoleArn) return;
    try {
      const jobId = await invoke('backup_start_job', { profile: state.profile, backupVaultName: vaultName, resourceArn, iamRoleArn });
      showAlert('Backup Started', 'Job ID: ' + jobId);
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const points = await invoke('backup_list_recovery_points', { profile: state.profile, backupVaultName: vaultName });
    document.getElementById('backup-recovery-points').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>ARN</th><th>Resource Type</th><th>Status</th><th>Size</th><th>Created</th></tr></thead>
      <tbody>${points.map(p => `<tr>
        <td style="font-size:0.65rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">${p.arn}</td>
        <td>${p.resource_type}</td><td>${p.status}</td><td>${(p.backup_size_bytes / 1048576).toFixed(1)} MB</td>
        <td style="font-size:0.7rem">${p.creation_date}</td>
      </tr>`).join('')}</tbody>
    </table></div>${points.length === 0 ? '<p class="empty">No recovery points</p>' : ''}`;
  } catch (e) { document.getElementById('backup-recovery-points').innerHTML = formatError(e); }
}
