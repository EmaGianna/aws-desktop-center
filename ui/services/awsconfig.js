import { invoke, state, icon, formatError } from './shared.js';

export async function renderAwsConfig() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading AWS Config...</div>';
  try {
    const rules = await invoke('awsconfig_list_rules', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} AWS Config Rules (${rules.length})</h2>
      <div class="table-container"><table>
        <thead><tr><th>Rule Name</th><th>State</th><th>Compliance</th></tr></thead>
        <tbody>${rules.map(r => `<tr>
          <td>${r.name}</td><td>${r.state}</td>
          <td class="${r.compliance === 'COMPLIANT' ? 'glue-status-succeeded' : r.compliance === 'NON_COMPLIANT' ? 'glue-status-failed' : ''}">${r.compliance || 'N/A'}</td>
        </tr>`).join('')}</tbody>
      </table></div>${rules.length === 0 ? '<p class="empty">No Config rules</p>' : ''}`;
  } catch (e) { content.innerHTML = formatError(e); }
}
