const DEFAULTS = Object.freeze({
  peakWindowMs: 15 * 60 * 1000,
  zeroGraceMs: 20 * 1000,
  restartGraceMs: 30 * 1000,
  recoverySamples: 2,
  warningRatio: 0.5,
  minHealthShares: 20,
  healthWindowMs: 15 * 60 * 1000,
  coldStartWindowMs: 60 * 1000,
});

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function makeStatus(cls, text) {
  return { cls, text };
}

export function createStatusTracker(options = {}) {
  return {
    cfg: { ...DEFAULTS, ...options },
    previousUptime: null,
    restartUntil: 0,
    zeroSince: null,
    recoveryCount: 0,
    everHadMiners: false,
    samples: [],
    lastStableStatus: null,
  };
}

export function resetStatusTracker(tracker) {
  if (!tracker) return;
  tracker.previousUptime = null;
  tracker.restartUntil = 0;
  tracker.zeroSince = null;
  tracker.recoveryCount = 0;
  tracker.everHadMiners = false;
  tracker.samples = [];
  tracker.lastStableStatus = null;
}

function trimSamples(tracker, nowMs) {
  const cutoff = nowMs - tracker.cfg.peakWindowMs;
  tracker.samples = tracker.samples.filter(sample => sample.ts >= cutoff);
}

function recordSample(tracker, data, nowMs) {
  const miners = data?.miners ?? {};
  const results = data?.results ?? {};

  const minerCount = asNumber(miners.now);
  const accepted = asNumber(results.accepted);
  const rejected = asNumber(results.rejected);

  if (minerCount > 0) tracker.everHadMiners = true;

  tracker.samples.push({
    ts: nowMs,
    miners: minerCount,
    accepted,
    rejected,
  });

  trimSamples(tracker, nowMs);

  return { minerCount, accepted, rejected };
}

function detectRestart(tracker, uptime, nowMs, minerCount) {
  if (
    tracker.previousUptime !== null &&
    Number.isFinite(uptime) &&
    uptime < tracker.previousUptime
  ) {
    tracker.restartUntil = minerCount === 0
      ? nowMs + tracker.cfg.restartGraceMs
      : 0;

    tracker.samples = [];
    tracker.zeroSince = minerCount === 0 ? nowMs : null;
    tracker.recoveryCount = 0;
    tracker.lastStableStatus = null;
  }

  if (Number.isFinite(uptime)) {
    tracker.previousUptime = uptime;
  }
}

function getRecentPeak(tracker) {
  if (tracker.samples.length === 0) return 0;
  return Math.max(...tracker.samples.map(sample => sample.miners));
}

function getRecentAcceptanceRate(tracker) {
  if (tracker.samples.length < 2) return null;

  const first = tracker.samples[tracker.samples.length - 2];
  const last = tracker.samples[tracker.samples.length - 1];

  if (last.ts - first.ts > tracker.cfg.healthWindowMs) return null;

  const acceptedDelta = last.accepted - first.accepted;
  const rejectedDelta = last.rejected - first.rejected;

  if (acceptedDelta < 0 || rejectedDelta < 0) return null;

  const total = acceptedDelta + rejectedDelta;
  if (total < tracker.cfg.minHealthShares) return null;

  return acceptedDelta / total;
}

export function getRecentMinerPeak(tracker) {
  return getRecentPeak(tracker);
}

export function getAcceptanceRate(tracker) {
  return getRecentAcceptanceRate(tracker);
}

export function getStatusInfo(data, tracker, nowMs = Date.now()) {
  if (!tracker) throw new Error("status tracker is required");

  if (!data || !data.miners) {
    return makeStatus("status-offline", "离线");
  }

  const minerCount = asNumber(data.miners.now);
  const historicalMax = asNumber(data.miners.max);
  const uptime = asNumber(data.uptime, NaN);

  detectRestart(tracker, uptime, nowMs, minerCount);

  if (nowMs < tracker.restartUntil) {
    return makeStatus("status-restarting", "重启中");
  }

  recordSample(tracker, data, nowMs);

  if (
    minerCount === 0 &&
    !tracker.everHadMiners &&
    historicalMax === 0 &&
    Number.isFinite(uptime) &&
    uptime < tracker.cfg.coldStartWindowMs / 1000
  ) {
    tracker.zeroSince ??= nowMs;
    return makeStatus("status-waiting", "等待中");
  }

  if (minerCount === 0) {
    tracker.zeroSince ??= nowMs;
    const zeroAge = nowMs - tracker.zeroSince;

    if (zeroAge < tracker.cfg.zeroGraceMs) {
      if (tracker.lastStableStatus) return tracker.lastStableStatus;
      return makeStatus("status-waiting", "等待中");
    }

    tracker.recoveryCount = 0;
    const offline = makeStatus("status-offline", "离线");
    tracker.lastStableStatus = offline;
    return offline;
  }

  tracker.zeroSince = null;

  if (tracker.lastStableStatus?.cls === "status-offline") {
    tracker.recoveryCount++;

    if (tracker.recoveryCount < tracker.cfg.recoverySamples) {
      return makeStatus("status-warning", "预警");
    }
  } else {
    tracker.recoveryCount = tracker.cfg.recoverySamples;
  }

  const recentPeak = getRecentPeak(tracker);
  const minerWarning =
    recentPeak >= 2 &&
    minerCount < recentPeak * tracker.cfg.warningRatio;

  const acceptanceRate = getRecentAcceptanceRate(tracker);
  const healthWarning =
    acceptanceRate !== null &&
    acceptanceRate < tracker.cfg.warningRatio;

  if (minerWarning || healthWarning) {
    const warning = makeStatus("status-warning", "预警");
    tracker.lastStableStatus = warning;
    tracker.recoveryCount = tracker.cfg.recoverySamples;
    return warning;
  }

  const online = makeStatus("status-online", "在线");
  tracker.lastStableStatus = online;
  tracker.recoveryCount = tracker.cfg.recoverySamples;
  return online;
}
