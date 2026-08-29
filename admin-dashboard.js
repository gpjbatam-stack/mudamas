(() => {
  'use strict';

  const auth = window.MudamasAuth;
  const loading = document.getElementById('authLoading');
  const app = document.getElementById('adminApp');
  const logoutButton = document.getElementById('logoutButton');

  function loginRedirect(reason = 'unauthorized') {
    window.location.replace(`admin-login.html?reason=${encodeURIComponent(reason)}`);
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

      const displayName = profile.full_name || profile.username || session.user.email?.split('@')[0] || 'Admin';
      document.getElementById('sidebarName').textContent = displayName;
      document.getElementById('sidebarEmail').textContent = session.user.email || '-';
      document.getElementById('welcomeName').textContent = displayName;
      document.getElementById('rolePill').textContent = String(profile.role || 'admin').replaceAll('_', ' ');

      await auth.writeAudit('DASHBOARD_VIEW', 'dashboard', { role: profile.role });
      app.hidden = false;
      loading.classList.add('hidden');
    } catch (err) {
      console.error('Admin guard error:', err);
      try { await auth.client.auth.signOut(); } catch (_) {}
      loginRedirect('verification_failed');
    }
  }

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
