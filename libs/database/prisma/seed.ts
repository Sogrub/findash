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

function authCode(): string {
  return `AUTH-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function idempotencyKey(): string {
  return randomBytes(16).toString("hex");
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

  // ── Clientes ───────────────────────────────────────────────────────────────
  // Balances reflect the state AFTER the transactions seeded below
  const clientDefs = [
    // BASIC — pagan 2% de comisión al enviar
    { document: "CC-10000001", fullName: "Carlos Martínez",        email: "carlos.m@example.com",     balance: 12_800.00, suffix: "C0000001", type: "BASIC"     },
    { document: "CC-10000002", fullName: "Sofía Gómez",            email: "sofia.g@example.com",       balance:    680.00, suffix: "C0000002", type: "BASIC"     },
    { document: "CC-10000003", fullName: "Mariana López",          email: "mariana.l@example.com",     balance:  1_150.00, suffix: "C0000003", type: "BASIC"     },
    { document: "CC-10000004", fullName: "Juan Pablo Silva",       email: "jp.silva@example.com",      balance:    250.00, suffix: "C0000004", type: "BASIC"     },
    { document: "CC-10000005", fullName: "Luis Ernesto Pérez",     email: "luis.p@example.com",        balance:      0.00, suffix: "C0000005", type: "BASIC"     },
    // PREMIUM — transferencias sin comisión
    { document: "CC-10000006", fullName: "Valentina Rodríguez",    email: "valentina.r@example.com",   balance:  3_500.00, suffix: "C0000006", type: "PREMIUM"   },
    { document: "CC-10000007", fullName: "Isabella Herrera",       email: "isabella.h@example.com",    balance:  9_800.00, suffix: "C0000007", type: "PREMIUM"   },
    { document: "CC-10000008", fullName: "María Fernanda Castro",  email: "mf.castro@example.com",     balance:      0.00, suffix: "C0000008", type: "PREMIUM"   },
    // CORPORATE — $5 fijos por transferencia
    { document: "CC-10000009", fullName: "Alejandro Vargas",       email: "alejandro.v@example.com",   balance: 33_200.00, suffix: "C0000009", type: "CORPORATE" },
    { document: "CC-10000010", fullName: "Camila Ortega",          email: "camila.o@example.com",      balance:      0.00, suffix: "C0000010", type: "CORPORATE" },
  ] as const;

  const accounts: Record<string, string> = {}; // email → accountId

  for (const c of clientDefs) {
    const user = await prisma.user.create({
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
            type:          c.type,
          },
        },
      },
      include: { account: true },
    });
    accounts[c.email] = user.account!.id;
  }

  console.log(`✅ ${clientDefs.length} clientes (BASIC / PREMIUM / CORPORATE)`);

  // ── Transacciones históricas ───────────────────────────────────────────────
  // Comisiones aplicadas según tipo de cuenta origen:
  //   BASIC     → 2% del monto
  //   PREMIUM   → $0 (gratuita)
  //   CORPORATE → $5 fijo
  const txs = [
    // Carlos (BASIC) → Valentina: comisión 2% de $1,000 = $20
    {
      sourceAccountId: accounts["carlos.m@example.com"],
      destAccountId:   accounts["valentina.r@example.com"],
      amount:          1_000.00,
      commission:      20.00,
      totalDeducted:   1_020.00,
      description:     "Pago de deuda",
    },
    // Alejandro (CORPORATE) → Sofía: comisión $5 fija
    {
      sourceAccountId: accounts["alejandro.v@example.com"],
      destAccountId:   accounts["sofia.g@example.com"],
      amount:          300.00,
      commission:      5.00,
      totalDeducted:   305.00,
      description:     "Transferencia",
    },
    // Isabella (PREMIUM) → Mariana: comisión $0
    {
      sourceAccountId: accounts["isabella.h@example.com"],
      destAccountId:   accounts["mariana.l@example.com"],
      amount:          500.00,
      commission:      0.00,
      totalDeducted:   500.00,
      description:     "Pago de servicios",
    },
    // Valentina (PREMIUM) → Juan Pablo: comisión $0
    {
      sourceAccountId: accounts["valentina.r@example.com"],
      destAccountId:   accounts["jp.silva@example.com"],
      amount:          250.00,
      commission:      0.00,
      totalDeducted:   250.00,
      description:     "Préstamo",
    },
    // Carlos (BASIC) → Mariana: comisión 2% de $200 = $4
    {
      sourceAccountId: accounts["carlos.m@example.com"],
      destAccountId:   accounts["mariana.l@example.com"],
      amount:          200.00,
      commission:      4.00,
      totalDeducted:   204.00,
      description:     "Pago cuota",
    },
    // Alejandro (CORPORATE) → Isabella: comisión $5 fija
    {
      sourceAccountId: accounts["alejandro.v@example.com"],
      destAccountId:   accounts["isabella.h@example.com"],
      amount:          1_500.00,
      commission:      5.00,
      totalDeducted:   1_505.00,
      description:     "Inversión conjunta",
    },
  ];

  for (const tx of txs) {
    await prisma.transaction.create({
      data: {
        idempotencyKey:   idempotencyKey(),
        sourceAccountId:  tx.sourceAccountId,
        destAccountId:    tx.destAccountId,
        amount:           tx.amount,
        commission:       tx.commission,
        totalDeducted:    tx.totalDeducted,
        status:           "COMPLETED",
        authorizationCode: authCode(),
      },
    });
  }

  console.log(`✅ ${txs.length} transacciones históricas creadas`);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log("\n📋 Credenciales:");
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("  ROL       EMAIL                          TIPO        CONTRASEÑA");
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("  ADMIN     diegoaburgos1@gmail.com        CORPORATE   Diego123456!");
  console.log("  CLIENT    carlos.m@example.com           BASIC       Cliente123456!");
  console.log("  CLIENT    sofia.g@example.com            BASIC       Cliente123456!");
  console.log("  CLIENT    mariana.l@example.com          BASIC       Cliente123456!");
  console.log("  CLIENT    jp.silva@example.com           BASIC       Cliente123456!");
  console.log("  CLIENT    luis.p@example.com             BASIC       Cliente123456!");
  console.log("  CLIENT    valentina.r@example.com        PREMIUM     Cliente123456!");
  console.log("  CLIENT    isabella.h@example.com         PREMIUM     Cliente123456!");
  console.log("  CLIENT    mf.castro@example.com          PREMIUM     Cliente123456!");
  console.log("  CLIENT    alejandro.v@example.com        CORPORATE   Cliente123456!");
  console.log("  CLIENT    camila.o@example.com           CORPORATE   Cliente123456!");
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("🎉 Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
