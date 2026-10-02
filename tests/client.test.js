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


test("supports the baseUrl alias and custom headers", async () => {
  let request;
  const client = new XMRigProxyClient({
    baseUrl: "https://proxy.example.test/base/",
    fetch: async (url, options) => {
      request = { url, options };
      return mockResponse({ ok: true });
    },
  });

  await client.getConnection({
    headers: {
      Accept: "application/custom+json",
    },
  });

  assert.equal(request.url, "https://proxy.example.test/1/connection");
  assert.equal(request.options.headers.get("Accept"), "application/custom+json");
});

test("client token overrides a caller-supplied Authorization header", async () => {
  let headers;
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    token: "configured",
    fetch: async (_url, options) => {
      headers = options.headers;
      return mockResponse({ ok: true });
    },
  });

  await client.getInfo({
    headers: {
      Authorization: "Bearer caller",
    },
  });

  assert.equal(headers.get("Authorization"), "Bearer configured");
});

test("rejects non-JSON responses with a bounded cause", async () => {
  const body = "x".repeat(500);
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => mockResponse(null, {
      contentType: "text/plain",
      rawBody: body,
    }),
  });

  await assert.rejects(
    () => client.getInfo(),
    error => {
      assert.ok(error instanceof XMRigProxyError);
      assert.equal(error.cause?.message.length, 200);
      assert.equal(error.cause?.message, body.slice(0, 200));
      return true;
    },
  );
});

test("wraps malformed JSON as XMRigProxyError and preserves the cause", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => mockResponse(null, {
      rawBody: "{",
    }),
  });

  await assert.rejects(
    () => client.getInfo(),
    error => {
      assert.ok(error instanceof XMRigProxyError);
      assert.equal(error.url, "https://proxy.example.test/1/");
      assert.equal(error.cause?.name, "SyntaxError");
      return true;
    },
  );
});

test("maps an already-aborted external signal to Request aborted", async () => {
  const controller = new AbortController();
  controller.abort();

  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async (_url, { signal }) => {
      if (signal.aborted) {
        throw new DOMException("aborted", "AbortError");
      }
      return mockResponse({ ok: true });
    },
  });

  await assert.rejects(
    () => client.getInfo({ signal: controller.signal }),
    error => error instanceof XMRigProxyError &&
      error.message === "Request aborted",
  );
});

test("maps a timeout to Request timed out", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    timeoutMs: 10,
    fetch: async (_url, { signal }) =>
      new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException("timed out", "TimeoutError"));
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener("abort", abort, { once: true });
      }),
  });

  await assert.rejects(
    () => client.getInfo(),
    error => error instanceof XMRigProxyError &&
      error.message === "Request timed out",
  );
});

test("wraps transport failures without including the bearer token", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    token: "never-log-this",
    fetch: async () => {
      throw new Error("socket closed");
    },
  });

  await assert.rejects(
    () => client.getInfo(),
    error => {
      assert.ok(error instanceof XMRigProxyError);
      assert.equal(error.message, "socket closed");
      assert.equal(error.cause?.message, "socket closed");
      assert.equal(error.message.includes("never-log-this"), false);
      return true;
    },
  );
});

for (const status of [401, 403, 404]) {
  test(`probeWriteAccess returns restricted for HTTP ${status}`, async () => {
    const client = new XMRigProxyClient({
      url: "https://proxy.example.test",
      fetch: async () => mockResponse({}, { status }),
    });

    assert.equal(await client.probeWriteAccess(), "restricted");
  });
}

test("probeWriteAccess returns unrestricted when config is readable", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => mockResponse({ pools: [] }),
  });

  assert.equal(await client.probeWriteAccess(), "unrestricted");
});

test("request rejects paths that do not start with a slash", async () => {
  const client = new XMRigProxyClient({
    url: "https://proxy.example.test",
    fetch: async () => mockResponse({ ok: true }),
  });

  await assert.rejects(
    () => client.request("1/summary"),
    error => error instanceof TypeError &&
      error.message === "API path must start with '/'",
  );
});
