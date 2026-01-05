import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { Card } from "@scribeoverlay/ui";
import { authOptions } from "../../lib/auth";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");
  const items = await prisma.explanation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      <Card className="divide-y divide-white/5 p-4">
        {items.map((item) => (
          <div key={item.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">{item.metadata?.title ?? "Untitled"}</p>
                <p className="text-xs text-slate-400">{item.metadata?.domain ?? "Unknown domain"}</p>
              </div>
              <p className="text-xs text-slate-500">{item.createdAt.toLocaleString()}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No history yet.</p>}
      </Card>
    </div>
  );
}
