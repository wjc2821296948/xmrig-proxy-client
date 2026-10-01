import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, ".github-package");
const packageJsonPath = path.join(root, "package.json");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
packageJson.name = "@wjc2821296948/xmrig-proxy-client";

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of ["src", "tests", "README.md", "LICENSE"]) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

await writeFile(
  path.join(output, "package.json"),
  JSON.stringify(packageJson, null, 2) + "\n",
  "utf8",
);
