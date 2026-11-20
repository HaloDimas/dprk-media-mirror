# DPRK Media Mirror

[![CI](https://github.com/HaloDimas/dprk-media-mirror/actions/workflows/ci.yml/badge.svg)](https://github.com/HaloDimas/dprk-media-mirror/actions/workflows/ci.yml)
[![CodeQL](https://github.com/HaloDimas/dprk-media-mirror/actions/workflows/codeql.yml/badge.svg)](https://github.com/HaloDimas/dprk-media-mirror/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A multi-page mirror of North Korean state media — live TV, programme
schedule, news, radio, recordings, publications and a directory of `.kp`
sites — in one place.

**Live site:** https://dprkmedia.vercel.app

## Features

- **Live TV** — KCTV, Sports TV and Ryongnamsan TV (HLS), with Mansudae TV
  listed as coming soon.
- **Schedule** — programme guide in Pyongyang Time (UTC+9), with English and
  Korean programme titles.
- **News** — KCNA, Rodong Sinmun and other DPRK publications, with archive
  search and full-text article pages.
- **Radio** — KCBS, KCBS-2 and Pyongyang FM, with per-station pages.
- **Recordings** — recorded KCTV programmes with thumbnails.
- **Publications & Directory** — DPRK publications and a directory of
  `.kp` sites, plus a Sources page listing where everything comes from.
- **Search** — site-wide search across news, recordings and publications.
- **Saved** — bookmark articles and recordings locally in your browser.
- **Settings** — appearance, playback and programme-guide preferences.
- **Interface** — English, Indonesian and Korean UI; dark and light themes.

## Local setup

```bash
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # type check
npm run build      # production build
```

No secrets or environment variables are needed to build or run the site
locally.

## Tech stack

Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, HLS.js for
live playback. Deployed on Vercel; live streams are proxied through a
Cloudflare Worker.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the
setup, pull request checklist and project rules. Please read
[SECURITY.md](SECURITY.md) before reporting a vulnerability, and never
include credentials, tokens, session cookies or webhook URLs in issues,
pull requests or code.

## Legal

DPRK Media Mirror content is hosted here for educational access purposes only | All materials copyright of the Korea D.P.R. government.
