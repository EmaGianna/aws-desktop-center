import { invoke, state, icon, formatError } from './shared.js';

export async function renderOrganizations() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Organizations...</div>';
  try {
    const [org, accounts] = await Promise.all([
      invoke('org_describe', { profile: state.profile }).catch(() => null),
      invoke('org_list_accounts', { profile: state.profile }),
    ]);
    content.innerHTML = `
      <h2 class="panel-title">${icon('profile', 'icon-md')} Organizations</h2>
      ${org ? `<div class="dynamo-detail-grid">
        <div class="dynamo-info-card">
          <h3>Organization</h3>
          <div class="dynamo-info-row"><span class="dynamo-label">ID</span><span class="dynamo-value">${org.id}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Master Account</span><span class="dynamo-value">${org.master_account_id}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">ARN</span><span class="dynamo-value" style="font-size:0.65rem;word-break:break-all">${org.arn}</span></div>
        </div>
      </div>` : '<p class="empty">No organization found for this account (or account is not the management account)</p>'}
      <h3 class="section-title">Accounts (${accounts.length})</h3>
      <div class="item-grid">${accounts.map(a => `
        <div class="item-tile">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.email}</span>
          <span class="item-meta rds-status-${a.status.toLowerCase()}">${a.status}</span>
        </div>`).join('')}${accounts.length === 0 ? '<p class="empty">No accounts</p>' : ''}</div>`;
  } catch (e) { content.innerHTML = formatError(e); }
}
