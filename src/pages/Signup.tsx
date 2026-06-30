import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { getGoogleSignInUrl } from "@/pages/AuthCallback";

export default function Signup() {
  const navigate = useNavigate();

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
              Join Vitalis AI Drug Engine
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Intelligence by Pawanax AI · Neon Auth
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-11 bg-primary text-primary-foreground font-display"
              onClick={async () => { window.location.href = await getGoogleSignInUrl(); }}
            >
              Sign up with Google
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => navigate("/chat")}>
              Start chatting as guest
            </Button>
            <p className="text-sm text-center text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
