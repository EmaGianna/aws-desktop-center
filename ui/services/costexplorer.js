import { invoke, state, icon, formatError } from './shared.js';

export async function renderCostExplorer() {
  const content = document.getElementById('content');
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);

  content.innerHTML = `
    <h2 class="panel-title">${icon('cloudwatch', 'icon-md')} Cost Explorer</h2>
    <div class="athena-editor-toolbar" style="margin-bottom:1rem">
      <input type="text" class="dialog-input" id="ce-start" value="${start}" placeholder="Start date (YYYY-MM-DD)" style="margin:0" />
      <input type="text" class="dialog-input" id="ce-end" value="${end}" placeholder="End date (YYYY-MM-DD)" style="margin:0" />
      <button class="s3-toolbar-btn" id="ce-load-btn">Load Costs</button>
    </div>
    <div id="ce-results"></div>`;

  document.getElementById('ce-load-btn').onclick = () => loadCosts(
    document.getElementById('ce-start').value.trim(),
    document.getElementById('ce-end').value.trim()
  );
  loadCosts(start, end);
}

async function loadCosts(startDate, endDate) {
  const results = document.getElementById('ce-results');
  results.innerHTML = '<div class="loading">Loading costs...</div>';
  try {
    const costs = await invoke('ce_get_cost_by_service', { profile: state.profile, startDate, endDate });
    const total = costs.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    results.innerHTML = `
      <div class="dynamo-results-header">Total: ${total.toFixed(2)} ${costs[0]?.unit || 'USD'}</div>
      <div class="table-container"><table>
        <thead><tr><th>Service</th><th>Amount</th><th>Unit</th></tr></thead>
        <tbody>${costs.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).map(c => `<tr>
          <td>${c.service_name}</td><td>${parseFloat(c.amount).toFixed(2)}</td><td>${c.unit}</td>
        </tr>`).join('')}</tbody>
      </table></div>${costs.length === 0 ? '<p class="empty">No cost data for this period</p>' : ''}`;
  } catch (e) { results.innerHTML = formatError(e); }
}
