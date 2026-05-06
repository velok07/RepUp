const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const backendRoot = path.resolve(__dirname, "..");
const caBundlePath = path.resolve(backendRoot, "certs", "cacert.pem");

const env = { ...process.env };

if (fs.existsSync(caBundlePath)) {
  env.NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS || caBundlePath;
  env.SSL_CERT_FILE = env.SSL_CERT_FILE || caBundlePath;
  env.CURL_CA_BUNDLE = env.CURL_CA_BUNDLE || caBundlePath;
}

const child = spawn(process.execPath, [path.resolve(backendRoot, "dist", "server.js")], {
  cwd: backendRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("[backend] failed to start runtime with custom CA bundle", error);
  process.exit(1);
});
