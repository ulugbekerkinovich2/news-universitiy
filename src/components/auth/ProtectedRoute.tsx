import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredPermission?: string;
  requiredAnyPermission?: string[];
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredPermission,
  requiredAnyPermission,
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(true);

  // Timeout to prevent infinite loading - max 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // If still loading and within timeout, show loader
  if (isLoading && showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading timed out or finished without user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Ruxsat yo'q</h1>
          <p className="text-muted-foreground mt-2">
            Bu sahifaga faqat adminlar kira oladi
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Ruxsat yo'q</h1>
          <p className="text-muted-foreground mt-2">
            Bu bo'lim uchun sizga alohida permission kerak
          </p>
        </div>
      </div>
    );
  }

  if (requiredAnyPermission && !hasAnyPermission(requiredAnyPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Ruxsat yo'q</h1>
          <p className="text-muted-foreground mt-2">
            Bu bo'limni ko'rish uchun yetarli ruxsat topilmadi
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
