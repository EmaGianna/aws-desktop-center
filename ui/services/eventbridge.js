import { invoke, state, icon, showAlert, showConfirm, formatError } from './shared.js';

export async function renderEventBridge(busName) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading EventBridge...</div>';
  try {
    if (!busName) {
      const buses = await invoke('eb_list_buses', { profile: state.profile });
      content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} EventBridge</h2>
        <input type="text" class="s3-filter-input" placeholder="Filter buses..." id="eb-filter" />
        <div class="item-grid">${buses.map(b => `<div class="item-tile eb-item" data-bus="${b.name}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${b.name}</span>
          <span class="item-meta" style="font-size:0.65rem;word-break:break-all">${b.arn}</span>
        </div>`).join('')}${buses.length === 0 ? '<p class="empty">No event buses</p>' : ''}</div>`;
      document.getElementById('eb-filter').oninput = (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.eb-item').forEach(el => { el.style.display = el.dataset.bus.toLowerCase().includes(f) ? '' : 'none'; });
      };
      document.querySelectorAll('[data-bus]').forEach(el => { el.onclick = () => renderEventBridge(el.dataset.bus); });
    } else {
      const rules = await invoke('eb_list_rules', { profile: state.profile, busName });
      content.innerHTML = `
        <div class="breadcrumb">
          <button class="back-btn">← Back</button>
          <span class="path-text">${icon('eventbridge', 'icon-xs')} ${busName}</span>
          <div class="s3-toolbar">
            <button class="s3-toolbar-btn" id="eb-send-event-btn">Send Test Event</button>
          </div>
        </div>
        <input type="text" class="s3-filter-input" placeholder="Filter rules..." id="eb-rule-filter" />
        <div class="item-grid">${rules.map(r => `<div class="item-tile eb-rule-item" data-rule='${JSON.stringify(r).replace(/'/g, "&#39;")}'>
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${r.name}</span>
          <span class="item-meta">${r.schedule || 'Event pattern'}</span>
          <span class="item-meta eb-state-${r.state.toLowerCase()}">${r.state}</span>
        </div>`).join('')}${rules.length === 0 ? '<p class="empty">No rules</p>' : ''}</div>`;

      document.querySelector('.back-btn').onclick = () => renderEventBridge();
      document.getElementById('eb-rule-filter').oninput = (e) => {
        const f = e.target.value.toLowerCase();
        document.querySelectorAll('.eb-rule-item').forEach(el => {
          el.style.display = el.querySelector('.item-name').textContent.toLowerCase().includes(f) ? '' : 'none';
        });
      };
      document.querySelectorAll('.eb-rule-item').forEach(el => {
        el.onclick = () => renderEbRuleDetail(JSON.parse(el.dataset.rule));
      });
      document.getElementById('eb-send-event-btn').onclick = () => renderEbSendEvent(busName);
    }
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEbRuleDetail(rule) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading rule...</div>';
  try {
    const targets = await invoke('eb_list_targets', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
    const isEnabled = !rule.state.toUpperCase().includes('DISABLED');
    content.innerHTML = `
      <div class="breadcrumb">
        <button class="back-btn">← Back</button>
        <span class="path-text">${icon('eventbridge', 'icon-xs')} Rule: ${rule.name}</span>
        <div class="s3-toolbar">
          <button class="s3-toolbar-btn" id="eb-toggle-rule">${isEnabled ? 'Disable Rule' : 'Enable Rule'}</button>
        </div>
      </div>
      <div class="dynamo-detail-grid">
        <div class="dynamo-info-card">
          <h3>Rule Config</h3>
          <div class="dynamo-info-row"><span class="dynamo-label">State</span><span class="dynamo-value eb-state-${rule.state.toLowerCase()}">${rule.state}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">Bus</span><span class="dynamo-value">${rule.event_bus_name}</span></div>
          ${rule.schedule ? `<div class="dynamo-info-row"><span class="dynamo-label">Schedule</span><span class="dynamo-value">${rule.schedule}</span></div>` : ''}
          ${rule.description ? `<div class="dynamo-info-row"><span class="dynamo-label">Description</span><span class="dynamo-value">${rule.description}</span></div>` : ''}
        </div>
        <div class="dynamo-info-card">
          <h3>Targets (${targets.length})</h3>
          ${targets.map(t => `
            <div class="dynamo-info-row">
              <span class="dynamo-label">${t.id}</span>
              <span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${t.arn}</span>
            </div>
            ${t.input ? `<div class="dynamo-info-row"><span class="dynamo-label">Input</span><span class="dynamo-value" style="font-size:0.7rem">${t.input}</span></div>` : ''}
          `).join('')}
          ${targets.length === 0 ? '<p class="empty">No targets</p>' : ''}
        </div>
      </div>
      ${rule.event_pattern ? `
      <h3 class="section-title">Event Pattern</h3>
      <div class="glue-script-container"><pre class="glue-script-code" id="eb-pattern-pre"></pre></div>` : ''}`;

    document.querySelector('.back-btn').onclick = () => renderEventBridge(rule.event_bus_name);

    // Pretty print event pattern
    if (rule.event_pattern) {
      try {
        document.getElementById('eb-pattern-pre').textContent = JSON.stringify(JSON.parse(rule.event_pattern), null, 2);
      } catch (_) {
        document.getElementById('eb-pattern-pre').textContent = rule.event_pattern;
      }
    }

    // Enable/Disable
    document.getElementById('eb-toggle-rule').onclick = async () => {
      const action = isEnabled ? 'Disable' : 'Enable';
      const confirmed = await showConfirm(`${action} Rule`, `${action} rule "${rule.name}"?`);
      if (!confirmed) return;
      try {
        if (isEnabled) {
          await invoke('eb_disable_rule', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
        } else {
          await invoke('eb_enable_rule', { profile: state.profile, ruleName: rule.name, busName: rule.event_bus_name });
        }
        showAlert('Success', `Rule ${action.toLowerCase()}d`);
        rule.state = isEnabled ? 'DISABLED' : 'ENABLED';
        renderEbRuleDetail(rule);
      } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderEbSendEvent(busName) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} Send Event to: ${busName}</span>
    </div>
    <div class="dynamo-info-card" style="margin-top:1rem">
      <h3>Test Event</h3>
      <div class="athena-editor-toolbar" style="margin-top:0.8rem">
        <input type="text" class="dialog-input" id="eb-source" placeholder="Source (e.g. my-app)" style="flex:1;margin:0" />
        <input type="text" class="dialog-input" id="eb-detail-type" placeholder="Detail Type (e.g. order.created)" style="flex:1;margin:0" />
      </div>
      <textarea class="athena-textarea" id="eb-detail" placeholder='{"key": "value"}' rows="5">{"test": true}</textarea>
      <button class="s3-toolbar-btn" id="eb-send-btn" style="margin-top:0.8rem;background:var(--accent);color:white;border:none">Send Event</button>
      <div id="eb-send-result"></div>
    </div>`;

  document.querySelector('.back-btn').onclick = () => renderEventBridge(busName);
  document.getElementById('eb-send-btn').onclick = async () => {
    const source = document.getElementById('eb-source').value.trim();
    const detailType = document.getElementById('eb-detail-type').value.trim();
    const detail = document.getElementById('eb-detail').value.trim();
    if (!source || !detailType || !detail) { showAlert('Missing fields', 'Source, Detail Type and Detail are required'); return; }
    try {
      const msg = await invoke('eb_put_event', { profile: state.profile, busName, source, detailType, detail });
      document.getElementById('eb-send-result').innerHTML = `<div class="lambda-result-card" style="margin-top:0.8rem"><span class="glue-status-succeeded">${msg}</span></div>`;
    } catch (e) { document.getElementById('eb-send-result').innerHTML = formatError(e); }
  };
}
