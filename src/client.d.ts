export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface XMRigProxyMinerStats {
  now?: number | string;
  max?: number | string;
  [key: string]: unknown;
}

export interface XMRigProxyResults {
  accepted?: number | string;
  rejected?: number | string;
  [key: string]: unknown;
}

export interface XMRigProxySummary {
  uptime?: number | string;
  miners?: XMRigProxyMinerStats;
  results?: XMRigProxyResults;
  hashrate?: JsonValue;
  [key: string]: unknown;
}

export type XMRigProxyInfo = { [key: string]: unknown };
export type XMRigProxyConnection = { [key: string]: unknown };
export type XMRigProxyConfig = { [key: string]: unknown };

export interface XMRigProxyRequestOptions {
  method?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  body?: BodyInit | null;
  [key: string]: unknown;
}

export interface XMRigProxyClientOptions {
  url?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetch?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

export interface XMRigProxyErrorOptions {
  status?: number | null;
  cause?: unknown;
  url?: string | null;
}

export class XMRigProxyError extends Error {
  status: number | null;
  cause: unknown;
  url: string | null;

  constructor(message: string, options?: XMRigProxyErrorOptions);
}

export class XMRigProxyClient {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  fetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;

  constructor(options?: XMRigProxyClientOptions);

  request<T = JsonValue>(
    path: string,
    options?: XMRigProxyRequestOptions,
  ): Promise<T>;

  getInfo(options?: XMRigProxyRequestOptions): Promise<XMRigProxyInfo>;
  getSummary(options?: XMRigProxyRequestOptions): Promise<XMRigProxySummary>;
  getConnection(options?: XMRigProxyRequestOptions): Promise<XMRigProxyConnection>;
  getConfig(options?: XMRigProxyRequestOptions): Promise<XMRigProxyConfig>;
  probeWriteAccess(
    options?: XMRigProxyRequestOptions,
  ): Promise<"unrestricted" | "restricted" | "unknown">;
}
