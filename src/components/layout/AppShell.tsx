import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Sparkles,
  Home,
  Users,
  UserCog,
  CalendarDays,
  FileText,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { label: "Dashboard", icon: Home, to: "/" },
  { label: "Individuals", icon: Users, to: "/individuals" },
  { label: "Guidelines", icon: Shield, to: "/guidelines" },
  { label: "Staff", icon: UserCog, to: "#staff" },
  { label: "Events", icon: CalendarDays, to: "#events" },
  { label: "Logs", icon: FileText, to: "#logs" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    !to.startsWith("#") && to !== "/" && pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full bg-card border-b border-line">
        <div className="flex h-16 items-center px-6 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-navy flex items-center justify-center text-white font-bold text-sm">
              iC
            </div>
            <span className="text-[15px] font-extrabold tracking-tight text-ink">
              iCareManager
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              if (item.to.startsWith("#")) {
                return (
                  <button
                    key={item.label}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-ink2 hover:text-ink hover:bg-muted transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={[
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                    active
                      ? "bg-muted text-ink"
                      : "text-ink2 hover:text-ink hover:bg-muted",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <button className="ml-2 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold text-white ai-pill shadow-sm hover:opacity-95 transition-all">
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden lg:flex relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink3" />
            <input
              type="search"
              placeholder="Search"
              className="w-full pl-9 h-9 rounded-lg bg-muted border border-transparent text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:bg-card focus:border-line transition-colors"
            />
          </div>

          <button className="h-9 w-9 rounded-lg flex items-center justify-center text-ink2 hover:text-ink hover:bg-muted relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red" />
          </button>

          <Avatar className="h-9 w-9 ring-2 ring-line">
            <AvatarFallback className="bg-navy text-white text-xs font-bold">BN</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
