// Shared sidebar component for the IS app shell.
// Used by every screen via <script src="sidebar.js" data-active="finance"></script>.
// Plain JS (no React) so screens stay editable.

(function () {
  const ITEMS = [
    { id: 'home',    label: 'Home',         icon: 'home',    section: 'workspace' },
    { id: 'inbox',   label: 'Inbox',        icon: 'inbox',   section: 'workspace', count: 5 },
    { id: 'hr',      label: 'HR',           icon: 'users',   section: 'modules' },
    { id: 'finance', label: 'Finance',      icon: 'wallet',  section: 'modules', count: 3 },
    { id: 'sales',   label: 'Sales',        icon: 'sales',   section: 'modules' },
    { id: 'crm',     label: 'CRM',          icon: 'crm',     section: 'modules' },
    { id: 'procure', label: 'Procurement',  icon: 'cart',    section: 'modules' },
    { id: 'inv',     label: 'Inventory',    icon: 'box',     section: 'modules' },
    { id: 'proj',    label: 'Projects',     icon: 'kanban',  section: 'modules' },
    { id: 'docs',    label: 'Documents',    icon: 'doc',     section: 'modules' },
    { id: 'chat',    label: 'Chat',         icon: 'chat',    section: 'modules', count: 2 },
  ];

  // Lucide-style stroke icons (1.5px, 24×24).
  const ICONS = {
    home:   '<path d="M3 12l9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    inbox:  '<path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><path d="M3 13l3-8h12l3 8"/><path d="M3 13h5l1 2h6l1-2h5"/>',
    users:  '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
    sales:  '<path d="M3 18l5-5 4 4 8-9"/><path d="M14 8h7v7"/>',
    crm:    '<path d="M4 11a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3h-1v-7h4M4 13v4a3 3 0 0 0 3 3h1v-7H4"/>',
    cart:   '<path d="M3 6h18l-2 11H5z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
    box:    '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v10"/>',
    kanban: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M3 10h5M3 14h5"/>',
    doc:    '<path d="M6 3h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
    chat:   '<path d="M21 11a8 8 0 0 1-12 7l-6 2 2-6a8 8 0 1 1 16-3z"/>',
  };
  function svg(name) {
    return `<svg class="nico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  }

  function render(active) {
    const sections = {
      workspace: ITEMS.filter(i => i.section === 'workspace'),
      modules:   ITEMS.filter(i => i.section === 'modules'),
    };
    const renderSection = (label, items) => `
      <div class="nav-section">${label}</div>
      ${items.map(i => `
        <a class="nav-item ${i.id === active ? 'active' : ''}" href="#${i.id}">
          ${svg(i.icon)}
          <span>${i.label}</span>
          ${i.count ? `<span class="ncount">${i.count}</span>` : ''}
        </a>
      `).join('')}
    `;
    return `
      <div class="brand">
        <img class="brand-mark" src="../../assets/logo-mark.svg" alt="">
        <div>
          <div class="brand-name">Indonesia System</div>
          <div class="brand-org">PT Acme Indonesia</div>
        </div>
      </div>
      ${renderSection('Workspace', sections.workspace)}
      ${renderSection('Modules', sections.modules)}
      <div class="sidebar-foot">
        <div class="av navy">A<span class="presence"></span></div>
        <div style="line-height: 1.3;">
          <div style="font-size: 12px; font-weight: 600; color: var(--fg-1);">Andi Wijaya</div>
          <div style="font-size: 10px; color: var(--fg-3);">Finance Manager</div>
        </div>
      </div>
    `;
  }

  // Auto-mount: any element with [data-sidebar] becomes the sidebar.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-sidebar]').forEach(el => {
      const active = el.getAttribute('data-active') || 'home';
      el.innerHTML = render(active);
    });
  });

  // Topbar helper too — render as plain HTML, no JS needed,
  // but expose a Topbar() function for screens that want it.
  window.Topbar = function ({ crumbs = [], live = true } = {}) {
    const last = crumbs.length - 1;
    return `
      <div class="crumbs">
        ${crumbs.map((c, i) => i === last
          ? `<b>${c}</b>`
          : `<span>${c}</span><span class="sep">/</span>`
        ).join('')}
      </div>
      <div class="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Cari faktur, karyawan, dokumen…</span>
        <span class="kbd">⌘K</span>
      </div>
      <div class="topbar-right">
        ${live ? '<span class="live">Live · 14 online</span>' : ''}
        <button class="tb-btn" title="Notifications" style="position: relative;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          <span class="dot"></span>
        </button>
        <button class="tb-btn" title="Help">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>
        </button>
      </div>
    `;
  };
})();
