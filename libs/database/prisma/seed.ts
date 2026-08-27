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

function accountNumber(suffix: string): string {
  return `FD2026${suffix}`;
}

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Reset ──────────────────────────────────────────────────────────────────
  console.log("🗑️  Limpiando datos anteriores...");
  await prisma.transaction.deleteMany();
  await prisma.userLogin.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Roles ──────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrador con acceso total" },
  });

  const clientRole = await prisma.role.upsert({
    where: { name: "CLIENT" },
    update: {},
    create: { name: "CLIENT", description: "Cliente regular" },
  });

  console.log("✅ Roles listos");

  // ── Contraseñas ────────────────────────────────────────────────────────────
  const adminPass  = await hashPassword("Diego123456!");
  const clientPass = await hashPassword("Cliente123456!");

  // ── Admin ──────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      document:     "ADMIN-001",
      fullName:     "Diego Burgos",
      email:        "diegoaburgos1@gmail.com",
      passwordHash: adminPass,
      roleId:       adminRole.id,
      account: {
        create: {
          accountNumber: accountNumber("ADMIN0001"),
          balance:       50000,
          type:          "CORPORATE",
        },
      },
    },
  });
  console.log("✅ Admin: diegoaburgos1@gmail.com / Diego123456!");

  // ── Clientes con saldo ─────────────────────────────────────────────────────
  const clientsWithBalance = [
    { document: "CC-10000001", fullName: "Valentina Rodríguez", email: "valentina.r@example.com", balance: 2500.00,   suffix: "C0000001", type: "BASIC"    },
    { document: "CC-10000002", fullName: "Carlos Martínez",     email: "carlos.m@example.com",     balance: 15800.75,  suffix: "C0000002", type: "PREMIUM"  },
    { document: "CC-10000003", fullName: "Sofía Gómez",         email: "sofia.g@example.com",       balance: 450.00,    suffix: "C0000003", type: "BASIC"    },
    { document: "CC-10000004", fullName: "Isabella Herrera",    email: "isabella.h@example.com",    balance: 8200.50,   suffix: "C0000004", type: "PREMIUM"  },
    { document: "CC-10000005", fullName: "Alejandro Vargas",    email: "alejandro.v@example.com",   balance: 32000.00,  suffix: "C0000005", type: "CORPORATE"},
    { document: "CC-10000006", fullName: "Mariana López",       email: "mariana.l@example.com",     balance: 980.20,    suffix: "C0000006", type: "BASIC"    },
  ];

  for (const c of clientsWithBalance) {
    await prisma.user.create({
      data: {
        document:     c.document,
        fullName:     c.fullName,
        email:        c.email,
        passwordHash: clientPass,
        roleId:       clientRole.id,
        account: {
          create: {
            accountNumber: accountNumber(c.suffix),
            balance:       c.balance,
            type:          c.type as "BASIC" | "PREMIUM" | "CORPORATE",
          },
        },
      },
    });
  }
  console.log(`✅ ${clientsWithBalance.length} clientes con saldo`);

  // ── Clientes sin saldo ─────────────────────────────────────────────────────
  const clientsNoBalance = [
    { document: "CC-20000001", fullName: "Juan Pablo Silva",        email: "jp.silva@example.com",    suffix: "C0000007" },
    { document: "CC-20000002", fullName: "María Fernanda Castro",   email: "mf.castro@example.com",   suffix: "C0000008" },
    { document: "CC-20000003", fullName: "Luis Ernesto Pérez",      email: "luis.p@example.com",      suffix: "C0000009" },
    { document: "CC-20000004", fullName: "Camila Ortega",           email: "camila.o@example.com",    suffix: "C0000010" },
  ];

  for (const c of clientsNoBalance) {
    await prisma.user.create({
      data: {
        document:     c.document,
        fullName:     c.fullName,
        email:        c.email,
        passwordHash: clientPass,
        roleId:       clientRole.id,
        account: {
          create: {
            accountNumber: accountNumber(c.suffix),
            balance:       0,
            type:          "BASIC",
          },
        },
      },
    });
  }
  console.log(`✅ ${clientsNoBalance.length} clientes sin saldo`);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log("\n📋 Credenciales:");
  console.log("─────────────────────────────────────────────────────");
  console.log("  ADMIN   diegoaburgos1@gmail.com  /  Diego123456!");
  console.log("  CLIENTES (todos)                 /  Cliente123456!");
  console.log("─────────────────────────────────────────────────────");
  console.log("🎉 Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
