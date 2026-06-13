/**
 * Seed script — creates the default admin account.
 * Run: npx tsx src/seed.ts
 *
 * Admin credentials:
 *   Email:    admin@taskflow.dev
 *   Password: Admin@1234
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "./db.js";

const ADMIN_EMAIL = "admin@taskflow.dev";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Admin";

async function main() {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
        if (existing.role === "ADMIN") {
            console.log("✅ Admin account already exists.");
        } else {
            await prisma.user.update({ where: { email: ADMIN_EMAIL }, data: { role: "ADMIN" } });
            console.log("✅ Existing user promoted to ADMIN.");
        }
        return;
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
        data: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: hashed, role: "ADMIN" },
    });

    console.log("✅ Admin account created:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());