import { invoke, state, icon, showAlert, formatError } from './shared.js';

export async function renderRdsData() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2 class="panel-title">${icon('rds', 'icon-md')} RDS Data API</h2>
    <p class="item-meta" style="margin-bottom:1rem">Query an Aurora Serverless cluster without managing a persistent DB connection.</p>
    <div class="dynamo-info-card" style="margin-bottom:1rem">
      <div class="athena-editor-toolbar" style="flex-direction:column;align-items:stretch;gap:0.6rem">
        <input type="text" class="dialog-input" id="rdsdata-resource-arn" placeholder="Cluster (resource) ARN" style="margin:0" />
        <input type="text" class="dialog-input" id="rdsdata-secret-arn" placeholder="Secrets Manager secret ARN" style="margin:0" />
        <input type="text" class="dialog-input" id="rdsdata-database" placeholder="Database name" style="margin:0" />
      </div>
    </div>
    <div class="athena-query-box">
      <textarea class="athena-textarea" id="rdsdata-sql" placeholder="SELECT * FROM ..." rows="5"></textarea>
      <button class="s3-toolbar-btn" id="rdsdata-run-btn">Run Query</button>
    </div>
    <div id="rdsdata-results"></div>`;

  document.getElementById('rdsdata-run-btn').onclick = async () => {
    const resourceArn = document.getElementById('rdsdata-resource-arn').value.trim();
    const secretArn = document.getElementById('rdsdata-secret-arn').value.trim();
    const database = document.getElementById('rdsdata-database').value.trim();
    const sql = document.getElementById('rdsdata-sql').value.trim();
    if (!resourceArn || !secretArn || !database || !sql) {
      showAlert('Missing fields', 'Resource ARN, Secret ARN, Database and SQL are all required');
      return;
    }
    const results = document.getElementById('rdsdata-results');
    results.innerHTML = '<div class="loading">Executing...</div>';
    try {
      const data = await invoke('rdsdata_execute_statement', { profile: state.profile, resourceArn, secretArn, database, sql });
      if (data.rows.length === 0) {
        results.innerHTML = `<p class="empty">No rows returned. Records updated: ${data.records_updated}</p>`;
        return;
      }
      results.innerHTML = `
        <div class="dynamo-results-header">${data.rows.length} rows | ${data.records_updated} records updated</div>
        <div class="table-container"><table>
          <tbody>${data.rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
    } catch (e) { results.innerHTML = formatError(e); }
  };
}
