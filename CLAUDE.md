# mcp-bsky

MCP server for Bluesky — a thin wrapper over the [`@kud/bsky`](https://github.com/kud/bsky) library.

## API Reference

- AT Protocol / Bluesky API: https://docs.bsky.app/
- Core library: https://github.com/kud/bsky (`@kud/bsky`)

## Auth

Reads `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` from the environment (a Bluesky **App Password** — Settings → App Passwords). These are `@kud/bsky`'s env contract (not `MCP_`-prefixed), so the credentials are shared with `@kud/bsky-cli`.

## Tools

Read: `search_posts`, `timeline`, `notifications`, `profile`, `thread`.
Write (gated behind `confirm: true`): `post`, `thread_post`, `reply`, `like`, `repost`, `follow`.

Each tool is a one-line wrapper over the corresponding `@kud/bsky` function — no business logic lives here.
