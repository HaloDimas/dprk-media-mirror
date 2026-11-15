/**
 * DPRK Media Mirror — refresh trigger (Cloudflare Worker).
 *
 * Calls the Vercel /api/cron/refresh endpoint every 30 minutes so the
 * data caches stay warm and pages serve fresh data. This bypasses the
 * Vercel Hobby plan's once-per-day cron limit (vercel.json can only run
 * "0 0 * * *" on Hobby), without moving the scrapers themselves —
 * the scrapers still run on Vercel, this Worker only triggers them.
 *
 * Auth: the Worker sends the same CRON_SECRET that Vercel Cron sends
 * automatically (Authorization: Bearer <secret>). The secret is stored
 * as a Worker secret (never in this file):
 *   - Dashboard: Worker Settings -> Variables -> Add variable,
 *     name CRON_SECRET, mark as secret (Encrypt), paste the value.
 *   - wrangler: `wrangler secret put CRON_SECRET`
 * The value must match the CRON_SECRET env var in the Vercel project.
 *
 * Schedule: a Cron Trigger of `*\/30 * * * *` (every 30 minutes).
 *   - Dashboard: Worker Settings -> Triggers -> Cron Triggers -> Add.
 *   - wrangler: see wrangler.toml [triggers] below.
 *
 * Deploy: paste this file into a new Worker in the Cloudflare dashboard
 * (Start with Hello World! -> replace the code -> Deploy), or
 * `npx wrangler deploy` from this folder. Free plan is enough
 * (48 trigger runs/day is far below the 100k requests/day limit).
 */

const REFRESH_URL = "https://dprk-media-mirror.vercel.app/api/cron/refresh";

export default {
  async scheduled(_event, env, ctx) {
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error("dprk-refresh: CRON_SECRET is not set as a Worker secret.");
      return;
    }
    ctx.waitUntil(
      (async () => {
        try {
          const res = await fetch(REFRESH_URL, {
            headers: { Authorization: `Bearer ${secret}` },
          });
          const body = await res.text();
          console.log(`dprk-refresh: ${res.status} ${body.slice(0, 300)}`);
        } catch (e) {
          console.error("dprk-refresh: fetch failed", e);
        }
      })()
    );
  },

  // HTTP GET is only for a quick manual check that the Worker is deployed.
  // It does NOT trigger a refresh (the cron trigger does that).
  async fetch(_request, env) {
    const configured = Boolean(env.CRON_SECRET);
    return new Response(
      `dprk-refresh worker is up. CRON_SECRET ${configured ? "is set" : "is NOT set"}; ` +
        "refresh runs on the Cron Trigger (every 30 min).",
      { headers: { "Content-Type": "text/plain" } }
    );
  },
};
