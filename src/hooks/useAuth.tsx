import { useState, useRef, useCallback, createContext, useContext, useEffect, ReactNode } from "react";
import { API_BASE } from "@/lib/api";

// Simple JWT-based auth — no Supabase

interface UserInfo {
  id: string;
  email: string;
  display_name?: string | null;
  role: string;
  is_active: boolean;
  approval_status: string;
  permissions: string[];
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, load user from saved token
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setIsLoading(false); return; }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: new Error(err.detail || "Login failed") };
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      setUser(data.user);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: new Error(err.detail || "Registration failed"), message: undefined };
      }
      const data = await res.json();
      return { error: null, message: data.message };
    } catch (e) {
      return { error: e as Error, message: undefined };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        hasPermission,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
