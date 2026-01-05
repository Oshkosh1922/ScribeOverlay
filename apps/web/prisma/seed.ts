import { prisma } from "../lib/prisma";
import argon2 from "argon2";

async function main() {
  const email = "demo@scribeoverlay.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists");
    return;
  }
  const user = await prisma.user.create({ data: { email, hashedPassword: await argon2.hash("password") } });
  const workspace = await prisma.workspace.create({ data: { name: "Demo Workspace", plan: "pro" } });
  await prisma.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "owner" } });
  await prisma.subscription.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      plan: "pro",
      status: "active"
    }
  });
  console.log("Seeded demo user demo@scribeoverlay.dev / password");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
