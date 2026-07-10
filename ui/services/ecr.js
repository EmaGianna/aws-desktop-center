import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderEcr() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading ECR...</div>';
  try {
    const repos = await invoke('ecr_list_repositories', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} ECR Repositories (${repos.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter repositories..." id="ecr-filter" />
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="ecr-create-btn">+ Create Repository</button></div>
      <div class="item-grid">${repos.map(r => `
        <div class="item-tile ecr-item" data-name="${r.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${r.name}</span>
          <span class="item-meta">${r.tag_mutability}</span>
        </div>`).join('')}${repos.length === 0 ? '<p class="empty">No repositories</p>' : ''}</div>`;

    document.getElementById('ecr-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.ecr-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.getElementById('ecr-create-btn').onclick = async () => {
      const name = await showPrompt('Create Repository', 'Repository name:', '');
      if (!name) return;
      try {
        const msg = await invoke('ecr_create_repository', { profile: state.profile, repositoryName: name });
        showAlert('Success', msg);
        renderEcr();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.ecr-item').forEach(el => {
      el.onclick = () => renderEcrDetail(repos.find(r => r.name === el.dataset.name));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEcrDetail(repo) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${repo.name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="ecr-delete-btn">Delete Repository</button></div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Repository Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">URI</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${repo.uri}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Tag Mutability</span><span class="dynamo-value">${repo.tag_mutability}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Created</span><span class="dynamo-value">${repo.created_at}</span></div>
      </div>
    </div>
    <h3 class="section-title">Images</h3>
    <div id="ecr-images"><div class="loading">Loading images...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderEcr();
  document.getElementById('ecr-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Repository', `Delete repository "${repo.name}" and all its images? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('ecr_delete_repository', { profile: state.profile, repositoryName: repo.name });
      showAlert('Success', msg);
      renderEcr();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const images = await invoke('ecr_list_images', { profile: state.profile, repositoryName: repo.name });
    const imgDiv = document.getElementById('ecr-images');
    imgDiv.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Tags</th><th>Digest</th><th>Size</th><th>Pushed</th></tr></thead>
      <tbody>${images.map(i => `<tr>
        <td>${i.tags.join(', ') || '<untagged>'}</td>
        <td style="font-size:0.65rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${i.digest}</td>
        <td>${(i.size_bytes / 1048576).toFixed(1)} MB</td>
        <td>${i.pushed_at}</td>
      </tr>`).join('')}</tbody>
    </table></div>${images.length === 0 ? '<p class="empty">No images</p>' : ''}`;
  } catch (e) { document.getElementById('ecr-images').innerHTML = formatError(e); }
}
