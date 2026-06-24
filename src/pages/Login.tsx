import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getGoogleSignInUrl } from "@/pages/AuthCallback";
import BrandLogo from "@/components/BrandLogo";

export default function Login() {
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const continueAsGuest = () => {
    loginAsGuest();
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-md mx-auto px-4 py-16">
        <div className="flex justify-center mb-8">
          <BrandLogo size="lg" />
        </div>
        <Card className="glass-panel border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-balance">
              Sign in to Vitalis AI Drug Engine
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Powered by Pawanax AI · Neon Auth
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-11 bg-primary text-primary-foreground font-display gap-2"
              onClick={() => { window.location.href = getGoogleSignInUrl(); }}
            >
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 font-display"
              onClick={continueAsGuest}
            >
              Continue as guest → Chat
            </Button>
            <p className="text-[10px] text-center text-muted-foreground font-mono pt-2">
              Guest mode gives full chat access. Sign in saves your session.
            </p>
            <Link to="/chat" className="block text-center text-xs text-primary hover:underline">
              Skip to Pawanax Chat →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
