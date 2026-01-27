import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  Newspaper, 
  Settings, 
  BarChart3,
  Download,
  LogOut,
  User,
  Book
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

  // Filter nav items based on admin status
  const visibleNavItems = navItems.filter(
    (item) => !item.requireAdmin || isAdmin
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to={isAdmin ? "/" : "/news"} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-hero">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-heading text-lg font-bold text-foreground">
              Uzbek Universities
            </h1>
            <p className="text-xs text-muted-foreground">News Aggregator</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== "/" && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {user.email?.split("@")[0]}
                {isAdmin && (
                  <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    Admin
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Chiqish</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
            >
              Kirish
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
