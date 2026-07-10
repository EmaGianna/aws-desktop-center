import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderCodePipeline() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CodePipeline...</div>';
  try {
    const pipelines = await invoke('codepipeline_list_pipelines', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('lambda', 'icon-md')} CodePipeline (${pipelines.length})</h2>
      <div class="item-grid">${pipelines.map(p => `
        <div class="item-tile cp-item" data-name="${p.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${p.name}</span>
          <span class="item-meta" style="font-size:0.65rem">Updated ${p.updated}</span>
        </div>`).join('')}${pipelines.length === 0 ? '<p class="empty">No pipelines</p>' : ''}</div>`;

    document.querySelectorAll('.cp-item').forEach(el => {
      el.onclick = () => renderPipelineDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderPipelineDetail(name) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="cp-start-btn">Start Execution</button>
        <button class="s3-toolbar-btn" id="cp-delete-btn">Delete Pipeline</button>
      </div>
    </div>
    <h3 class="section-title">Stages</h3>
    <div id="cp-stages"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderCodePipeline();
  document.getElementById('cp-start-btn').onclick = async () => {
    try {
      const execId = await invoke('codepipeline_start_execution', { profile: state.profile, name });
      showAlert('Execution Started', execId);
      renderPipelineDetail(name);
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('cp-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Pipeline', `Delete pipeline "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('codepipeline_delete_pipeline', { profile: state.profile, name });
      showAlert('Success', msg);
      renderCodePipeline();
    } catch (e) { showAlert('Error', e); }
  };

  try {
    const stages = await invoke('codepipeline_get_state', { profile: state.profile, name });
    document.getElementById('cp-stages').innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Stage</th><th>Status</th></tr></thead>
      <tbody>${stages.map(s => `<tr><td>${s.stage_name}</td><td class="glue-status-${s.status.toLowerCase()}">${s.status || 'N/A'}</td></tr>`).join('')}</tbody>
    </table></div>${stages.length === 0 ? '<p class="empty">No stages</p>' : ''}`;
  } catch (e) { document.getElementById('cp-stages').innerHTML = formatError(e); }
}
