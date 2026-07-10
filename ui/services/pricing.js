import { invoke, state, icon, formatError } from './shared.js';

export async function renderPricing() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading Pricing service codes...</div>';
  try {
    const codes = await invoke('pricing_list_service_codes', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('cloudwatch', 'icon-md')} AWS Pricing (${codes.length} services)</h2>
      <input type="text" class="s3-filter-input" placeholder="Filter service codes..." id="pricing-filter" />
      <div class="item-grid">${codes.map(c => `
        <div class="item-tile pricing-item" data-code="${c}">${icon('cloudwatch', 'icon-lg')}<span class="item-name" style="font-size:0.75rem">${c}</span></div>`).join('')}${codes.length === 0 ? '<p class="empty">No service codes</p>' : ''}</div>`;

    document.getElementById('pricing-filter').oninput = (e) => {
      const filter = e.target.value.toLowerCase();
      document.querySelectorAll('.pricing-item').forEach(el => {
        el.style.display = el.dataset.code.toLowerCase().includes(filter) ? '' : 'none';
      });
    };
    document.querySelectorAll('.pricing-item').forEach(el => {
      el.onclick = () => renderProducts(el.dataset.code);
    });
  } catch (e) { content.innerHTML = formatError(e); }
}

async function renderProducts(serviceCode) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="breadcrumb">
      <button class="back-btn">← Back</button>
      <span class="path-text">${icon('cloudwatch', 'icon-xs')} ${serviceCode} — sample products</span>
    </div>
    <div id="pricing-products"><div class="loading">Loading products...</div></div>`;

  document.querySelector('.back-btn').onclick = () => renderPricing();

  try {
    const products = await invoke('pricing_get_products', { profile: state.profile, serviceCode });
    document.getElementById('pricing-products').innerHTML = products.map((p, i) => {
      let pretty = p;
      try { pretty = JSON.stringify(JSON.parse(p), null, 2); } catch (_) {}
      return `<div class="glue-script-container" style="margin-bottom:0.8rem"><pre class="glue-script-code">${pretty}</pre></div>`;
    }).join('') || '<p class="empty">No products returned</p>';
  } catch (e) { document.getElementById('pricing-products').innerHTML = formatError(e); }
}
