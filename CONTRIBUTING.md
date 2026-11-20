# Contributing to DPRK Media Mirror

Thanks for your interest in contributing. This project is a multi-page
Next.js mirror of North Korean state media (Koryo Front, KCNA Watch and
other DPRK sites): live TV, programme schedule, news, radio, recordings,
publications and a directory of `.kp` sites.

## How to contribute

1. Fork the repository and clone your fork.
2. Create a branch from `main` for your change, e.g.
   `git checkout -b fix/radio-play-button`.
3. Make your change, then open a pull request against `main` with a clear
   description of what changed and why.
4. Keep pull requests focused: one feature or fix per PR.

## Local setup

```bash
npm install
npm run dev        # start the dev server on http://localhost:3000
npx tsc --noEmit   # type check
npm run build      # production build (must pass before a PR is merged)
```

No secrets or environment variables are needed to build or run the site
locally. Do not add any credentials to get it running.

## Pull request checklist

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] The change is described in the PR (what and why, not just what).
- [ ] UI changes include a screenshot or screen recording.
- [ ] No new dependencies were added without a reason in the PR description.

## Code style

- TypeScript, strict mode. Avoid `any` where a real type is possible.
- Tailwind CSS for styling; follow the existing class patterns in the file
  you are editing.
- Match the surrounding code style (formatting, naming, file layout) rather
  than reformatting whole files.
- Keep user-facing text in the `src/i18n/` dictionaries (English,
  Indonesian, Korean) instead of hard-coding strings in components.

## Project-specific rules

- **Never include credentials, tokens, session cookies, webhook URLs or
  passwords in issues, pull requests, code, screenshots or commit messages.**
  If you find one accidentally committed, report it privately — see
  [SECURITY.md](SECURITY.md) — do not post it in an issue.
- Do not add `revalidate` or `dynamic` segment exports; dynamic pages use
  `await connection()`. Do not use `Date.now()` in data fetchers, and do not
  use `dynamicParams` (it is incompatible with `cacheComponents`).
- The site mirrors third-party content; do not add new upstream sources
  without noting where the data comes from in the PR description.

## Reporting bugs

Use the bug report issue template. Include the page URL, what you expected,
what happened instead, and your browser/OS if it is a rendering or playback
problem.
