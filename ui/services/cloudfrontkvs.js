import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderCfKvs() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CloudFront KeyValueStore...</div>';
  try {
    const stores = await invoke('cfkvs_list_stores', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} CloudFront KeyValueStore (${stores.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="cfkvs-create-btn">+ Create Store</button></div>
      <div class="item-grid">${stores.map(s => `
        <div class="item-tile">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${s.id}</span>
        </div>`).join('')}${stores.length === 0 ? '<p class="empty">No key value stores</p>' : ''}</div>`;

    document.getElementById('cfkvs-create-btn').onclick = async () => {
      const name = await showPrompt('Create Store', 'Store name:', '');
      if (!name) return;
      try {
        const msg = await invoke('cfkvs_create_store', { profile: state.profile, name });
        showAlert('Success', msg);
        renderCfKvs();
      } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}
