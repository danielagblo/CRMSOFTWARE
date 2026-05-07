const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv(filePath) {
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

loadDotEnv(path.join(process.cwd(), ".env"));

const { Client } = require("pg");
const dns = require("node:dns");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL (expected in .env).");
  process.exit(1);
}

function isPrivateOrCgnatIpv4(ip) {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  return false;
}

const url = new URL(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 20_000,
  query_timeout: 20_000,
  keepAlive: true,
  ssl: { servername: url.hostname },
  lookup: (host, _opts, cb) => {
    dns.lookup(host, { all: true }, (err, addrs) => {
      if (err || !addrs || addrs.length === 0) return cb(err, host, 4);
      const firstPublic = addrs.find(
        (a) => a.family === 4 && !isPrivateOrCgnatIpv4(a.address)
      );
      const picked = (firstPublic || addrs[0]).address;
      cb(null, picked, 4);
    });
  },
});

(async () => {
  console.log("Connecting...");
  await client.connect();
  console.log("Connected. Running SELECT 1...");
  const res = await client.query("SELECT 1 AS ok");
  console.log(res.rows);
  await client.end();
  console.log("Done.");
})().catch(async (e) => {
  console.error("PG connect/query failed:");
  console.error({
    message: e.message,
    code: e.code,
    errno: e.errno,
    syscall: e.syscall,
    address: e.address,
    port: e.port,
    stack: e.stack,
  });
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
