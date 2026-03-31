import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { apiClient } from "@/lib/api-client";
import { Check, Zap, Building2, Beaker, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";

const Pricing = () => {
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();
  const currentTier = subscription?.tier || "free";
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user just returned from Stripe
    if (searchParams.get("upgrade_cancelled") === "true") {
      toast({
        title: "Checkout Cancelled",
        description: "Your checkout process was cancelled.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/pricing");
    }
  }, [searchParams, toast]);

  const handleUpgrade = async (tierId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upgrade your subscription.",
        variant: "destructive",
      });
      return;
    }

    if (currentTier === tierId) {
      toast({ title: "Already Subscribed", description: `You are already on the ${tierId} plan.` });
      return;
    }

    setLoadingTier(tierId);
    try {
      const res = await apiClient.post("/api/subscription/create-checkout-session", { tierId });
      if (res.data?.url) {
        window.location.href = res.data.url; // Redirect to Stripe
      }
    } catch (err: any) {
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to initialize payment.",
        variant: "destructive",
      });
      setLoadingTier(null);
    }
  };

  const PLANS = [
    {
      id: "free",
      name: "Student",
      description: "Get started with basic molecular simulations.",
      price: "0",
      icon: <Beaker className="w-5 h-5 text-muted-foreground" />,
      features: [
        "5 Simulations per day",
        "Basic Molecule Analysis",
        "Public Datasets Only",
        "Community Support",
      ],
      buttonText: currentTier === "free" ? "Current Plan" : "Downgrade",
      disabled: currentTier === "free",
    },
    {
      id: "pro",
      name: "Pro Researcher",
      description: "For individual scientists and biotech educators.",
      price: "9.99",
      icon: <Zap className="w-5 h-5 text-primary" />,
      popular: true,
      features: [
        "100 Simulations per day",
        "Full AI What-If Chemist",
        "PubChem + ChEMBL Datasets",
        "Downloadable PDF Reports",
        "Priority Support",
      ],
      buttonText: currentTier === "pro" ? "Current Plan" : "Upgrade to Pro",
      disabled: currentTier === "pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For biotech startups and pharma research labs.",
      price: "499.99",
      icon: <Building2 className="w-5 h-5 text-neon-cyan" />,
      features: [
        "Unlimited Simulations",
        "Full API Access",
        "Batch Processing (100+ mol)",
        "Explainable AI Models",
        "Dedicated Account Manager",
        "SLA Guarantee",
      ],
      buttonText: currentTier === "enterprise" ? "Current Plan" : "Contact Sales",
      disabled: currentTier === "enterprise",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-[1200px] mx-auto px-4 py-20 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono mb-4">
            <ShieldCheck className="w-4 h-4" /> Secure Stripe Checkout
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg pt-4">
            Power your drug discovery pipeline with industry-grade AI models. Upgrade to unlock full access to PubChem integrations and advanced What-If Chemistry.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative glass-panel rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                plan.popular ? "border-primary/50 shadow-[0_0_30px_rgba(45,212,191,0.15)] scale-105" : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wider">
                  MOST POPULAR
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-secondary">{plan.icon}</div>
                <h3 className="font-display font-semibold text-xl">{plan.name}</h3>
              </div>
              
              <div className="mb-6">
                <span className="text-4xl font-display font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">{plan.description}</p>
              
              <div className="flex-1">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button
                className={`w-full ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                disabled={plan.disabled || loadingTier !== null}
                onClick={() => handleUpgrade(plan.id)}
              >
                {loadingTier === plan.id ? (
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : (
                  plan.buttonText
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Pricing;
