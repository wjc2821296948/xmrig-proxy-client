export {
  XMRigProxyClient,
  XMRigProxyError,
} from "./client.js";

export {
  createStatusTracker,
  resetStatusTracker,
  getStatusInfo,
  getRecentMinerPeak,
  getAcceptanceRate,
} from "./health.js";

export type {
  JsonPrimitive,
  JsonValue,
  XMRigProxyMinerStats,
  XMRigProxyResults,
  XMRigProxySummary,
  XMRigProxyInfo,
  XMRigProxyConnection,
  XMRigProxyConfig,
  XMRigProxyRequestOptions,
  XMRigProxyClientOptions,
  XMRigProxyErrorOptions,
} from "./client.d.ts";

export type {
  StatusTrackerConfig,
  StatusTrackerOptions,
  StatusTracker,
  StatusInfo,
  HealthSummary,
} from "./health.d.ts";
