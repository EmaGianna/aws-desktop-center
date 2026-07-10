import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderBatch(view = 'queues') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Batch...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('lambda', 'icon-md')} AWS Batch</h2>
      <div class="tabs">
        <button class="tab ${view === 'queues' ? 'active' : ''}" data-view="queues">Job Queues</button>
        <button class="tab ${view === 'envs' ? 'active' : ''}" data-view="envs">Compute Environments</button>
      </div>`;

    if (view === 'envs') {
      const envs = await invoke('batch_list_compute_environments', { profile: state.profile });
      html += `<div class="item-grid">${envs.map(e => `
        <div class="item-tile">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${e.name}</span>
          <span class="item-meta">${e.state}</span>
          <span class="item-meta rds-status-${e.status.toLowerCase()}">${e.status}</span>
        </div>`).join('')}${envs.length === 0 ? '<p class="empty">No compute environments</p>' : ''}</div>`;
      content.innerHTML = html;
    } else {
      const queues = await invoke('batch_list_job_queues', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter queues..." id="batch-filter" />
        <div class="item-grid">${queues.map(q => `
        <div class="item-tile batch-queue-item" data-name="${q.name}">
          ${icon('lambda', 'icon-lg')}
          <span class="item-name">${q.name}</span>
          <span class="item-meta">Priority ${q.priority}</span>
          <span class="item-meta rds-status-${q.status.toLowerCase()}">${q.status}</span>
        </div>`).join('')}${queues.length === 0 ? '<p class="empty">No job queues</p>' : ''}</div>`;
      content.innerHTML = html;

      document.getElementById('batch-filter').oninput = (e) => {
        const filter = e.target.value.toLowerCase();
        document.querySelectorAll('.batch-queue-item').forEach(el => {
          el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
      };
      document.querySelectorAll('.batch-queue-item').forEach(el => {
        el.onclick = () => renderBatchQueueDetail(el.dataset.name);
      });
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderBatch(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderBatchQueueDetail(queueName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('lambda', 'icon-xs')} ${queueName}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="batch-submit-btn">Submit Job</button></div>
    </div>
    <div id="batch-jobs"><div class="loading">Loading jobs...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderBatch('queues');
  document.getElementById('batch-submit-btn').onclick = async () => {
    const jobName = await showPrompt('Submit Job', 'Job name:', '');
    if (!jobName) return;
    const jobDefinition = await showPrompt('Submit Job', 'Job definition (name or name:revision):', '');
    if (!jobDefinition) return;
    try {
      const jobId = await invoke('batch_submit_job', { profile: state.profile, jobName, jobQueue: queueName, jobDefinition });
      showAlert('Job Submitted', 'Job ID: ' + jobId);
      loadBatchJobs(queueName);
    } catch (e) { showAlert('Error', e); }
  };

  loadBatchJobs(queueName);
}

async function loadBatchJobs(queueName) {
  const container = document.getElementById('batch-jobs');
  container.innerHTML = '<div class="loading">Loading jobs...</div>';
  try {
    const jobs = await invoke('batch_list_jobs', { profile: state.profile, jobQueue: queueName });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Name</th><th>Job ID</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${jobs.map(j => `<tr>
        <td>${j.name}</td>
        <td style="font-size:0.7rem">${j.id}</td>
        <td class="glue-status-${j.status.toLowerCase()}">${j.status}</td>
        <td>
          <button class="s3-action-btn batch-cancel-btn" data-id="${j.id}">Cancel</button>
          <button class="s3-action-btn batch-terminate-btn" data-id="${j.id}">Terminate</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>${jobs.length === 0 ? '<p class="empty">No jobs</p>' : ''}`;

    document.querySelectorAll('.batch-cancel-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Cancel Job', `Cancel job ${btn.dataset.id}?`);
        if (!confirmed) return;
        try { await invoke('batch_cancel_job', { profile: state.profile, jobId: btn.dataset.id }); loadBatchJobs(queueName); } catch (e) { showAlert('Error', e); }
      };
    });
    document.querySelectorAll('.batch-terminate-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Terminate Job', `Terminate job ${btn.dataset.id}?`);
        if (!confirmed) return;
        try { await invoke('batch_terminate_job', { profile: state.profile, jobId: btn.dataset.id }); loadBatchJobs(queueName); } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
