import { createClient } from "@supabase/supabase-js";

let cachedClient;

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "X-Application-Name": "rotteck-pulli",
      },
    },
  });

  return cachedClient;
}

export function resetSupabaseClient() {
  cachedClient = undefined;
}
