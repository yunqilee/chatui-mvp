import { spawn } from "child_process";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`${command} exited with code ${code}`));
      else resolve();
    });
  });
}

async function main() {
  console.log("Starting server...");
  const serverProcess = spawn("node", ["index.js"], {
    cwd: "server",
    env: { ...process.env },
    stdio: "inherit",
    shell: true,
  });

  const cleanup = () => {
    if (!serverProcess.killed) serverProcess.kill();
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
  process.on("exit", cleanup);

  await new Promise((r) => setTimeout(r, 1500));

  console.log("Starting Vite dev server...");
  try {
    await runCommand("npm", ["run", "dev:vite"]);
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
