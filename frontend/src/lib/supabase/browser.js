import { createBrowserClient } from "@supabase/ssr";

let browserClient;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase belum dikonfigurasi");
  }

  return { url, key };
}

export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabaseConfig();
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
