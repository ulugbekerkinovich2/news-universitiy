import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  GraduationCap, 
  Newspaper, 
  Settings, 
  BarChart3,
  Download
} from "lucide-react";

const navItems = [
  { href: "/", label: "Universities", icon: GraduationCap },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/export", label: "Export", icon: Download },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
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

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
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
      </div>
    </header>
  );
}
