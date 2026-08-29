(() => {
  'use strict';

  const cfg = window.MUDAMAS_CONFIG;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_PUBLISHABLE_KEY || !window.supabase) {
    console.error('Konfigurasi Supabase belum tersedia.');
    return;
  }

  const client = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  async function getOwnProfile(userId) {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, username, phone, role, is_active, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  function canAccessAdmin(profile) {
    return Boolean(
      profile &&
      profile.is_active === true &&
      cfg.ALLOWED_ADMIN_ROLES.includes(profile.role)
    );
  }

  async function writeAudit(action, module = 'auth', metadata = {}) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      await client.from('admin_audit_logs').insert({
        user_id: user.id,
        action,
        module,
        metadata
      });
    } catch (err) {
      console.warn('Audit log tidak mengganggu proses utama:', err?.message || err);
    }
  }

  window.MudamasAuth = Object.freeze({
    client,
    getOwnProfile,
    canAccessAdmin,
    writeAudit
  });
})();
