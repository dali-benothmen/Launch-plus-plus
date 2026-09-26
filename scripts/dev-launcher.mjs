#!/usr/bin/env node

import { cancel, intro, isCancel, multiselect, outro } from "@clack/prompts";
import concurrently from "concurrently";

const services = [
  {
    command: "pnpm dev:server",
    env: {
      LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY:
        process.env.LAUNCHPP_ORGANIZATION_REGISTRATION_POLICY ?? "open",
    },
    hint: "Fastify with automatic rebuilds and restarts",
    label: "Backend server",
    name: "SERVER",
    prefixColor: "green",
    value: "server",
  },
  {
    command: "pnpm dev:web",
    hint: "Vite development server",
    label: "Web application",
    name: "WEB",
    prefixColor: "cyan",
    value: "web",
  },
  {
    command: "pnpm ui:showcase",
    hint: "Shared component library",
    label: "UI component showcase",
    name: "UI",
    prefixColor: "magenta",
    value: "ui",
  },
];

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write(
      "The Launch++ development launcher requires an interactive terminal. Use a direct development script in non-interactive environments.\n",
    );
    process.exitCode = 1;
    return;
  }

  intro("Launch++ development");

  const selectedValues = await multiselect({
    message: "What would you like to run?",
    options: services.map(({ hint, label, value }) => ({ hint, label, value })),
    initialValues: ["server", "web"],
    required: true,
  });

  if (isCancel(selectedValues)) {
    cancel("Development launcher cancelled.");
    return;
  }

  const selectedServices = services.filter(({ value }) => selectedValues.includes(value));
  outro(`Starting ${selectedServices.map(({ label }) => label).join(", ")}...`);

  const { result } = concurrently(
    selectedServices.map(({ command, env, name, prefixColor }) => ({
      command,
      ...(env ? { env } : {}),
      name,
      prefixColor,
    })),
    {
      handleInput: true,
      killOthersOn: ["failure"],
      prefix: "[{name}]",
      successCondition: "all",
    },
  );

  try {
    await result;
  } catch {
    process.exitCode = 1;
  }
}

void main();
