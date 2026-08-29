(() => {
  'use strict';

  const auth = window.MudamasAuth;
  const loading = document.getElementById('authLoading');
  const app = document.getElementById('adminApp');
  const logoutButton = document.getElementById('logoutButton');
  let currentProfile = null;

  const rupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value || 0));

  const compactRupiah = (value) => {
    const n = Number(value || 0);
    if (n >= 1_000_000_000) return `Rp${(n/1_000_000_000).toFixed(n >= 10_000_000_000 ? 1 : 2).replace('.', ',')} M`;
    if (n >= 1_000_000) return `Rp${(n/1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace('.', ',')} Jt`;
    return rupiah(n);
  };

  function loginRedirect(reason = 'unauthorized') {
    window.location.replace(`admin-login.html?reason=${encodeURIComponent(reason)}`);
  }

  function toast(message) {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    window.setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setClock() {
    const now = new Date();
    document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }).format(now);
    document.getElementById('clockLabel').textContent = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit', minute: '2-digit'
    }).format(now).replace('.', ':') + ' WIB';
  }

  function decision(score) {
    if (score >= 75) return ['GO', 'go'];
    if (score >= 55) return ['REVIEW', 'review'];
    return ['NO-GO', 'nogo'];
  }

  function dateShort(v) {
    if (!v) return '-';
    return new Intl.DateTimeFormat('id-ID', {day:'2-digit', month:'short', year:'numeric'}).format(new Date(v));
  }

  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[m]));
  }

  async function loadDashboardData() {
    const { data, error } = await auth.client
      .from('opportunities')
      .select('id,package_name,agency_name,budget_value,hps_value,estimated_hpp,submission_deadline,status,score')
      .order('score', { ascending: false });

    if (error) {
      console.error('Dashboard opportunities error:', error);
      toast('Data dashboard belum dapat dimuat.');
      return;
    }

    const rows = data || [];
    const active = rows.filter(x => !['lost','cancelled','no_go'].includes(x.status));
    const pipeline = active.reduce((sum, x) => sum + Number(x.hps_value || x.budget_value || 0), 0);
    const submitted = rows.filter(x => ['submitted','evaluation'].includes(x.status)).length;
    const goRows = rows.filter(x => Number(x.score || 0) >= 75 && !['lost','cancelled','no_go'].includes(x.status));
    const grossMargin = active.reduce((sum, x) => {
      const value = Number(x.hps_value || x.budget_value || 0);
      const hpp = Number(x.estimated_hpp || 0);
      return sum + (value > 0 && hpp > 0 ? Math.max(0, value - hpp) : 0);
    }, 0);

    document.getElementById('pipelineValue').textContent = compactRupiah(pipeline);
    document.getElementById('pipelineSub').textContent = `${active.length} opportunity aktif`;
    document.getElementById('submittedValue').textContent = submitted;
    document.getElementById('goValue').textContent = goRows.length;
    document.getElementById('profitValue').textContent = compactRupiah(grossMargin);
    document.getElementById('activeOpportunityHero').textContent = active.length;

    const goCount = rows.filter(x => Number(x.score || 0) >= 75).length;
    const reviewCount = rows.filter(x => Number(x.score || 0) >= 55 && Number(x.score || 0) < 75).length;
    const noGoCount = rows.filter(x => Number(x.score || 0) < 55).length;
    const total = Math.max(rows.length, 1);

    document.getElementById('goCountBar').textContent = goCount;
    document.getElementById('reviewCountBar').textContent = reviewCount;
    document.getElementById('nogoCountBar').textContent = noGoCount;
    document.getElementById('goBar').style.width = `${goCount/total*100}%`;
    document.getElementById('reviewBar').style.width = `${reviewCount/total*100}%`;
    document.getElementById('nogoBar').style.width = `${noGoCount/total*100}%`;

    const heroPercent = rows.length ? Math.min(100, Math.round(goCount / rows.length * 100)) : 0;
    document.getElementById('heroProgress').style.width = `${heroPercent}%`;
    document.getElementById('heroInsight').textContent = rows.length
      ? `${goCount} dari ${rows.length} opportunity masuk kategori GO.`
      : 'Belum ada data opportunity.';

    const priority = rows
      .filter(x => !['lost','cancelled'].includes(x.status))
      .slice(0, 5);

    const priorityEl = document.getElementById('priorityList');
    if (!priority.length) {
      priorityEl.innerHTML = `
        <div class="premium-empty">
          <b>Belum ada opportunity.</b>
          <span>Tambahkan paket pertama agar dashboard mulai bekerja.</span>
          <a href="admin-opportunities.html">Tambah Opportunity →</a>
        </div>`;
    } else {
      priorityEl.innerHTML = priority.map(x => {
        const [label, cls] = decision(Number(x.score || 0));
        const value = Number(x.hps_value || x.budget_value || 0);
        return `
          <a class="priority-row" href="admin-opportunities.html">
            <div class="priority-accent ${cls}"></div>
            <div class="priority-copy">
              <strong>${escapeHtml(x.package_name || 'Tanpa nama')}</strong>
              <span>${escapeHtml(x.agency_name || 'Instansi belum diisi')} · ${compactRupiah(value)} · ${dateShort(x.submission_deadline)}</span>
            </div>
            <span class="decision-badge ${cls}">${label}</span>
            <b class="score-ring ${cls}">${Number(x.score || 0)}</b>
          </a>`;
      }).join('');
    }

    const upcoming = rows
      .filter(x => x.submission_deadline && new Date(x.submission_deadline) >= new Date())
      .sort((a,b) => new Date(a.submission_deadline) - new Date(b.submission_deadline))
      .slice(0,4);

    document.getElementById('deadlineCount').textContent = `${upcoming.length} paket`;
    const deadlineEl = document.getElementById('deadlineList');
    if (!upcoming.length) {
      deadlineEl.innerHTML = '<div class="empty-mini">Belum ada deadline mendatang.</div>';
    } else {
      deadlineEl.innerHTML = upcoming.map(x => {
        const d = new Date(x.submission_deadline);
        return `
          <div class="deadline-item">
            <div><strong>${escapeHtml(x.package_name || 'Tanpa nama')}</strong><span>${escapeHtml(x.agency_name || '')}</span></div>
            <time><b>${String(d.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('id-ID',{month:'short'}).format(d).toUpperCase()}</small></time>
          </div>`;
      }).join('');
    }
  }

  async function init() {
    try {
      const { data: { session }, error } = await auth.client.auth.getSession();
      if (error) throw error;
      if (!session?.user) return loginRedirect('session_required');

      const profile = await auth.getOwnProfile(session.user.id);
      if (!profile?.is_active) {
        await auth.client.auth.signOut();
        return loginRedirect('inactive');
      }
      if (!auth.canAccessAdmin(profile)) {
        await auth.client.auth.signOut();
        return loginRedirect('forbidden');
      }

      currentProfile = profile;
      const displayName = profile.full_name || profile.username || session.user.email?.split('@')[0] || 'Admin';
      document.getElementById('sidebarName').textContent = displayName;
      document.getElementById('sidebarEmail').textContent = session.user.email || '-';
      document.getElementById('welcomeName').textContent = displayName;
      document.getElementById('sidebarAvatar').textContent = displayName.charAt(0).toUpperCase();
      document.getElementById('rolePill').textContent = String(profile.role || 'admin').replaceAll('_', ' ');

      setClock();
      setInterval(setClock, 30000);
      await auth.writeAudit('DASHBOARD_VIEW', 'dashboard', { role: profile.role });

      app.hidden = false;
      loading.classList.add('hidden');
      await loadDashboardData();
    } catch (err) {
      console.error('Admin guard error:', err);
      try { await auth.client.auth.signOut(); } catch (_) {}
      loginRedirect('verification_failed');
    }
  }

  document.getElementById('refreshDashboard')?.addEventListener('click', async () => {
    toast('Memperbarui dashboard...');
    await loadDashboardData();
  });

  document.querySelectorAll('[data-coming]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      toast(`${link.dataset.coming} akan kita aktifkan pada tahap berikutnya.`);
    });
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = 'Keluar...';
    await auth.writeAudit('LOGOUT', 'auth');
    await auth.client.auth.signOut();
    window.location.replace('admin-login.html');
  });

  auth.client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      if (!document.hidden) loginRedirect('signed_out');
    }
  });

  init();
})();
