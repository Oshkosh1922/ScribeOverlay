import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { authOptions } from "../lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: { workspace: true }
      }
    }
  });
  
  const workspaceId = user?.memberships[0]?.workspaceId;
  const [usage, recent] = await Promise.all([
    prisma.usageEvent.aggregate({
      _sum: { tokensIn: true, tokensOut: true },
      where: { userId: session.user.id }
    }),
    prisma.explanation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <header className="text-center sm:text-left">
        <p className="text-sm font-medium text-brand-400 mb-1">Welcome back</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          <span className="gradient-text">Your Dashboard</span>
        </h1>
        <p className="mt-2 text-white/50 max-w-xl">
          Track your explanations and manage your ScribeOverlay experience.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          label="Workspace"
          value={user?.memberships[0]?.workspace.name ?? "Personal"}
          color="brand"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          label="Tokens Used"
          value={((usage._sum.tokensOut ?? 0) + (usage._sum.tokensIn ?? 0)).toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Explanations"
          value={recent.length.toString()}
          color="green"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          label="Status"
          value="Active"
          color="emerald"
        />
      </div>

      {/* Quick Actions - Mobile Friendly */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/connect"
          className="group glass glass-hover rounded-2xl p-5 sm:p-6 flex items-center gap-4"
        >
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 text-brand-400 group-hover:from-brand-500/30 group-hover:to-brand-600/30 transition-all">
            <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">Connect Extension</h3>
            <p className="text-sm text-white/50 truncate">Link your browser to start explaining</p>
          </div>
          <svg className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/history"
          className="group glass glass-hover rounded-2xl p-5 sm:p-6 flex items-center gap-4"
        >
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 group-hover:from-blue-500/30 group-hover:to-blue-600/30 transition-all">
            <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">View History</h3>
            <p className="text-sm text-white/50 truncate">Browse your past explanations</p>
          </div>
          <svg className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Recent Activity */}
      <section className="glass rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Recent Explanations</h2>
              <p className="text-sm text-white/50 mt-0.5">Your latest AI-powered insights</p>
            </div>
            <Link 
              href="/history" 
              className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors hidden sm:block"
            >
              View all →
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-white/5">
          {recent.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-medium text-white/70 mb-1">No explanations yet</h3>
              <p className="text-sm text-white/40 mb-4">Highlight text on any page and press ⌘+Shift+E to get started</p>
              <Link href="/connect" className="btn-primary inline-flex text-sm">
                Connect Extension
              </Link>
            </div>
          ) : (
            recent.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90 truncate">
                        {item.metadata?.domain || item.metadata?.title || "Unknown source"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400">
                          {item.mode}
                        </span>
                        <span className="text-xs text-white/40">
                          {item.contextLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <time className="text-xs text-white/40 shrink-0">
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </div>
              </div>
            ))
          )}
        </div>
        
        {recent.length > 0 && (
          <div className="p-4 sm:hidden border-t border-white/5">
            <Link href="/history" className="btn-secondary w-full text-center block text-sm py-3">
              View All History
            </Link>
          </div>
        )}
      </section>

      {/* How to Use - Mobile Optimized */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">How to Use</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <HowToStep
            number={1}
            title="Highlight Text"
            description="Select any text on a webpage you want to understand"
          />
          <HowToStep
            number={2}
            title="Press Shortcut"
            description="Use ⌘+Shift+E (Mac) or Ctrl+Shift+E (Windows)"
          />
          <HowToStep
            number={3}
            title="Get Insights"
            description="Receive instant AI explanations in an elegant overlay"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  color: 'brand' | 'blue' | 'green' | 'emerald';
}) {
  const colorClasses = {
    brand: 'from-brand-500/20 to-brand-600/20 text-brand-400',
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 text-green-400',
    emerald: 'from-emerald-500/20 to-emerald-600/20 text-emerald-400',
  };
  
  return (
    <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
      <div className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-xs sm:text-sm text-white/50 font-medium">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
    </div>
  );
}

function HowToStep({ 
  number, 
  title, 
  description 
}: { 
  number: number; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex gap-4 sm:flex-col sm:text-center">
      <div className="flex h-10 w-10 sm:mx-auto shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold shadow-lg shadow-brand/20">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/50 mt-1">{description}</p>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
