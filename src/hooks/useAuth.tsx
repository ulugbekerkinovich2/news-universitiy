import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingAdmin = useRef(false);
  const hasInitialized = useRef(false);

  // Memoized admin check with debounce protection
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    if (isCheckingAdmin.current) return isAdmin;
    isCheckingAdmin.current = true;
    
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error('Admin check error:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    } finally {
      isCheckingAdmin.current = false;
    }
  }, [isAdmin]);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer admin check to avoid blocking
          setTimeout(async () => {
            if (!isMounted) return;
            const adminStatus = await checkAdminStatus(newSession.user.id);
            if (isMounted) {
              setIsAdmin(adminStatus);
              setIsLoading(false);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Get session error:', error);
          if (isMounted) setIsLoading(false);
          return;
        }
        
        if (!isMounted) return;
        
        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const adminStatus = await checkAdminStatus(initialSession.user.id);
          if (isMounted) {
            setIsAdmin(adminStatus);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
