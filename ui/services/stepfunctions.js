import { invoke, state, icon, showAlert, showConfirm, showPrompt, formatError } from './shared.js';

export async function renderStepFunctions() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Step Functions...</div>';
  try {
    const machines = await invoke('sfn_list_state_machines', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} Step Functions (${machines.length})</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter state machines..." id="sfn-filter" />
      <div class="item-grid">${machines.map(m => `
        <div class="item-tile sfn-item" data-arn="${m.arn}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${m.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${m.creation_date}</span>
        </div>`).join('')}${machines.length === 0 ? '<p class="empty">No state machines</p>' : ''}</div>`;

    document.getElementById('sfn-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.sfn-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.sfn-item').forEach(el => {
      el.onclick = () => renderStateMachineDetail(el.dataset.arn, machines.find(m => m.arn === el.dataset.arn));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderStateMachineDetail(arn, machine) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${machine.name}</span>
      <div class="s3-toolbar"><button class="s3-toolbar-btn" id="sfn-start-btn">Start Execution</button></div>
    </div>
    <h3 class="section-title">Executions</h3>
    <div id="sfn-executions"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderStepFunctions();
  document.getElementById('sfn-start-btn').onclick = async () => {
    const input = await showPrompt('Start Execution', 'Input JSON (optional):', '{}');
    if (input === null) return;
    try {
      const execArn = await invoke('sfn_start_execution', { profile: state.profile, stateMachineArn: arn, input });
      showAlert('Execution Started', execArn);
      loadExecutions(arn);
    } catch (e) { showAlert('Error', e); }
  };

  loadExecutions(arn);
}

async function loadExecutions(stateMachineArn) {
  const container = document.getElementById('sfn-executions');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const executions = await invoke('sfn_list_executions', { profile: state.profile, stateMachineArn });
    container.innerHTML = `<div class="table-container"><table>
      <thead><tr><th>Name</th><th>Status</th><th>Started</th><th>Stopped</th><th>Actions</th></tr></thead>
      <tbody>${executions.map(e => `<tr>
        <td>${e.name}</td>
        <td class="glue-status-${e.status.toLowerCase()}">${e.status}</td>
        <td style="font-size:0.7rem">${e.start_date}</td>
        <td style="font-size:0.7rem">${e.stop_date || '-'}</td>
        <td>
          <button class="s3-action-btn sfn-view-btn" data-arn="${e.arn}">View</button>
          ${e.status === 'RUNNING' ? `<button class="s3-action-btn sfn-stop-btn" data-arn="${e.arn}">Stop</button>` : ''}
        </td>
      </tr>`).join('')}</tbody>
    </table></div>${executions.length === 0 ? '<p class="empty">No executions</p>' : ''}
    <div id="sfn-exec-detail"></div>`;

    document.querySelectorAll('.sfn-view-btn').forEach(btn => {
      btn.onclick = async () => {
        const detail = document.getElementById('sfn-exec-detail');
        detail.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const d = await invoke('sfn_describe_execution', { profile: state.profile, executionArn: btn.dataset.arn });
          detail.innerHTML = `
            <div class="dynamo-info-card">
              <h3>Execution: ${d.status}</h3>
              <h4 class="s3-section-label">Input</h4>
              <pre class="glue-script-code">${d.input}</pre>
              <h4 class="s3-section-label">Output</h4>
              <pre class="glue-script-code">${d.output || '(no output yet)'}</pre>
            </div>`;
        } catch (e) { detail.innerHTML = formatError(e); }
      };
    });

    document.querySelectorAll('.sfn-stop-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirm('Stop Execution', 'Stop this execution?');
        if (!confirmed) return;
        try {
          await invoke('sfn_stop_execution', { profile: state.profile, executionArn: btn.dataset.arn });
          loadExecutions(stateMachineArn);
        } catch (e) { showAlert('Error', e); }
      };
    });
  } catch (e) { container.innerHTML = formatError(e); }
}
