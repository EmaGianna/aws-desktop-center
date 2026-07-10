import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderResourceGroupsTagging() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Resource Groups Tagging...</div>';
  try {
    const resources = await invoke('rgt_list_resources', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} Tagged Resources (${resources.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter by ARN or tag value..." id="rgt-filter" />
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="rgt-tag-btn">Tag Resources</button></div>
      <div class="table-container"><table>
        <thead><tr><th>ARN</th><th>Tags</th></tr></thead>
        <tbody>${resources.map(r => `<tr class="rgt-row">
          <td style="font-size:0.65rem;max-width:350px;overflow:hidden;text-overflow:ellipsis">${r.arn}</td>
          <td style="font-size:0.7rem">${Object.entries(r.tags).map(([k, v]) => `${k}=${v}`).join(', ')}</td>
        </tr>`).join('')}</tbody>
      </table></div>${resources.length === 0 ? '<p class="empty">No tagged resources found</p>' : ''}`;

    document.getElementById('rgt-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.rgt-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };

    document.getElementById('rgt-tag-btn').onclick = async () => {
      const arnsRaw = await showPrompt('Tag Resources', 'Resource ARNs (comma-separated):', '');
      if (!arnsRaw) return;
      const key = await showPrompt('Tag Resources', 'Tag key:', '');
      if (!key) return;
      const value = await showPrompt('Tag Resources', 'Tag value:', '');
      if (value === null) return;
      const arns = arnsRaw.split(',').map(a => a.trim()).filter(Boolean);
      try {
        const msg = await invoke('rgt_tag_resources', { profile: state.profile, resourceArns: arns, key, value });
        showAlert('Success', msg);
        renderResourceGroupsTagging();
      } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}
