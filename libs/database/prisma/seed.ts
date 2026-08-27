import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Roles ─────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrator with full access" },
  });

  const clientRole = await prisma.role.upsert({
    where: { name: "CLIENT" },
    update: {},
    create: { name: "CLIENT", description: "Regular client account" },
  });

  console.log("✅ Roles:", adminRole.name, clientRole.name);

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminPassword = await hashPassword("Admin123456!");

  await prisma.user.upsert({
    where: { email: "admin@findash.com" },
    update: {},
    create: {
      document: "ADMIN-001",
      fullName: "FinDash Admin",
      email: "admin@findash.com",
      passwordHash: adminPassword,
      roleId: adminRole.id,
      account: {
        create: {
          accountNumber: "FD00000000000001",
          balance: 100000,
          type: "BASIC",
        },
      },
    },
  });

  console.log("✅ Admin user: admin@findash.com / Admin123456!");
  console.log("🎉 Seed completed.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
