import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
      staleTime: 1000 * 60 * 5, // 5 daqiqa fresh
      gcTime: 1000 * 60 * 30, // 30 daqiqa keshda saqlash
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - o'qish uchun */}
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/university/:universityId" element={<UniversityNewsPage />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/login" element={<Login />} />
            
            {/* Default route - redirect to universities or login */}
            <Route
              path="/"
              element={
                <ProtectedRoute requireAdmin>
                  <Index />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes - admin uchun */}
            <Route
              path="/universities"
              element={
                <ProtectedRoute requireAdmin>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/universities/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <UniversityDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export"
              element={
                <ProtectedRoute requireAdmin>
                  <Export />
                </ProtectedRoute>
              }
            />
            {/* Public API docs */}
            <Route path="/api-docs" element={<ApiDocs />} />
             <Route path="/api-swagger" element={<ApiSwagger />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
