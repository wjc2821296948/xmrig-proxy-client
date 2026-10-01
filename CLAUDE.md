# CLAUDE.md

This file provides guidance to coding agents working in this repository.

## Project Positioning

`xmrig-proxy-client` is a zero-dependency JavaScript library for the XMRig Proxy HTTP API and miner health monitoring.

## Architecture

- `src/client.js`: HTTP transport, Bearer authentication, timeout handling, API errors, and read-only endpoint helpers.
- `src/health.js`: temporal miner-health state machine and acceptance-rate helpers.
- `src/index.js`: public exports.
- `tests/`: Node's built-in test suite.

## Development Principles

1. Keep runtime dependencies at zero unless there is a documented technical reason.
2. Preserve browser, Node.js, Deno, Bun, and edge-runtime compatibility.
3. Never log or persist API tokens.
4. Keep the public API backwards compatible within a release line.
5. Use standard Web Platform APIs instead of Node-only APIs in runtime code.
6. Keep HTTP operations read-only; do not add implicit configuration-management or write endpoints.
7. Add or update tests for behavior changes.

## Code Conventions

- Use ESM syntax.
- Use `camelCase` for variables/functions and `PascalCase` for classes.
- Public APIs and non-obvious logic should have JSDoc.
- Normalize external failures into `XMRigProxyError` while preserving HTTP status where available.
- Never include credentials or Authorization headers in error messages or logs.

## Release

- `package.json` remains the npmjs.com package named `xmrig-proxy-client`.
- GitHub Packages publication uses the scoped alias `@wjc2821296948/xmrig-proxy-client` generated only during CI.
- Releases use tags matching the package version, for example `v0.1.0`.
