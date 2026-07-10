import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderIot(view = 'things') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading IoT Core...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} IoT Core</h2>
      <div class="tabs">
        <button class="tab ${view === 'things' ? 'active' : ''}" data-view="things">Things</button>
        <button class="tab ${view === 'certs' ? 'active' : ''}" data-view="certs">Certificates</button>
        <button class="tab ${view === 'policies' ? 'active' : ''}" data-view="policies">Policies</button>
      </div>`;

    if (view === 'certs') {
      const certs = await invoke('iot_list_certificates', { profile: state.profile });
      html += `<div class="table-container"><table>
        <thead><tr><th>Certificate ID</th><th>Status</th></tr></thead>
        <tbody>${certs.map(c => `<tr><td style="font-size:0.7rem">${c.id}</td><td class="rds-status-${c.status.toLowerCase()}">${c.status}</td></tr>`).join('')}</tbody>
      </table></div>${certs.length === 0 ? '<p class="empty">No certificates</p>' : ''}`;
      content.innerHTML = html;
    } else if (view === 'policies') {
      const policies = await invoke('iot_list_policies', { profile: state.profile });
      html += `<div class="item-grid">${policies.map(p => `
        <div class="item-tile"><span class="item-name">${p}</span></div>`).join('')}${policies.length === 0 ? '<p class="empty">No policies</p>' : ''}</div>`;
      content.innerHTML = html;
    } else {
      const things = await invoke('iot_list_things', { profile: state.profile });
      html += `<div class="s3-toolbar" style="margin:1rem 0"><button class="s3-toolbar-btn" id="iot-create-btn">+ Create Thing</button></div>
        <div class="item-grid">${things.map(t => `
        <div class="item-tile iot-item" data-name="${t.name}">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${t.name}</span>
          <span class="item-meta">${t.thing_type || 'No type'}</span>
        </div>`).join('')}${things.length === 0 ? '<p class="empty">No things</p>' : ''}</div>`;
      content.innerHTML = html;

      document.getElementById('iot-create-btn').onclick = async () => {
        const name = await showPrompt('Create Thing', 'Thing name:', '');
        if (!name) return;
        try {
          const msg = await invoke('iot_create_thing', { profile: state.profile, thingName: name });
          showAlert('Success', msg);
          renderIot('things');
        } catch (e) { showAlert('Error', e); }
      };
      document.querySelectorAll('.iot-item').forEach(el => {
        el.onclick = async () => {
          const confirmed = await showConfirm('Delete Thing', `Delete thing "${el.dataset.name}"?`);
          if (!confirmed) return;
          try {
            await invoke('iot_delete_thing', { profile: state.profile, thingName: el.dataset.name });
            renderIot('things');
          } catch (e) { showAlert('Error', e); }
        };
      });
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderIot(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}
