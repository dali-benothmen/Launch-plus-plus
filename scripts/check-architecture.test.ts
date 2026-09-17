import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const checkerPath = fileURLToPath(new URL("./check-architecture.mjs", import.meta.url));
const temporaryRoots: string[] = [];

interface FixturePackage {
  dependencies?: Record<string, string>;
  name: string;
  path: string;
}

async function createFixture(packages: FixturePackage[], allowed: Record<string, string[]> = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "launchpp-boundaries-"));
  temporaryRoots.push(root);

  await mkdir(path.join(root, "config"), { recursive: true });
  await writeFile(
    path.join(root, "config", "architecture-boundaries.json"),
    JSON.stringify({
      workspaceRoots: ["packages"],
      packageNamePattern: "^@launchpp/[a-z0-9-]+$",
      packages: packages.map((fixturePackage) => ({
        name: fixturePackage.name,
        path: fixturePackage.path,
        owner: "fixture",
        visibility: "internal",
        allowWorkspaceDependencies: allowed[fixturePackage.name] ?? [],
      })),
      rules: [],
    }),
  );

  for (const fixturePackage of packages) {
    const directory = path.join(root, fixturePackage.path);
    await mkdir(path.join(directory, "src"), { recursive: true });
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({
        name: fixturePackage.name,
        private: true,
        exports: { ".": "./dist/index.js" },
        dependencies: fixturePackage.dependencies,
      }),
    );
    await writeFile(path.join(directory, "src", "index.ts"), "export {};\n");
  }

  return root;
}

async function runChecker(root: string) {
  return new Promise<{ code: number | null; stderr: string; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [checkerPath, "--root", root]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr, stdout }));
  });
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("architecture boundary checker", () => {
  it("accepts an owned package with an explicit export", async () => {
    const root = await createFixture([{ name: "@launchpp/example", path: "packages/example" }]);

    await expect(runChecker(root)).resolves.toMatchObject({ code: 0, stderr: "" });
  });

  it("rejects a workspace dependency that is not explicitly allowed", async () => {
    const root = await createFixture([
      {
        name: "@launchpp/domain",
        path: "packages/domain",
        dependencies: { "@launchpp/database": "workspace:*" },
      },
      { name: "@launchpp/database", path: "packages/database" },
    ]);

    await expect(runChecker(root)).resolves.toMatchObject({ code: 1 });
  });

  it("rejects private source imports across package boundaries", async () => {
    const root = await createFixture(
      [
        { name: "@launchpp/consumer", path: "packages/consumer" },
        { name: "@launchpp/provider", path: "packages/provider" },
      ],
      { "@launchpp/consumer": ["@launchpp/provider"] },
    );
    await writeFile(
      path.join(root, "packages", "consumer", "src", "index.ts"),
      'export { value } from "@launchpp/provider/src/internal";\n',
    );

    await expect(runChecker(root)).resolves.toMatchObject({ code: 1 });
  });
});
