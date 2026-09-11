import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Sparkles,
  Users,
  FileText,
  Menu, ChevronDown, CheckCircle2, Mail, CircleUserRound, Maximize2, LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Individuals", icon: Users, to: "/individuals" },
  { label: "Staff", icon: Users, to: "#staff" },
  { label: "Tools", icon: FileText, to: "#tools", menu: true },
  { label: "Logs", icon: FileText, to: "#logs", menu: true },
  { label: "SnapTag", icon: FileText, to: "#snaptag" },
];


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    !to.startsWith("#") && to !== "/" && pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-line bg-card">
        <div className="flex h-14 items-center px-4 gap-3">
          <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-action-blue text-primary-foreground font-bold text-xs">
              iCM
            </div>
            <span className="text-sm font-extrabold text-ink">
              iCareManager
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              if (item.to.startsWith("#")) {
                return (
                  <button
                    key={item.label}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold text-ink2 hover:text-ink hover:bg-muted transition-colors"
                  >
                    {item.label}
                    {item.menu && <ChevronDown className="size-3" />}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={[
                    "flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition-colors",
                    active
                      ? "bg-muted text-ink"
                      : "text-ink2 hover:text-ink hover:bg-muted",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}

            <Button className="ml-2 h-9 rounded-full ai-pill px-4 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              iCM AI
            </Button>
          </nav>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red" />
          </Button>
          <Button variant="ghost" size="icon"><CheckCircle2 /></Button>
          <Button variant="ghost" size="icon" className="relative"><Mail /><span className="absolute right-0.5 top-0 rounded-sm bg-destructive px-1 text-[9px] text-primary-foreground">4</span></Button>
          <Button variant="ghost" size="icon"><CircleUserRound /></Button>

          <Avatar className="h-8 w-8 ring-1 ring-line">
            <AvatarFallback className="bg-muted text-ink2 text-xs font-bold">BN</AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-semibold text-ink lg:inline">Babar Nawaz</span><ChevronDown className="hidden size-3 text-ink2 lg:block" />
          <Button variant="ghost" size="icon"><Maximize2 /></Button><Button variant="ghost" size="icon"><LogOut /></Button>
        </div>
      </header>
      <div className="flex h-11 items-center gap-5 border-b border-line bg-card px-6 text-xs font-semibold text-ink2"><Link to="/" className={pathname === "/" ? "text-action-blue" : "hover:text-ink"}>Dashboard</Link><Link to="/individuals" className={pathname.startsWith("/individuals") ? "rounded-md border border-action-blue/20 px-3 py-2 text-action-blue" : "hover:text-ink"}>Individuals</Link><span>E-Chart (Esha)</span></div>
      <main>{children}</main>
    </div>
  );
}
