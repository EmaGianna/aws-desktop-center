import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderScheduler() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EventBridge Scheduler...</div>';
  try {
    const schedules = await invoke('scheduler_list_schedules', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} EventBridge Scheduler (${schedules.length})</h2>
      <div class="s3-toolbar" style="margin-bottom:1rem"><button class="s3-toolbar-btn" id="sched-create-btn">+ Create Schedule</button></div>
      <div class="item-grid">${schedules.map(s => `
        <div class="item-tile sched-item" data-name="${s.name}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${s.name}</span>
          <span class="item-meta">${s.group_name}</span>
          <span class="item-meta eb-state-${s.state.toLowerCase()}">${s.state}</span>
        </div>`).join('')}${schedules.length === 0 ? '<p class="empty">No schedules</p>' : ''}</div>`;

    document.getElementById('sched-create-btn').onclick = async () => {
      const name = await showPrompt('Create Schedule', 'Schedule name:', '');
      if (!name) return;
      const expr = await showPrompt('Create Schedule', 'Schedule expression (e.g. rate(5 minutes) or cron(0 12 * * ? *)):', 'rate(5 minutes)');
      if (!expr) return;
      const targetArn = await showPrompt('Create Schedule', 'Target ARN (e.g. Lambda function or SQS queue):', '');
      if (!targetArn) return;
      const roleArn = await showPrompt('Create Schedule', 'IAM Role ARN (scheduler execution role):', '');
      if (!roleArn) return;
      try {
        const msg = await invoke('scheduler_create_schedule', { profile: state.profile, name, scheduleExpression: expr, targetArn, roleArn });
        showAlert('Success', msg);
        renderScheduler();
      } catch (e) { showAlert('Error', e); }
    };

    document.querySelectorAll('.sched-item').forEach(el => {
      el.onclick = () => renderScheduleDetail(el.dataset.name);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderScheduleDetail(name) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="sched-delete-btn">Delete Schedule</button></div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderScheduler();
  document.getElementById('sched-delete-btn').onclick = async () => {
    const confirmed = await showConfirm('Delete Schedule', `Delete schedule "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await invoke('scheduler_delete_schedule', { profile: state.profile, name });
      showAlert('Success', 'Schedule deleted');
      renderScheduler();
    } catch (e) { showAlert('Error', e); }
  };
}
