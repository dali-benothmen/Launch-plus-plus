#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { packPluginDirectory } from "./package-builder.js";

const [inputDirectory, outputFile] = process.argv.slice(2);
if (inputDirectory === undefined || outputFile === undefined) {
  process.stderr.write(
    "Usage: launchpp-pack <normalized-package-directory> <output.launch-plugin>\n",
  );
  process.exitCode = 1;
} else if (!outputFile.endsWith(".launch-plugin")) {
  process.stderr.write("The output filename must end with .launch-plugin.\n");
  process.exitCode = 1;
} else {
  try {
    const packed = await packPluginDirectory(inputDirectory);
    const absoluteOutput = path.resolve(outputFile);
    await mkdir(path.dirname(absoluteOutput), { recursive: true });
    await writeFile(absoluteOutput, packed.archive);
    process.stdout.write(`${absoluteOutput}\nsha256:${packed.packageHash}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Plugin packing failed."}\n`);
    process.exitCode = 1;
  }
}
