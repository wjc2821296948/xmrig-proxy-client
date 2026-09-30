const DEFAULT_TIMEOUT_MS = 8000;

export class XMRigProxyError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "XMRigProxyError";
    this.status = options.status ?? null;
    this.cause = options.cause;
    this.url = options.url ?? null;
  }
}

function normalizeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("XMRig Proxy URL is required");
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new TypeError("XMRig Proxy URL must be a valid absolute URL");
  }
}

function getFetchImpl(customFetch) {
  const fetchImpl = customFetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation is available");
  }
  return fetchImpl;
}

function createTimeoutSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();
  let timeoutId = null;

  const abort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      abort();
    } else {
      externalSignal.addEventListener("abort", abort, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup() {
      if (timeoutId !== null) clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abort);
    },
  };
}

export class XMRigProxyClient {
  constructor(options = {}) {
    this.baseUrl = normalizeUrl(options.url ?? options.baseUrl);
    this.token = typeof options.token === "string" ? options.token : "";
    this.timeoutMs = Math.max(0, Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS) || 0);
    this.fetch = getFetchImpl(options.fetch);
  }

  async request(path, options = {}) {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new TypeError("API path must start with '/'");
    }

    const url = new URL(path, this.baseUrl).toString();
    const headers = new Headers(options.headers ?? {});
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const timeout = createTimeoutSignal(this.timeoutMs, options.signal);

    try {
      const response = await this.fetch(url, {
        ...options,
        method: options.method ?? "GET",
        headers,
        signal: timeout.signal,
      });

      if (!response.ok) {
        throw new XMRigProxyError(`XMRig Proxy returned HTTP ${response.status}`, {
          status: response.status,
          url,
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        const text = await response.text();
        throw new XMRigProxyError("XMRig Proxy returned a non-JSON response", {
          url,
          cause: new Error(text.slice(0, 200)),
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof XMRigProxyError) {
        throw error;
      }

      if (error?.name === "TimeoutError") {
        throw new XMRigProxyError("Request timed out", { url, cause: error });
      }

      if (error?.name === "AbortError") {
        throw new XMRigProxyError("Request aborted", { url, cause: error });
      }

      throw new XMRigProxyError(error?.message ?? "XMRig Proxy request failed", {
        url,
        cause: error,
      });
    } finally {
      timeout.cleanup();
    }
  }

  getInfo(options = {}) {
    return this.request("/1/", options);
  }

  getSummary(options = {}) {
    return this.request("/1/summary", options);
  }

  getConnection(options = {}) {
    return this.request("/1/connection", options);
  }

  getConfig(options = {}) {
    return this.request("/1/config", options);
  }

  async probeWriteAccess(options = {}) {
    try {
      await this.getConfig(options);
      return "unrestricted";
    } catch (error) {
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        return "restricted";
      }
      return "unknown";
    }
  }
}
