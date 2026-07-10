import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderPipes() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EventBridge Pipes...</div>';
  try {
    const pipes = await invoke('pipes_list', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} EventBridge Pipes (${pipes.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="pipes-create-btn">+ Create Pipe</button></div>
      <div class="item-grid">${pipes.map(p => `
        <div class="item-tile pipe-item" data-name="${p.name}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${p.name}</span>
          <span class="item-meta">${p.desired_state}</span>
          <span class="item-meta eb-state-${p.current_state.toLowerCase()}">${p.current_state}</span>
        </div>`).join('')}${pipes.length === 0 ? '<p class="empty">No pipes</p>' : ''}</div>`;

    document.getElementById('pipes-create-btn').onclick = async () => {
      const name = await showPrompt('Create Pipe', 'Pipe name:', '');
      if (!name) return;
      const roleArn = await showPrompt('Create Pipe', 'IAM Role ARN:', '');
      if (!roleArn) return;
      const source = await showPrompt('Create Pipe', 'Source ARN (e.g. SQS/Kinesis/DynamoDB Stream):', '');
      if (!source) return;
      const target = await showPrompt('Create Pipe', 'Target ARN (e.g. Lambda/SQS/Step Functions):', '');
      if (!target) return;
      try {
        const msg = await invoke('pipes_create', { profile: state.profile, name, roleArn, source, target });
        showAlert('Success', msg);
        renderPipes();
      } catch (e) { showAlert('Error', e); }
    };
    document.querySelectorAll('.pipe-item').forEach(el => {
      el.onclick = () => renderPipeDetail(pipes.find(p => p.name === el.dataset.name));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderPipeDetail(pipe) {
  const content = document.getElementById('content');
  const isRunning = pipe.desired_state === 'RUNNING';
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${pipe.name}</span>
      <div class="s3-toolbar">
        <button class="s3-toolbar-btn" id="pipes-toggle-btn">${isRunning ? 'Stop' : 'Start'}</button>
        <button class="s3-toolbar-btn" id="pipes-delete-btn">Delete</button>
      </div>
    </div>
    <div class="dynamo-detail-grid">
      <div class="dynamo-info-card">
        <h3>Pipe Info</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Desired State</span><span class="dynamo-value">${pipe.desired_state}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Current State</span><span class="dynamo-value eb-state-${pipe.current_state.toLowerCase()}">${pipe.current_state}</span></div>
      </div>
      <div class="dynamo-info-card">
        <h3>Flow</h3>
        <div class="dynamo-info-row"><span class="dynamo-label">Source</span><span class="dynamo-value" style="font-size:0.65rem;word-break:break-all">${pipe.source}</span></div>
        <div class="dynamo-info-row"><span class="dynamo-label">Target</span><span class="dynamo-value" style="font-size:0.65rem;word-break:break-all">${pipe.target}</span></div>
      </div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderPipes();
  document.getElementById('pipes-toggle-btn').onclick = async () => {
    try {
      const msg = await invoke(isRunning ? 'pipes_stop' : 'pipes_start', { profile: state.profile, name: pipe.name });
      showAlert('Success', msg);
      renderPipes();
    } catch (e) { showAlert('Error', e); }
  };
  document.getElementById('pipes-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Pipe', `Delete pipe "${pipe.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const msg = await invoke('pipes_delete', { profile: state.profile, name: pipe.name });
      showAlert('Success', msg);
      renderPipes();
    } catch (e) { showAlert('Error', e); }
  };
}
