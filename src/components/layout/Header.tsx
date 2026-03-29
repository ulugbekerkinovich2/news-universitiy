import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  GraduationCap, Newspaper, Settings, BarChart3,
  Download, LogOut, User, Book, Zap, Sun, Moon, Sparkles
} from "lucide-react";

const navItems = [
  { href: "/", label: "Universities", icon: GraduationCap, permission: "view_universities" },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/api-docs", label: "API", icon: Book },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, permission: "view_dashboard" },
  { href: "/admin", label: "Admin", icon: Settings, anyPermissions: ["manage_news", "manage_users", "manage_api_keys", "manage_settings", "manage_universities"] },
  { href: "/export", label: "Export", icon: Download, permission: "export_data" },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, hasPermission, hasAnyPermission, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const visibleNavItems = navItems.filter(
    (item) => {
      if (item.permission) return hasPermission(item.permission);
      if (item.anyPermissions) return hasAnyPermission(item.anyPermissions);
      return true;
    }
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="container pt-3">
        <div className="topbar-shell flex min-h-[74px] items-center justify-between gap-4 rounded-[26px] px-4 py-3 sm:px-5">
          <Link to={hasPermission("view_universities") ? "/" : "/news"} className="group flex shrink-0 items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 transition-colors group-hover:border-primary/40">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-accent/90">
                <Sparkles className="h-2.5 w-2.5 text-accent-foreground" />
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none tracking-tight text-foreground">
                UniHub <span className="text-gradient">Control</span>
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                University News System
              </p>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 justify-center lg:flex">
            <div className="nav-strip">
              {visibleNavItems.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "nav-chip",
                      isActive
                        ? "nav-chip-active"
                        : "nav-chip-idle"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              title={theme === "dark" ? "Yorug' rejim" : "Qorong'u rejim"}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {theme === "dark"
                ? <Sun className="h-4 w-4 text-amber-400" />
                : <Moon className="h-4 w-4 text-sky-400" />
              }
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 md:flex dark:border-white/10 dark:bg-white/5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="leading-none">
                    <p className="text-xs font-semibold text-foreground">
                      {user.email?.split("@")[0]}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {isAdmin ? "Admin access" : "Limited access"}
                    </p>
                  </div>
                  {isAdmin && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-500/8 hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Chiqish</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 rounded-2xl border border-primary/25 bg-primary/12 px-3.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Zap className="h-3.5 w-3.5" />
                Kirish
              </button>
            )}
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {visibleNavItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "nav-chip whitespace-nowrap",
                  isActive ? "nav-chip-active" : "nav-chip-idle"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
