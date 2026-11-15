# HLS proxy on Cloudflare Workers — move video traffic off Vercel

## Why

The live TV/radio streams are proxied through Vercel serverless functions
(`src/app/api/hls`). Every byte of video counts against Vercel Hobby's
**10 GB/month Fast Origin Transfer** limit. One hour of KCTV (1080p50,
~9.5 Mbps) is ~4.3 GB — a single user testing the site already used
4.21 GB. The site would break for everyone once it hits 10 GB.

Cloudflare Workers on the **free plan have no bandwidth/egress charges**
(100,000 requests/day). Moving just the HLS proxy here takes all video
traffic off Vercel. The Next.js site itself stays on Vercel (pages, news,
EPG — tiny JSON, almost no bandwidth).

## Deploy

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up
   (no card needed for the free plan).
2. Install Wrangler once: `npm install -g wrangler`
3. From this folder: `npx wrangler login` then `npx wrangler deploy`.
   It prints a URL like `https://dprk-hls.<your-subdomain>.workers.dev`.
   (Or paste `hls-proxy.js` into a new Worker in the Cloudflare dashboard —
   Workers & Pages → Create → Worker → paste the code → Deploy.)
4. In the Vercel project (dprk-media-mirror-fakv), add an env var:
   `NEXT_PUBLIC_HLS_PROXY=https://dprk-hls.<your-subdomain>.workers.dev`
   (no trailing slash). Redeploy.
5. `HlsPlayer` and `AudioPlayer` read `NEXT_PUBLIC_HLS_PROXY` and use it
   instead of `/api/hls`. If the env var is unset, they keep using `/api/hls`
   (current behaviour).

## Requests/day estimate

A viewer makes ~10 segment requests/minute + a manifest refresh every few
seconds — roughly 700 requests/hour of viewing. 100,000/day supports
~140 viewer-hours/day. If the site ever outgrows that, Cloudflare's paid
Workers plan is $5/month (10M requests included).

## What still uses Vercel

Everything except the HLS segments: pages, `/api/epg`, `/api/news`,
`/api/recordings`, `/api/publications`, search, the KCNA Watch scraper.
Those are small JSON payloads — a few MB/month, nowhere near any limit.
