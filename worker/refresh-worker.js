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
 * Last-refresh record (KV): after each successful refresh this Worker
 * stores the result in a KV namespace so the /status page can show the
 * REAL last refresh instead of "no refresh recorded on this server
 * instance" (Vercel instances are stateless — an in-memory record dies
 * on every deploy). The KV binding is optional: if REFRESH_STATE is not
 * bound yet, the refresh still runs and the log notes the missing
 * binding. To enable it, create a KV namespace in the Cloudflare
 * dashboard and bind it as REFRESH_STATE on this Worker (see
 * refresh-wrangler.toml for the commented binding example).
 * The /status page reads the record from this Worker's fetch handler.
 *
 * Deploy: paste this file into the existing Worker in the Cloudflare
 * dashboard (Workers & Pages -> sweet-bird-3c29 -> Edit code -> replace
 * all -> Deploy), or `npx wrangler deploy` from this folder. Free plan
 * is enough (48 trigger runs/day is far below the 100k requests/day limit).
 */

const REFRESH_URL = "https://dprk-media-mirror.vercel.app/api/cron/refresh";

/** A scheduled run: the refresh endpoint's own result, as JSON. */
async function triggerRefresh(env) {
  const res = await fetch(REFRESH_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await res.text();
  console.log(`dprk-refresh: ${res.status} ${body.slice(0, 300)}`);

  if (!res.ok) {
    // A failed refresh leaves the previous KV record untouched, so
    // /status can still show the last GOOD run (and flags it stale
    // once it is more than an hour old).
    console.error(`dprk-refresh: refresh endpoint returned HTTP ${res.status}; KV record not updated.`);
    return;
  }

  // Record the run in KV so /status survives Vercel redeploys.
  const binding = env.REFRESH_STATE;
  if (!binding) {
    console.log("dprk-refresh: no REFRESH_STATE KV binding — last refresh is not recorded (bind one in the dashboard to enable it).");
    return;
  }
  try {
    const data = JSON.parse(body);
    const record = {
      at: data.startedAt ?? new Date().toISOString(),
      ok: typeof data.ok === "number" ? data.ok : null,
      failed: typeof data.failed === "number" ? data.failed : null,
      skipped: typeof data.skipped === "number" ? data.skipped : null,
      durationMs: typeof data.durationMs === "number" ? data.durationMs : null,
    };
    await binding.put("last", JSON.stringify(record));
  } catch (e) {
    console.error("dprk-refresh: could not record the refresh in KV", e);
  }
}

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
          await triggerRefresh(env);
        } catch (e) {
          console.error("dprk-refresh: fetch failed", e);
        }
      })()
    );
  },

  // HTTP GET is only for a quick manual check that the Worker is deployed
  // and for the /status page, which reads lastRefresh from this JSON.
  // It does NOT trigger a refresh (the cron trigger does that).
  async fetch(_request, env) {
    const configured = Boolean(env.CRON_SECRET);
    let lastRefresh = null;
    const binding = env.REFRESH_STATE;
    if (binding) {
      try {
        const raw = await binding.get("last");
        if (raw) lastRefresh = JSON.parse(raw);
      } catch (e) {
        console.error("dprk-refresh: could not read the KV record", e);
      }
    }
    return new Response(
      JSON.stringify({ status: "up", cronSecretSet: configured, lastRefresh }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
