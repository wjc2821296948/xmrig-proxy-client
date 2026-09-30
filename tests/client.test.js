import { test } from "node:test";
import assert from "node:assert/strict";

import {
  XMRigProxyClient,
  XMRigProxyError,
} from "../src/index.js";

function mockResponse(body, options = {}) {
  const headers = new Headers({
    "content-type": options.contentType ?? "application/json",
  });

  return new Response(
    options.rawBody ?? JSON.stringify(body),
    {
      status: options.status ?? 200,
      headers,
    },
  );
}

test("client adds the bearer token and requests /1/summary", async () => {
  const calls = [];

  const client = new XMRigProxyClient({
    url: "https://proxy.example.test/api",
    token: "secret",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return mockResponse({ miners: { now: 3, max: 4 } });
    },
  });

  const result = await client.getSummary();

  assert.deepEqual(result.miners, { now: 3, max: 4 });
  assert.equal(calls[0].url, "https://proxy.example.test/1/summary");
  assert.equal(calls[0].options.headers.get("Authorization"), "Bearer secret");
  assert.equal(calls[0].options.method, "GET");
});

test("HTTP errors preserve status without exposing the token", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    token: "super-secret-token",
    fetch: async () => mockResponse({}, { status: 403 }),
  });

  await assert.rejects(
    () => client.getConfig(),
    error => {
      assert.ok(error instanceof XMRigProxyError);
      assert.equal(error.status, 403);
      assert.match(error.message, /403/);
      assert.doesNotMatch(error.message, /super-secret-token/);
      return true;
    },
  );
});

test("probeWriteAccess distinguishes restricted from unknown failures", async () => {
  const restricted = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => mockResponse({}, { status: 404 }),
  });

  const unknown = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => {
      throw new Error("network down");
    },
  });

  assert.equal(await restricted.probeWriteAccess(), "restricted");
  assert.equal(await unknown.probeWriteAccess(), "unknown");
});

test("constructor validates the proxy URL", () => {
  assert.throws(
    () => new XMRigProxyClient({ url: "not-a-url" }),
    /valid absolute URL/,
  );
});
