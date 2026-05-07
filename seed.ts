import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";

function loadDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

// `npx tsx seed.ts` does not automatically load `.env` like Prisma CLI does.
loadDotEnv(path.join(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL. Ensure `.env` exists at the repo root, or export DATABASE_URL before running seed.",
  );
}

try {
  const url = new URL(process.env.DATABASE_URL);
  console.log(
    `Using database: ${url.protocol}//${url.hostname}:${url.port || "(default)"}${url.pathname}`,
  );
} catch {
  console.log("Using database: (unparseable DATABASE_URL)");
}

function isPrivateOrCgnatIpv4(ip: string) {
  // 10.0.0.0/8
  if (ip.startsWith("10.")) return true;
  // 127.0.0.0/8
  if (ip.startsWith("127.")) return true;
  // 169.254.0.0/16
  if (ip.startsWith("169.254.")) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (ip.startsWith("192.168.")) return true;
  // 100.64.0.0/10 (CGNAT)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  return false;
}

function pgPoolConfigFromDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const hostname = url.hostname;

  return {
    connectionString: databaseUrl,
    keepAlive: true,
    connectionTimeoutMillis: 20_000,
    query_timeout: 20_000,
    // Ensure TLS uses the hostname from DATABASE_URL for SNI/cert validation.
    ssl: { servername: hostname },
    // Neon pooler can resolve to multiple A records; some networks return unroutable/private
    // addresses first. Prefer public IPv4s to avoid hangs.
    lookup: (
      host: string,
      _opts: unknown,
      cb: (
        err: NodeJS.ErrnoException | null,
        address: string,
        family: number,
      ) => void,
    ) => {
      dns.lookup(host, { all: true }, (err, addrs) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (err || !addrs || addrs.length === 0) return cb(err as any, host, 4);
        const firstPublic = addrs.find(
          (a) => a.family === 4 && !isPrivateOrCgnatIpv4(a.address),
        );
        const picked = (firstPublic ?? addrs[0]).address;
        cb(null, picked, 4);
      });
    },
  };
}

const adapter = new PrismaPg(
  pgPoolConfigFromDatabaseUrl(process.env.DATABASE_URL),
);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding starting...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@crm.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  console.log(`Checking/Creating admin user: ${adminEmail}...`);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "System Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin user ready:", user.email);
  const count = await prisma.user.count();
  console.log("Seed complete. User count:", count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
