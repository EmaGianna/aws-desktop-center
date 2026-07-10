import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderWaf(view = 'webacls') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading WAF...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('profile', 'icon-md')} WAF v2</h2>
      <div class="tabs">
        <button class="tab ${view === 'webacls' ? 'active' : ''}" data-view="webacls">Web ACLs</button>
        <button class="tab ${view === 'ipsets' ? 'active' : ''}" data-view="ipsets">IP Sets</button>
      </div>`;

    if (view === 'ipsets') {
      const ipsets = await invoke('waf_list_ip_sets', { profile: state.profile, scope: 'REGIONAL' });
      html += `<div class="s3-toolbar" style="margin:1rem 0"><button class="s3-toolbar-btn" id="waf-create-ipset-btn">+ Create IP Set</button></div>
        <div class="item-grid">${ipsets.map(s => `
        <div class="item-tile waf-ipset-item" data-id="${s.id}" data-name="${s.name}">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${s.name}</span>
        </div>`).join('')}${ipsets.length === 0 ? '<p class="empty">No IP sets (regional scope)</p>' : ''}</div>`;
      content.innerHTML = html;

      document.getElementById('waf-create-ipset-btn').onclick = async () => {
        const name = await showPrompt('Create IP Set', 'Name:', '');
        if (!name) return;
        const addressesRaw = await showPrompt('Create IP Set', 'CIDR addresses (comma-separated, e.g. 1.2.3.4/32,5.6.7.0/24):', '');
        if (addressesRaw === null) return;
        const addresses = addressesRaw.split(',').map(a => a.trim()).filter(Boolean);
        try {
          await invoke('waf_create_ip_set', { profile: state.profile, name, scope: 'REGIONAL', addresses });
          showAlert('Success', 'IP set created');
          renderWaf('ipsets');
        } catch (e) { showAlert('Error', e); }
      };
      document.querySelectorAll('.waf-ipset-item').forEach(el => {
        el.onclick = async () => {
          const confirmed = await showConfirm('Delete IP Set', `Delete IP set "${el.dataset.name}"?`);
          if (!confirmed) return;
          try {
            await invoke('waf_delete_ip_set', { profile: state.profile, name: el.dataset.name, scope: 'REGIONAL', id: el.dataset.id });
            renderWaf('ipsets');
          } catch (e) { showAlert('Error', e); }
        };
      });
    } else {
      const webAcls = await invoke('waf_list_web_acls', { profile: state.profile, scope: 'REGIONAL' });
      html += `<div class="item-grid">${webAcls.map(w => `
        <div class="item-tile">
          ${icon('profile', 'icon-lg')}
          <span class="item-name">${w.name}</span>
          <span class="item-meta">${w.description}</span>
        </div>`).join('')}${webAcls.length === 0 ? '<p class="empty">No Web ACLs (regional scope)</p>' : ''}</div>`;
      content.innerHTML = html;
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderWaf(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}
