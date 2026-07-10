import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderInspector2() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Inspector...</div>';
  try {
    const findings = await invoke('inspector2_list_findings', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} Inspector Findings (${findings.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem">
        <button class="s3-toolbar-btn" id="insp-enable-btn">Enable (EC2 + ECR)</button>
        <button class="s3-toolbar-btn" id="insp-disable-btn">Disable (EC2 + ECR)</button>
      </div>
      <div class="table-container"><table>
        <thead><tr><th>Title</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>${findings.map(f => `<tr>
          <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.title}</td>
          <td class="severity-${f.severity.toLowerCase()}">${f.severity}</td>
          <td>${f.status}</td>
        </tr>`).join('')}</tbody>
      </table></div>${findings.length === 0 ? '<p class="empty">No findings</p>' : ''}`;

    document.getElementById('insp-enable-btn').onclick = async () => {
      try { const msg = await invoke('inspector2_enable', { profile: state.profile }); showAlert('Success', msg); } catch (e) { showAlert('Error', e); }
    };
    document.getElementById('insp-disable-btn').onclick = async () => {
      const confirmed = await showConfirm('Disable Inspector', 'Disable Inspector2 scanning for EC2 and ECR?');
      if (!confirmed) return;
      try { const msg = await invoke('inspector2_disable', { profile: state.profile }); showAlert('Success', msg); } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}
