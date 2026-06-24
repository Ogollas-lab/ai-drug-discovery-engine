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
import Predictions from "./pages/Predictions";
import Pipeline from "./pages/Pipeline";
import XAIDashboard from "./pages/XAIDashboard";
import Grounding from "./pages/Grounding";
import Compatibility from "./pages/Compatibility";
import BindingRealism from "./pages/BindingRealism";
import Datasets from "./pages/Datasets";
import GATPredictor from "./pages/GATPredictor";
import Validation from "./pages/Validation";
import Training from "./pages/Training";
import Governance from "./pages/Governance";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/education" element={<Education />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/xai" element={<XAIDashboard />} />
              <Route path="/grounding" element={<Grounding />} />
              <Route path="/compatibility" element={<Compatibility />} />
              <Route path="/binding" element={<BindingRealism />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/gat" element={<GATPredictor />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/training" element={<Training />} />
              <Route path="/governance" element={<Governance />} />
              <Route path="/benchmarks" element={<Benchmarks />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
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
