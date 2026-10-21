import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          fetch: async (url, options = {}) => {
            const controller = new AbortController();
            const abort = () => controller.abort();
            if (options.signal?.aborted) controller.abort();
            options.signal?.addEventListener('abort', abort, { once: true });
            const timer = setTimeout(abort, 15000);
            try { return await fetch(url, { ...options, signal: controller.signal }); }
            finally {
              clearTimeout(timer);
              options.signal?.removeEventListener('abort', abort);
            }
          },
        },
      })
    : null;

