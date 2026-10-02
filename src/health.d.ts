import type {
  XMRigProxyMinerStats,
  XMRigProxyResults,
} from "./client.d.ts";

export interface StatusTrackerConfig {
  peakWindowMs: number;
  zeroGraceMs: number;
  restartGraceMs: number;
  recoverySamples: number;
  warningRatio: number;
  minHealthShares: number;
  healthWindowMs: number;
  coldStartWindowMs: number;
}

export interface StatusTrackerOptions {
  peakWindowMs?: number;
  zeroGraceMs?: number;
  restartGraceMs?: number;
  recoverySamples?: number;
  warningRatio?: number;
  minHealthShares?: number;
  healthWindowMs?: number;
  coldStartWindowMs?: number;
}

export interface StatusTracker {
  cfg: StatusTrackerConfig;
  previousUptime: number | null;
  restartUntil: number;
  zeroSince: number | null;
  recoveryCount: number;
  everHadMiners: boolean;
  samples: Array<{
    ts: number;
    miners: number;
    accepted: number;
    rejected: number;
  }>;
  lastStableStatus: StatusInfo | null;
}

export interface StatusInfo {
  cls:
    | "status-online"
    | "status-warning"
    | "status-offline"
    | "status-restarting"
    | "status-waiting";
  text: "在线" | "预警" | "离线" | "重启中" | "等待中";
}

export interface HealthSummary {
  uptime?: number | string;
  miners?: XMRigProxyMinerStats;
  results?: XMRigProxyResults;
  [key: string]: unknown;
}

export function createStatusTracker(
  options?: StatusTrackerOptions,
): StatusTracker;

export function resetStatusTracker(tracker: StatusTracker): void;

export function getStatusInfo(
  data: HealthSummary | null | undefined,
  tracker: StatusTracker,
  nowMs?: number,
): StatusInfo;

export function getRecentMinerPeak(tracker: StatusTracker): number;

export function getAcceptanceRate(tracker: StatusTracker): number | null;
