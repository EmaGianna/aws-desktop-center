import { invoke, state, icon, formatError } from './shared.js';

export async function renderVpc() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading VPCs...</div>';
  try {
    const vpcs = await invoke('ec2_list_vpcs', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('eventbridge', 'icon-md')} VPCs</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter VPCs..." id="vpc-filter" />
      <div class="item-grid">${vpcs.map(v => `
        <div class="item-tile vpc-item" data-id="${v.id}">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${v.name || v.id}</span>
          <span class="item-meta">${v.cidr_block}${v.is_default ? ' (default)' : ''}</span>
          <span class="item-meta rds-status-${v.state}">${v.state}</span>
        </div>`).join('')}${vpcs.length === 0 ? '<p class="empty">No VPCs</p>' : ''}</div>`;

    document.getElementById('vpc-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.vpc-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.vpc-item').forEach(el => {
      el.onclick = () => renderVpcDetail(el.dataset.id, vpcs.find(v => v.id === el.dataset.id));
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderVpcDetail(vpcId, vpc, tab = 'subnets') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('eventbridge', 'icon-xs')} ${vpc.name || vpcId}</span>
    </div>
    <div class="tabs">
      <button class="tab ${tab === 'subnets' ? 'active' : ''}" data-tab="subnets">Subnets</button>
      <button class="tab ${tab === 'sg' ? 'active' : ''}" data-tab="sg">Security Groups</button>
      <button class="tab ${tab === 'routes' ? 'active' : ''}" data-tab="routes">Route Tables</button>
    </div>
    <div id="vpc-tab-content"><div class="loading">Loading...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderVpc();
  document.querySelectorAll('.tab').forEach(t => { t.onclick = () => renderVpcDetail(vpcId, vpc, t.dataset.tab); });

  const tabContent = document.getElementById('vpc-tab-content');
  try {
    if (tab === 'subnets') {
      const subnets = await invoke('ec2_list_subnets', { profile: state.profile, vpcId });
      tabContent.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Name</th><th>ID</th><th>CIDR</th><th>AZ</th><th>Available IPs</th><th>Auto-assign Public IP</th></tr></thead>
        <tbody>${subnets.map(s => `<tr><td>${s.name}</td><td style="font-size:0.7rem">${s.id}</td><td>${s.cidr_block}</td><td>${s.availability_zone}</td><td>${s.available_ips}</td><td>${s.map_public_ip ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody>
      </table></div>${subnets.length === 0 ? '<p class="empty">No subnets</p>' : ''}`;
    } else if (tab === 'sg') {
      const groups = await invoke('ec2_list_security_groups', { profile: state.profile, vpcId });
      tabContent.innerHTML = `<div class="item-grid">${groups.map(g => `
        <div class="item-tile">
          ${icon('eventbridge', 'icon-lg')}
          <span class="item-name">${g.name}</span>
          <span class="item-meta" style="font-size:0.65rem">${g.id}</span>
          <span class="item-meta">${g.inbound_rules.length} in / ${g.outbound_rules.length} out</span>
        </div>`).join('')}</div>${groups.length === 0 ? '<p class="empty">No security groups</p>' : ''}`;
    } else if (tab === 'routes') {
      const tables = await invoke('ec2_list_route_tables', { profile: state.profile, vpcId });
      tabContent.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>Route Table ID</th><th>Main</th><th>Routes</th></tr></thead>
        <tbody>${tables.map(t => `<tr><td style="font-size:0.7rem">${t.id}</td><td>${t.is_main ? 'Yes' : 'No'}</td><td>${t.route_count}</td></tr>`).join('')}</tbody>
      </table></div>${tables.length === 0 ? '<p class="empty">No route tables</p>' : ''}`;
    }
  } catch (e) { tabContent.innerHTML = formatError(e); }
}
