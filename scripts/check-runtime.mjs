import process from "node:process";

const expectedNodeMajor = 24;
const currentNodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

if (currentNodeMajor !== expectedNodeMajor) {
  console.error(
    `Launch++ requires Node.js ${expectedNodeMajor}.x; received ${process.versions.node}. ` +
      "Use the version declared in .node-version or .nvmrc.",
  );
  process.exitCode = 1;
} else {
  console.log(`Runtime check passed (Node.js ${process.versions.node}).`);
}
