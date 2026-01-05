import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@scribeoverlay.dev";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("Demo user already exists");
    return;
  }
  const hashed = await argon2.hash("password");
  const user = await prisma.user.create({ data: { email, hashedPassword: hashed } });
  const workspace = await prisma.workspace.create({ data: { name: "Demo Workspace", plan: "pro" } });
  await prisma.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "owner" } });
  await prisma.subscription.create({
    data: { userId: user.id, workspaceId: workspace.id, plan: "pro", status: "active" }
  });
  console.log("Seeded demo user demo@scribeoverlay.dev / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
