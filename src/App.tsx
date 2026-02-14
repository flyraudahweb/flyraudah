import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";

// Lazy-loaded routes for performance
const Packages = lazy(() => import("./pages/Packages"));
const PackageDetail = lazy(() => import("./pages/PackageDetail"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Install = lazy(() => import("./pages/Install"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardBookings = lazy(() => import("./pages/dashboard/DashboardBookings"));
const DashboardPackages = lazy(() => import("./pages/dashboard/DashboardPackages"));
const DashboardPayments = lazy(() => import("./pages/dashboard/DashboardPayments"));
const DashboardDocuments = lazy(() => import("./pages/dashboard/DashboardDocuments"));
const DashboardProfile = lazy(() => import("./pages/dashboard/DashboardProfile"));
const DashboardSupport = lazy(() => import("./pages/dashboard/DashboardSupport"));
const BookingWizard = lazy(() => import("./pages/dashboard/BookingWizard"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminPackages = lazy(() => import("./pages/admin/AdminPackages"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPilgrims = lazy(() => import("./pages/admin/AdminPilgrims"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminIdTags = lazy(() => import("./pages/admin/AdminIdTags"));
const AgentLayout = lazy(() => import("./components/agent/AgentLayout"));
const AgentOverview = lazy(() => import("./pages/agent/AgentOverview"));
const AgentClients = lazy(() => import("./pages/agent/AgentClients"));
const AgentBookForClient = lazy(() => import("./pages/agent/AgentBookForClient"));
const AgentPackages = lazy(() => import("./pages/agent/AgentPackages"));
const AgentBookings = lazy(() => import("./pages/agent/AgentBookings"));
const AgentCommissions = lazy(() => import("./pages/agent/AgentCommissions"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/packages" element={<Packages />} />
                <Route path="/packages/:id" element={<PackageDetail />} />
                <Route path="/payment/callback" element={<PaymentCallback />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/install" element={<Install />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardOverview />} />
                  <Route path="bookings" element={<DashboardBookings />} />
                  <Route path="packages" element={<DashboardPackages />} />
                  <Route path="payments" element={<DashboardPayments />} />
                  <Route path="documents" element={<DashboardDocuments />} />
                  <Route path="profile" element={<DashboardProfile />} />
                  <Route path="support" element={<DashboardSupport />} />
                  <Route path="book/:id" element={<BookingWizard />} />
                </Route>
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="packages" element={<AdminPackages />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="pilgrims" element={<AdminPilgrims />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="id-tags" element={<AdminIdTags />} />
                </Route>
                <Route
                  path="/agent"
                  element={
                    <ProtectedRoute requiredRole="agent">
                      <AgentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AgentOverview />} />
                  <Route path="clients" element={<AgentClients />} />
                  <Route path="packages" element={<AgentPackages />} />
                  <Route path="book/:id" element={<AgentBookForClient />} />
                  <Route path="bookings" element={<AgentBookings />} />
                  <Route path="commissions" element={<AgentCommissions />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;