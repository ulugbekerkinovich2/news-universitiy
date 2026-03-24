import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap, Newspaper, Settings, BarChart3,
  Download, LogOut, User, Book, Zap
} from "lucide-react";

const navItems = [
  { href: "/", label: "Universities", icon: GraduationCap, requireAdmin: true },
  { href: "/news", label: "News", icon: Newspaper, requireAdmin: false },
  { href: "/api-docs", label: "API", icon: Book, requireAdmin: false },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, requireAdmin: true },
  { href: "/admin", label: "Admin", icon: Settings, requireAdmin: true },
  { href: "/export", label: "Export", icon: Download, requireAdmin: true },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.requireAdmin || isAdmin
  );

  return (
    <header className="sticky top-0 z-50 w-full glass-heavy border-b border-white/5">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to={isAdmin ? "/" : "/news"} className="flex items-center gap-3 group shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/25 group-hover:border-primary/50 transition-colors">
            <GraduationCap className="h-4.5 w-4.5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border border-background" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-foreground leading-none tracking-tight">
              UniHub <span className="text-gradient">UZ</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">News Aggregator</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {visibleNavItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-white/4 border border-white/6">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {user.email?.split("@")[0]}
              </span>
              {isAdmin && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/20 font-medium">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Chiqish</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Kirish
          </button>
        )}
      </div>
    </header>
  );
}
