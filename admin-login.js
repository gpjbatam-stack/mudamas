(() => {
  'use strict';

  const auth = window.MudamasAuth;
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const button = document.getElementById('loginButton');
  const message = document.getElementById('formMessage');
  const togglePassword = document.getElementById('togglePassword');

  function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `form-message show ${type}`;
  }

  function clearMessage() {
    message.textContent = '';
    message.className = 'form-message';
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.textContent = loading ? 'Memverifikasi akun...' : 'Masuk ke Command Center';
  }

  function friendlyAuthError(error) {
    const raw = String(error?.message || '').toLowerCase();
    if (raw.includes('invalid login credentials')) return 'Email atau password tidak sesuai.';
    if (raw.includes('email not confirmed')) return 'Email akun belum dikonfirmasi.';
    if (raw.includes('too many requests')) return 'Terlalu banyak percobaan login. Coba kembali beberapa saat lagi.';
    return error?.message || 'Login gagal. Silakan coba kembali.';
  }

  async function validateAccess(user) {
    const profile = await auth.getOwnProfile(user.id);
    if (!profile?.is_active) {
      await auth.client.auth.signOut();
      throw new Error('Akun Anda sedang nonaktif. Hubungi Super Admin.');
    }
    if (!auth.canAccessAdmin(profile)) {
      await auth.client.auth.signOut();
      throw new Error('Akun ini tidak memiliki hak akses Admin Command Center.');
    }
    return profile;
  }

  async function redirectExistingSession() {
    try {
      const { data: { session } } = await auth.client.auth.getSession();
      if (!session?.user) return;
      await validateAccess(session.user);
      window.location.replace('admin-dashboard.html');
    } catch (err) {
      console.warn('Session lama tidak dapat digunakan:', err?.message || err);
    }
  }

  togglePassword.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePassword.textContent = show ? 'Tutup' : 'Lihat';
    togglePassword.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await auth.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.user) throw new Error('Session login tidak terbentuk.');

      const profile = await validateAccess(data.user);
      await auth.writeAudit('LOGIN_SUCCESS', 'auth', { role: profile.role });
      showMessage('Login berhasil. Mengalihkan ke dashboard...', 'success');
      setTimeout(() => window.location.replace('admin-dashboard.html'), 350);
    } catch (error) {
      showMessage(friendlyAuthError(error));
      setLoading(false);
    }
  });

  redirectExistingSession();
})();
