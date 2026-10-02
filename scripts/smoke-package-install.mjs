import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const tempDir = await mkdtemp(path.join(os.tmpdir(), "xmrig-proxy-client-smoke-"));

try {
  const { stdout } = await execFileAsync(
    "npm",
    ["pack", "--pack-destination", tempDir, "--json"],
    { encoding: "utf8" },
  );

  const reports = JSON.parse(stdout);
  if (!Array.isArray(reports) || reports.length !== 1 || !reports[0].filename) {
    throw new Error("npm pack did not return exactly one package artifact");
  }

  const tarball = path.join(tempDir, reports[0].filename);
  const installDir = path.join(tempDir, "install");
  await mkdir(installDir);

  await execFileAsync("npm", ["init", "--yes"], {
    cwd: installDir,
    encoding: "utf8",
  });

  await execFileAsync(
    "npm",
    [
      "install",
      tarball,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    {
      cwd: installDir,
      encoding: "utf8",
    },
  );

  const probePath = path.join(installDir, "probe.mjs");
  await writeFile(
    probePath,
    `import {
  XMRigProxyClient,
  XMRigProxyError,
  createStatusTracker,
  getStatusInfo,
} from "xmrig-proxy-client";

const client = new XMRigProxyClient({
  url: "https://proxy.example.test",
  fetch: async () =>
    new Response(JSON.stringify({
      uptime: 60,
      miners: { now: 2, max: 2 },
      results: { accepted: 20, rejected: 0 },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
});

const summary = await client.getSummary();
if (summary.miners.now !== 2) {
  throw new Error("Installed package returned an unexpected summary");
}

const tracker = createStatusTracker();
const status = getStatusInfo(summary, tracker, 0);
if (status.cls !== "status-online") {
  throw new Error("Installed package returned an unexpected health status");
}

if (typeof XMRigProxyError !== "function") {
  throw new Error("Installed package is missing XMRigProxyError");
}
`,
    "utf8",
  );

  await execFileAsync(process.execPath, [probePath], {
    cwd: installDir,
    encoding: "utf8",
  });

  console.log("Installed package smoke test passed.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
