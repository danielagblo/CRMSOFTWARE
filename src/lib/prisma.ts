import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dns from "node:dns";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isPrivateOrCgnatIpv4(ip: string) {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\\d|3[0-1])\\./.test(ip)) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\./.test(ip)) return true;
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
    ssl: { servername: hostname, rejectUnauthorized: false },
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
        const isProduction = process.env.NODE_ENV === "production";

        const pickedAddress = addrs.find((a) => {
          if (a.family !== 4) return false;

          // In production: allow any IPv4
          if (isProduction) return true;

          // In development: reject private/CGNAT IPs
          return !isPrivateOrCgnatIpv4(a.address);
        });
        const picked = (pickedAddress ?? addrs[0]).address;
        cb(null, picked, 4);
      });
    },
  };
}

const adapter = new PrismaPg(
  pgPoolConfigFromDatabaseUrl(process.env.DATABASE_URL ?? ""),
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

export type PrismaWithAuditLog = PrismaClient & {
  auditLog: {
    findMany: (...args: any[]) => Promise<any[]>
    count: (...args: any[]) => Promise<number>
    create?: (...args: any[]) => Promise<any>
  }
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
