import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
});

const reports = JSON.parse(stdout);
if (!Array.isArray(reports) || reports.length !== 1) {
  throw new Error("Expected npm pack --dry-run to return exactly one package report");
}

const files = reports[0].files?.map((file) => file.path) ?? [];
const requiredFiles = [
  "package.json",
  "README.md",
  "LICENSE",
  "src/client.js",
  "src/health.js",
  "src/index.js",
];

for (const file of requiredFiles) {
  if (!files.includes(file)) {
    throw new Error("Published package is missing " + file);
  }
}

const forbiddenPrefixes = ["tests/", ".github/", "scripts/"];
for (const file of files) {
  if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
    throw new Error("Published package contains forbidden path " + file);
  }
}

console.log("npm package contents are valid.");
console.log(files.join("\n"));
