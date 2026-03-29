import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import UniversityDetail from "./pages/UniversityDetail";
import NewsPage from "./pages/NewsPage";
import UniversityNewsPage from "./pages/UniversityNewsPage";
import NewsDetail from "./pages/NewsDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Export from "./pages/Export";
import Login from "./pages/Login";
import ApiDocs from "./pages/ApiDocs";
import ApiSwagger from "./pages/ApiSwagger";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/university/:universityId" element={<UniversityNewsPage />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/api-swagger" element={<ProtectedRoute requireAdmin><ApiSwagger /></ProtectedRoute>} />

              {/* Permission protected */}
              <Route path="/" element={<ProtectedRoute requiredPermission="view_universities"><Index /></ProtectedRoute>} />
              <Route path="/universities" element={<ProtectedRoute requiredPermission="view_universities"><Index /></ProtectedRoute>} />
              <Route path="/universities/:id" element={<ProtectedRoute requiredPermission="view_universities"><UniversityDetail /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requiredPermission="view_dashboard"><Dashboard /></ProtectedRoute>} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredAnyPermission={["manage_news", "manage_users", "manage_api_keys", "manage_settings", "manage_universities"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="/export" element={<ProtectedRoute requiredPermission="export_data"><Export /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
