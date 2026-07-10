import { invoke, state, icon, formatError } from './shared.js';

export async function renderAccount() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Account...</div>';
  try {
    const [contact, regions] = await Promise.all([
      invoke('account_get_contact_info', { profile: state.profile }).catch(() => null),
      invoke('account_list_regions', { profile: state.profile }),
    ]);
    content.innerHTML = `
      <h2 class="panel-title">${icon('profile', 'icon-md')} Account</h2>
      ${contact ? `<div class="dynamo-detail-grid">
        <div class="dynamo-info-card">
          <h3>Contact Information</h3>
          <div class="dynamo-info-row"><span class="dynamo-label">Name</span><span class="dynamo-value">${contact.full_name}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Company</span><span class="dynamo-value">${contact.company_name}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Address</span><span class="dynamo-value">${contact.address_line1}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">City</span><span class="dynamo-value">${contact.city}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Country</span><span class="dynamo-value">${contact.country_code}</span></div>
        </div>
      </div>` : ''}
      <h3 class="section-title">Regions (${regions.length})</h3>
      <div class="table-container"><table>
        <thead><tr><th>Region</th><th>Status</th></tr></thead>
        <tbody>${regions.map(r => `<tr><td>${r.name}</td><td>${r.status}</td></tr>`).join('')}</tbody>
      </table></div>${regions.length === 0 ? '<p class="empty">No regions</p>' : ''}`;
  } catch (e) { content.innerHTML = formatError(e); }
}
