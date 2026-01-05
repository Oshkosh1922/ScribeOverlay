import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card } from "@scribeoverlay/ui";
import { authOptions } from "../../lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Context defaults</h2>
          <p className="text-sm text-slate-400">Defaults for context level and redaction.</p>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p>Context level: Minimal</p>
          <p>Redaction: Enabled by default</p>
          <p>Floating spark button: Enabled</p>
        </div>
        <p className="text-xs text-slate-500">Future work: connect to user preferences and sync to extension.</p>
      </Card>
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-slate-400">Stripe webhook skeleton is in place. Swap your keys and plans to activate.</p>
        <p className="text-xs text-slate-500">Current plan: Free</p>
      </Card>
    </div>
  );
}
