import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const certificatePath = path.resolve(process.cwd(), "certs", "timeweb-ca.crt");
const ssl =
  fs.existsSync(certificatePath)
    ? {
        ca: fs.readFileSync(certificatePath, "utf8"),
        rejectUnauthorized: true,
      }
    : undefined;

const databaseUrl = new URL(connectionString);

const pool = new Pool({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 5432),
  database: databaseUrl.pathname.replace(/^\//, ""),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  ssl,
});

const adapter = new PrismaPg(pool, {
  disposeExternalPool: true,
});

export const prisma = new PrismaClient({ adapter });
