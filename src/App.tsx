import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import Index from "./pages/Index";
import Screening from "./pages/Screening";
import Workspace from "./pages/Workspace";
import Education from "./pages/Education";
import Benchmarks from "./pages/Benchmarks";
import Classroom from "./pages/Classroom";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/screening" element={<Screening />} />
              <Route path="/education" element={<Education />} />
              <Route path="/benchmarks" element={<Benchmarks />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
