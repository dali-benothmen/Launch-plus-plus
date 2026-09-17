import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootFlagIndex = process.argv.indexOf("--root");
const root = path.resolve(
  rootFlagIndex >= 0 && process.argv[rootFlagIndex + 1]
    ? process.argv[rootFlagIndex + 1]
    : process.cwd(),
);
const configPath = path.join(root, "config", "architecture-boundaries.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const packageNamePattern = new RegExp(config.packageNamePattern);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const dependencyFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "devDependencies",
];
const runtimeDependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];
const errors = [];
const packagePolicies = new Map();

for (const policy of config.packages) {
  if (packagePolicies.has(policy.name)) {
    errors.push(`Duplicate architecture policy for ${policy.name}`);
  }
  packagePolicies.set(policy.name, policy);
}

function toPatternRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`);
}

function matches(pattern, value) {
  return toPatternRegex(pattern).test(value);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function findWorkspacePackages() {
  const packages = [];

  for (const workspaceRoot of config.workspaceRoots) {
    const absoluteRoot = path.join(root, workspaceRoot);
    if (!(await exists(absoluteRoot))) continue;

    const entries = await readdir(absoluteRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const directory = path.join(absoluteRoot, entry.name);
      const manifestPath = path.join(directory, "package.json");
      if (!(await exists(manifestPath))) continue;

      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      packages.push({ directory, manifest, manifestPath });
    }
  }

  return packages;
}

async function walkSourceFiles(directory) {
  if (!(await exists(directory))) return [];

  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkSourceFiles(target)));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(target);
    }
  }
  return files;
}

function dependencyNames(manifest, fields = dependencyFields) {
  return new Set(fields.flatMap((field) => Object.keys(manifest[field] ?? {})));
}

function findImports(source) {
  const imports = [];
  const pattern = /(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

function workspacePackageName(specifier) {
  if (!/^@launchpp(?:-internal)?\//.test(specifier)) return null;
  return specifier.split("/").slice(0, 2).join("/");
}

function detectCycles(packagesByName) {
  const visited = new Set();
  const active = new Set();
  const trail = [];

  function visit(name) {
    if (active.has(name)) {
      const start = trail.indexOf(name);
      errors.push(`Workspace dependency cycle: ${[...trail.slice(start), name].join(" -> ")}`);
      return;
    }
    if (visited.has(name)) return;

    visited.add(name);
    active.add(name);
    trail.push(name);

    const current = packagesByName.get(name);
    if (current) {
      for (const dependency of dependencyNames(current.manifest, runtimeDependencyFields)) {
        if (packagesByName.has(dependency)) visit(dependency);
      }
    }

    trail.pop();
    active.delete(name);
  }

  for (const name of packagesByName.keys()) visit(name);
}

const packages = await findWorkspacePackages();
const packagesByName = new Map();
let sourceFileCount = 0;

for (const workspacePackage of packages) {
  const { directory, manifest, manifestPath } = workspacePackage;
  const relativeManifest = path.relative(root, manifestPath);

  if (!manifest.name || !packageNamePattern.test(manifest.name)) {
    errors.push(`${relativeManifest}: package name must match ${config.packageNamePattern}`);
    continue;
  }
  if (packagesByName.has(manifest.name)) {
    errors.push(`${relativeManifest}: duplicate workspace package name ${manifest.name}`);
    continue;
  }
  packagesByName.set(manifest.name, workspacePackage);

  const policy = packagePolicies.get(manifest.name);
  if (!policy) {
    errors.push(`${relativeManifest}: ${manifest.name} has no architecture ownership policy`);
    continue;
  }

  const actualDirectory = path.relative(root, directory).split(path.sep).join("/");
  if (policy.path !== actualDirectory) {
    errors.push(
      `${relativeManifest}: ${manifest.name} must live at ${policy.path}, not ${actualDirectory}`,
    );
  }

  if (policy.visibility === "internal" && manifest.private !== true) {
    errors.push(`${relativeManifest}: internal package ${manifest.name} must set private: true`);
  }
  if (policy.visibility === "public" && manifest.private === true) {
    errors.push(`${relativeManifest}: public package ${manifest.name} must not set private: true`);
  }

  if (actualDirectory.startsWith("packages/")) {
    const rootExport = manifest.exports?.["."];
    if (!rootExport) {
      errors.push(
        `${relativeManifest}: library package ${manifest.name} must define a root export`,
      );
    } else if (JSON.stringify(rootExport).includes("/src/")) {
      errors.push(`${relativeManifest}: package exports must not expose private source paths`);
    }
  }

  const declaredDependencies = dependencyNames(manifest);
  const allowedWorkspaceDependencies = new Set(policy.allowWorkspaceDependencies);
  for (const dependency of declaredDependencies) {
    if (packagePolicies.has(dependency) && !allowedWorkspaceDependencies.has(dependency)) {
      errors.push(
        `${relativeManifest}: ${manifest.name} is not allowed to depend on workspace package ${dependency}`,
      );
    }
  }
  for (const rule of config.rules) {
    if (!matches(rule.from, manifest.name)) continue;
    for (const deniedPattern of rule.deny) {
      for (const dependency of declaredDependencies) {
        if (matches(deniedPattern, dependency)) {
          errors.push(
            `${relativeManifest}: ${manifest.name} must not depend on ${dependency} (${deniedPattern})`,
          );
        }
      }
    }
  }

  const sourceFiles = await walkSourceFiles(path.join(directory, "src"));
  sourceFileCount += sourceFiles.length;
  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    const relativeSource = path.relative(root, sourceFile);

    for (const specifier of findImports(source)) {
      if (/^@launchpp(?:-internal)?\/[^/]+\/src(?:\/|$)/.test(specifier)) {
        errors.push(`${relativeSource}: private source import is forbidden: ${specifier}`);
      }

      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(sourceFile), specifier);
        const relativeToPackage = path.relative(directory, resolved);
        if (relativeToPackage.startsWith("..") || path.isAbsolute(relativeToPackage)) {
          errors.push(
            `${relativeSource}: relative import crosses a package boundary: ${specifier}`,
          );
        }
        continue;
      }

      const importedPackage = workspacePackageName(specifier);
      if (
        importedPackage &&
        importedPackage !== manifest.name &&
        !declaredDependencies.has(importedPackage)
      ) {
        errors.push(
          `${relativeSource}: workspace import ${importedPackage} is not declared in ${manifest.name}`,
        );
      }
    }
  }
}

for (const policy of packagePolicies.values()) {
  if (!packagesByName.has(policy.name)) {
    errors.push(`Architecture policy references missing package ${policy.name} at ${policy.path}`);
  }
}

detectCycles(packagesByName);

if (errors.length > 0) {
  process.stderr.write(
    `Architecture boundary check failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Architecture boundary check passed (${packages.length} packages, ${sourceFileCount} source files).\n`,
  );
}
