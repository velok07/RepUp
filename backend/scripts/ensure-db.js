require("dotenv/config");

const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const backendRoot = path.resolve(__dirname, "..");

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const databaseUrl = new URL(connectionString);
  const certificatePath = path.resolve(backendRoot, "certs", "timeweb-ca.crt");
  const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();
  const hasCertificate = fs.existsSync(certificatePath);
  const ssl =
    sslMode === "require"
      ? { rejectUnauthorized: false }
      : hasCertificate
        ? {
            ca: fs.readFileSync(certificatePath, "utf8"),
            rejectUnauthorized: true,
          }
        : undefined;

  return new Pool({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 5432),
    database: databaseUrl.pathname.replace(/^\//, ""),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    ssl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });
}

async function main() {
  const pool = createPool();

  try {
    const check = await pool.query(`SELECT to_regclass('"User"') AS "userTable"`);
    const hasSchema = Boolean(check.rows[0]?.userTable);

    if (hasSchema) {
      console.log("[db:ensure] schema already exists");
      return;
    }

    const migrationPath = path.resolve(
      backendRoot,
      "prisma",
      "migrations",
      "20260329082504_init",
      "migration.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    await pool.query(sql);
    console.log("[db:ensure] init schema applied");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[db:ensure] failed", error);
  process.exitCode = 1;
});
