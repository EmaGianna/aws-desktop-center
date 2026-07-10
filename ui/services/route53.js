import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderRoute53() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Route 53...</div>';
  try {
    const zones = await invoke('route53_list_zones', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} Route 53 Hosted Zones (${zones.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="r53-create-btn">+ Create Hosted Zone</button></div>
      <div class="item-grid">${zones.map(z => `
        <div class="item-tile r53-item" data-id="${z.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${z.name}</span>
          <span class="item-meta">${z.record_count} records</span>
        </div>`).join('')}${zones.length === 0 ? '<p class="empty">No hosted zones</p>' : ''}</div>`;

    document.getElementById('r53-create-btn').onclick = async () => {
      const name = await showPrompt('Create Hosted Zone', 'Domain name:', '');
      if (!name) return;
      try {
        const id = await invoke('route53_create_zone', { profile: state.profile, name });
        showAlert('Success', 'Hosted zone created: ' + id);
        renderRoute53();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.r53-item').forEach(el => {
      el.onclick = () => renderZoneDetail(el.dataset.id, zones.find(z => z.id === el.dataset.id).name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderZoneDetail(zoneId, zoneName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${zoneName}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="r53-upsert-btn">+ Add/Update Record</button>
        <button class="s3-toolbar-btn" id="r53-delete-btn">Delete Zone</button>
      </div>
    </div>
    <h3 class="section-title">Records</h3>
    <div id="r53-records"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderRoute53();
  document.getElementById('r53-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Hosted Zone', `Delete "${zoneName}"? All records must be cleaned up first (except NS/SOA).`);
    if (!confirmed) return;
    try {
      await invoke('route53_delete_zone', { profile: state.profile, zoneId });
      showAlert('Success', 'Hosted zone deleted');
      renderRoute53();
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('r53-upsert-btn').onclick = async () => {
    const name = await showPrompt('Add/Update Record', 'Record name (e.g. www.example.com):', '');
    if (!name) return;
    const recordType = await showPrompt('Add/Update Record', 'Type (A, CNAME, TXT, MX, ...):', 'A');
    if (!recordType) return;
    const value = await showPrompt('Add/Update Record', 'Value (e.g. 1.2.3.4):', '');
    if (!value) return;
    const ttl = await showPrompt('Add/Update Record', 'TTL (seconds):', '300');
    if (!ttl) return;
    try {
      const msg = await invoke('route53_upsert_record', { profile: state.profile, zoneId, name, recordType, value, ttl: parseInt(ttl, 10) });
      showAlert('Success', msg);
      loadRecords(zoneId);
    } catch (e) { showAlert('Error', e); }
  };

  loadRecords(zoneId);
}

async function loadRecords(zoneId) {
  const container = document.getElementById('r53-records');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const records = await invoke('route53_list_records', { profile: state.profile, zoneId });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Name</th><th>Type</th><th>TTL</th><th>Values</th></tr></thead>
      <tbody>${records.map(r => `<tr>
        <td>${r.name}</td><td>${r.record_type}</td><td>${r.ttl}</td>
        <td style="font-size:0.75rem">${r.values.join(', ')}</td>
      </tr>`).join('')}</tbody>
    </table></div>${records.length === 0 ? '<p class="empty">No records</p>' : ''}`;
  } catch (e) { container.innerHTML = formatError(e); }
}
