import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const required = {
  name: "xmrig-proxy-client",
  type: "module",
  license: "Apache-2.0",
};

for (const [key, expected] of Object.entries(required)) {
  if (packageJson[key] !== expected) {
    throw new Error(
      "package.json " + key + " must be " + JSON.stringify(expected) +
      ", got " + JSON.stringify(packageJson[key]),
    );
  }
}

if (!/^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  throw new Error("package.json version must be a valid SemVer string, got " + JSON.stringify(packageJson.version));
}

if (packageJson.exports?.["."]?.import !== "./src/index.js") {
  throw new Error('package.json "." import export must be "./src/index.js"');
}

if (packageJson.engines?.node !== ">=18") {
  throw new Error('package.json engines.node must be ">=18"');
}

const expectedFiles = ["LICENSE", "README.md", "src"];
const actualFiles = [...(packageJson.files ?? [])].sort();

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(
    "package.json files must be " + JSON.stringify(expectedFiles) +
    ", got " + JSON.stringify(actualFiles),
  );
}

const moduleExports = await import(pathToFileURL("src/index.js").href);
for (const exportName of [
  "XMRigProxyClient",
  "XMRigProxyError",
  "createStatusTracker",
  "resetStatusTracker",
  "getStatusInfo",
  "getRecentMinerPeak",
  "getAcceptanceRate",
]) {
  if (!(exportName in moduleExports)) {
    throw new Error("src/index.js is missing export " + exportName);
  }
}

console.log("Package metadata and module exports are valid.");
