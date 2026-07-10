import { invoke, state, icon, formatError } from './shared.js';

export async function renderCloudTrail(view = 'trails') {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading CloudTrail...</div>';
  try {
    let html = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} CloudTrail</h2>
      <div class="tabs">
        <button class="tab ${view === 'trails' ? 'active' : ''}" data-view="trails">Trails</button>
        <button class="tab ${view === 'events' ? 'active' : ''}" data-view="events">Recent Events</button>
      </div>`;

    if (view === 'events') {
      const events = await invoke('cloudtrail_lookup_events', { profile: state.profile });
      html += `<input type="text" class="s3-filter-input" placeholder="Filter events..." id="ct-filter" />
        <div class="table-container"><table>
          <thead><tr><th>Event</th><th>User</th><th>Time</th></tr></thead>
          <tbody>${events.map(e => `<tr class="ct-row"><td>${e.name}</td><td>${e.username}</td><td style="font-size:0.7rem">${e.time}</td></tr>`).join('')}</tbody>
        </table></div>${events.length === 0 ? '<p class="empty">No recent events</p>' : ''}`;
      content.innerHTML = html;
      document.getElementById('ct-filter').oninput = (e) => {
        const filter = e.target.value.toLowerCase();
        document.querySelectorAll('.ct-row').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none'; });
      };
    } else {
      const trails = await invoke('cloudtrail_list_trails', { profile: state.profile });
      html += `<div class="item-grid">${trails.map(t => `
        <div class="item-tile">
          ${icon('cloudwatch', 'icon-lg')}
          <span class="item-name">${t.name}</span>
          <span class="item-meta">${t.home_region}</span>
          <span class="item-meta rds-status-${t.is_logging ? 'available' : 'stopped'}">${t.is_logging ? 'Logging' : 'Stopped'}</span>
        </div>`).join('')}${trails.length === 0 ? '<p class="empty">No trails</p>' : ''}</div>`;
      content.innerHTML = html;
    }
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderCloudTrail(t.dataset.view); });
  } catch (e) { content.innerHTML = formatError(e); }
}
