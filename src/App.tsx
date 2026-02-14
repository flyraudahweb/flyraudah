import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import Index from "./pages/Index";

// Lazy-loaded routes with auto-retry on stale chunk errors
const Packages = lazyWithRetry(() => import("./pages/Packages"));
const PackageDetail = lazyWithRetry(() => import("./pages/PackageDetail"));
const PaymentCallback = lazyWithRetry(() => import("./pages/PaymentCallback"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const DashboardLayout = lazyWithRetry(() => import("./components/dashboard/DashboardLayout"));
const DashboardOverview = lazyWithRetry(() => import("./pages/dashboard/DashboardOverview"));
const DashboardBookings = lazyWithRetry(() => import("./pages/dashboard/DashboardBookings"));
const DashboardPackages = lazyWithRetry(() => import("./pages/dashboard/DashboardPackages"));
const DashboardPayments = lazyWithRetry(() => import("./pages/dashboard/DashboardPayments"));
const DashboardDocuments = lazyWithRetry(() => import("./pages/dashboard/DashboardDocuments"));
const DashboardProfile = lazyWithRetry(() => import("./pages/dashboard/DashboardProfile"));
const DashboardSupport = lazyWithRetry(() => import("./pages/dashboard/DashboardSupport"));
const BookingWizard = lazyWithRetry(() => import("./pages/dashboard/BookingWizard"));
const AdminLayout = lazyWithRetry(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazyWithRetry(() => import("./pages/admin/AdminOverview"));
const AdminPackages = lazyWithRetry(() => import("./pages/admin/AdminPackages"));
const AdminPayments = lazyWithRetry(() => import("./pages/admin/AdminPayments"));
const AdminPilgrims = lazyWithRetry(() => import("./pages/admin/AdminPilgrims"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/admin/AdminAnalytics"));
const AdminIdTags = lazyWithRetry(() => import("./pages/admin/AdminIdTags"));
const AdminAgentApplications = lazyWithRetry(() => import("./pages/admin/AdminAgentApplications"));
const AdminAiAssistant = lazyWithRetry(() => import("./pages/admin/AdminAiAssistant"));
const AgentLayout = lazyWithRetry(() => import("./components/agent/AgentLayout"));
const AgentOverview = lazyWithRetry(() => import("./pages/agent/AgentOverview"));
const AgentClients = lazyWithRetry(() => import("./pages/agent/AgentClients"));
const AgentBookForClient = lazyWithRetry(() => import("./pages/agent/AgentBookForClient"));
const AgentPackages = lazyWithRetry(() => import("./pages/agent/AgentPackages"));
const AgentBookings = lazyWithRetry(() => import("./pages/agent/AgentBookings"));
const AgentCommissions = lazyWithRetry(() => import("./pages/agent/AgentCommissions"));
const Proposal = lazyWithRetry(() => import("./pages/Proposal"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
                <Route path="/proposal" element={<Proposal />} />
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
                  <Route path="agent-applications" element={<AdminAgentApplications />} />
                  <Route path="ai-assistant" element={<AdminAiAssistant />} />
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