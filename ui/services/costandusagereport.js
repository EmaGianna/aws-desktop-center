import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCur() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Cost & Usage Reports...</div>';
  try {
    const reports = await invoke('cur_list_reports', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} Cost & Usage Reports (${reports.length})</h2>
      <div class="table-container"><table>
        <thead><tr><th>Name</th><th>Time Unit</th><th>Format</th><th>S3 Bucket</th><th>Actions</th></tr></thead>
        <tbody>${reports.map(r => `<tr>
          <td>${r.name}</td><td>${r.time_unit}</td><td>${r.format}</td><td style="font-size:0.75rem">${r.s3_bucket}</td>
          <td><button class="s3-action-btn cur-delete-btn" data-name="${r.name}">Delete</button></td>
        </tr>`).join('')}</tbody>
      </table></div>${reports.length === 0 ? '<p class="empty">No report definitions</p>' : ''}`;

    document.querySelectorAll('.cur-delete-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Delete Report', `Delete report definition "${btn.dataset.name}"?`);
        if (!confirmed) return;
        try {
          const msg = await invoke('cur_delete_report', { profile: state.profile, reportName: btn.dataset.name });
          showAlert('Success', msg);
          renderCur();
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { content.innerHTML = formatError(e); }
}
