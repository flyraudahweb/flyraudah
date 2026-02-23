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
import OfflineBanner from "@/components/ui/OfflineBanner";
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
const AdminBankAccounts = lazyWithRetry(() => import("./pages/admin/AdminBankAccounts"));
const AdminActivity = lazyWithRetry(() => import("./pages/admin/AdminActivity"));
const AdminAmendmentRequests = lazyWithRetry(() => import("./pages/admin/AdminAmendmentRequests"));
const AdminSupport = lazyWithRetry(() => import("./pages/admin/AdminSupport"));
const AdminStaffManagement = lazyWithRetry(() => import("./pages/admin/AdminStaffManagement"));
const AgentLayout = lazyWithRetry(() => import("./components/agent/AgentLayout"));
const AgentOverview = lazyWithRetry(() => import("./pages/agent/AgentOverview"));
const AgentClients = lazyWithRetry(() => import("./pages/agent/AgentClients"));
const AgentBookForClient = lazyWithRetry(() => import("./pages/agent/AgentBookForClient"));
const AgentPackages = lazyWithRetry(() => import("./pages/agent/AgentPackages"));
const AgentBookings = lazyWithRetry(() => import("./pages/agent/AgentBookings"));
const AgentCommissions = lazyWithRetry(() => import("./pages/agent/AgentCommissions"));
const Proposal = lazyWithRetry(() => import("./pages/Proposal"));
const AboutUs = lazyWithRetry(() => import("./pages/AboutUs"));
const Services = lazyWithRetry(() => import("./pages/Services"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const TermsAndConditions = lazyWithRetry(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminBookingForm = lazyWithRetry(() => import("./pages/admin/AdminBookingForm"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry up to 2x on network failures, but NOT on 4xx (auth/not-found) errors
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;
        // Don't retry client errors (401, 403, 404, etc)
        const status = error?.status ?? error?.code;
        if (status && status >= 400 && status < 500) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30_000,        // data is fresh for 30s
      gcTime: 5 * 60 * 1000,   // keep in cache for 5 min
      refetchOnWindowFocus: false, // avoid thundering herd on tab switch
    },
    mutations: {
      // Surface network errors but don't crash
      retry: false,
    },
  },
});

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
          <OfflineBanner />
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
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
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
                      // staff role check: super_admin → admin → staff, all pass via hierarchy
                      <ProtectedRoute requiredRole="staff">
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={
                      <ProtectedRoute requiredPermission="overview"><AdminOverview /></ProtectedRoute>
                    } />
                    <Route path="packages" element={
                      <ProtectedRoute requiredPermission="packages"><AdminPackages /></ProtectedRoute>
                    } />
                    <Route path="payments" element={
                      <ProtectedRoute requiredPermission="payments"><AdminPayments /></ProtectedRoute>
                    } />
                    <Route path="pilgrims" element={
                      <ProtectedRoute requiredPermission="pilgrims"><AdminPilgrims /></ProtectedRoute>
                    } />
                    <Route path="analytics" element={
                      <ProtectedRoute requiredPermission="analytics"><AdminAnalytics /></ProtectedRoute>
                    } />
                    <Route path="id-tags" element={
                      <ProtectedRoute requiredPermission="id_tags"><AdminIdTags /></ProtectedRoute>
                    } />
                    <Route path="agent-applications" element={
                      <ProtectedRoute requiredPermission="agents"><AdminAgentApplications /></ProtectedRoute>
                    } />
                    <Route path="ai-assistant" element={<AdminAiAssistant />} />
                    <Route path="bank-accounts" element={
                      <ProtectedRoute requiredPermission="bank_accounts"><AdminBankAccounts /></ProtectedRoute>
                    } />
                    <Route path="activity" element={
                      <ProtectedRoute requiredPermission="activity"><AdminActivity /></ProtectedRoute>
                    } />
                    <Route path="amendments" element={
                      <ProtectedRoute requiredPermission="amendments"><AdminAmendmentRequests /></ProtectedRoute>
                    } />
                    <Route path="support" element={
                      <ProtectedRoute requiredPermission="support"><AdminSupport /></ProtectedRoute>
                    } />
                    <Route path="settings" element={
                      <ProtectedRoute requiredPermission="settings"><AdminSettings /></ProtectedRoute>
                    } />
                    <Route path="booking-form" element={
                      <ProtectedRoute requiredPermission="settings"><AdminBookingForm /></ProtectedRoute>
                    } />
                    <Route path="staff" element={
                      <ProtectedRoute requiredPermission="staff_management"><AdminStaffManagement /></ProtectedRoute>
                    } />
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