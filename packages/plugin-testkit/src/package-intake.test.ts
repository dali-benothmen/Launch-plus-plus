import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  PLUGIN_ARCHIVE_ERROR_CODES,
  PluginArchiveError,
  inspectPluginArchive,
  installPluginArchive,
  type PluginArchiveErrorCode,
} from "@launchpp/plugin-runtime";
import { strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { packPluginDirectory } from "./package-builder.js";

let temporaryDirectory: string;
let packageDirectory: string;

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createNormalizedPackage(): Promise<void> {
  packageDirectory = path.join(temporaryDirectory, "normalized");
  await mkdir(path.join(packageDirectory, "browser", "surfaces", "overview"), {
    recursive: true,
  });
  await writeFile(
    path.join(packageDirectory, "manifest.json"),
    `${JSON.stringify(
      {
        apiVersion: "0",
        browser: {
          surfaces: {
            overview: { document: "./browser/surfaces/overview/index.html" },
          },
        },
        contributes: {
          pages: [
            {
              id: "overview",
              path: "overview",
              scope: "project",
              surface: "overview",
              title: "Overview",
            },
          ],
        },
        id: "acme.package-proof",
        name: "Package Proof",
        permissions: ["projects:read"],
        version: "1.0.0",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(packageDirectory, "browser", "surfaces", "overview", "index.html"),
    "<!doctype html><title>Package proof</title>",
  );
}

async function expectArchiveCode(
  action: () => unknown | Promise<unknown>,
  code: PluginArchiveErrorCode,
): Promise<void> {
  try {
    await action();
    throw new Error(`Expected archive operation to fail with ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(PluginArchiveError);
    expect((error as PluginArchiveError).code).toBe(code);
  }
}

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), "launchpp-package-proof-"));
  await createNormalizedPackage();
});

afterEach(async () => {
  await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("deterministic plugin packing", () => {
  it("produces byte-identical archives and hashes regardless of source mtimes", async () => {
    const first = await packPluginDirectory(packageDirectory);
    const future = new Date("2035-05-06T12:34:56.000Z");
    await utimes(path.join(packageDirectory, "manifest.json"), future, future);
    const second = await packPluginDirectory(packageDirectory);

    expect(Buffer.from(second.archive).equals(Buffer.from(first.archive))).toBe(true);
    expect(second.packageHash).toBe(first.packageHash);
    expect(second.integrity).toEqual(first.integrity);
  });

  it("generates a complete integrity document accepted by intake", async () => {
    const packed = await packPluginDirectory(packageDirectory);
    const inspected = inspectPluginArchive(packed.archive);

    expect(inspected.packageHash).toBe(packed.packageHash);
    expect(inspected.manifest.id).toBe("acme.package-proof");
    expect(Object.keys(inspected.integrity.files)).toEqual([
      "browser/surfaces/overview/index.html",
      "manifest.json",
    ]);
  });
});

describe("non-executing plugin intake", () => {
  it("installs immutable files atomically without a compiler or package manager", async () => {
    const packed = await packPluginDirectory(packageDirectory);
    const installationRoot = path.join(temporaryDirectory, "installed");
    const pathKey = "PATH";
    const previousPath = process.env[pathKey];
    delete process.env[pathKey];
    try {
      const installed = await installPluginArchive(packed.archive, installationRoot);
      expect(installed.alreadyInstalled).toBe(false);
      expect(await readFile(path.join(installed.directory, "manifest.json"), "utf8")).toContain(
        "acme.package-proof",
      );
      const repeated = await installPluginArchive(packed.archive, installationRoot);
      expect(repeated.alreadyInstalled).toBe(true);
      expect(repeated.directory).toBe(installed.directory);
    } finally {
      if (previousPath === undefined) delete process.env[pathKey];
      else process.env[pathKey] = previousPath;
    }
  });

  it("rejects traversal before creating an installation root", async () => {
    const archive = zipSync({
      "../escaped.txt": strToU8("escaped"),
      "manifest.json": strToU8("{}"),
    });
    const installationRoot = path.join(temporaryDirectory, "traversal-install");

    await expectArchiveCode(
      () => installPluginArchive(archive, installationRoot),
      PLUGIN_ARCHIVE_ERROR_CODES.forbiddenPath,
    );
    expect(await exists(path.join(temporaryDirectory, "escaped.txt"))).toBe(false);
    expect(await exists(installationRoot)).toBe(false);
  });

  it("rejects npm lifecycle metadata without executing it", async () => {
    const marker = path.join(temporaryDirectory, "install-script-ran");
    const archive = zipSync({
      "manifest.json": strToU8("{}"),
      "package.json": strToU8(
        JSON.stringify({
          scripts: {
            install: `node -e "require('fs').writeFileSync('${marker}','bad')"`,
          },
        }),
      ),
    });

    await expectArchiveCode(
      () => inspectPluginArchive(archive),
      PLUGIN_ARCHIVE_ERROR_CODES.forbiddenPath,
    );
    expect(await exists(marker)).toBe(false);
  });

  it("rejects a file changed after integrity generation", async () => {
    const packed = await packPluginDirectory(packageDirectory);
    const files = unzipSync(packed.archive);
    files["browser/surfaces/overview/index.html"] = strToU8("tampered");
    const tampered = zipSync(files, { mtime: new Date(1980, 0, 1) });

    await expectArchiveCode(
      () => inspectPluginArchive(tampered),
      PLUGIN_ARCHIVE_ERROR_CODES.integrityMismatch,
    );
  });

  it("rejects high-ratio archives before expansion", async () => {
    const archive = zipSync({
      "assets/repeated.txt": strToU8("x".repeat(200_000)),
      "manifest.json": strToU8("{}"),
    });

    await expectArchiveCode(
      () => inspectPluginArchive(archive, { maxCompressionRatio: 2 }),
      PLUGIN_ARCHIVE_ERROR_CODES.zipBomb,
    );
  });
});
