import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const NEON_AUTH = import.meta.env.VITE_NEON_AUTH_URL
  || "https://ep-jolly-poetry-amv4s86d.neonauth.c-5.us-east-1.aws.neon.tech/neondb/auth";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || params.get("access_token");
    if (token) {
      localStorage.setItem("token", token);
    }
    // Neon Auth sets session cookie on auth domain; store guest flag for UI
    localStorage.setItem("auth_provider", "neon");
    navigate("/chat", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <BrandLogo size="lg" />
      <p className="text-sm font-mono text-muted-foreground animate-pulse">Completing sign-in…</p>
    </div>
  );
}

export function getGoogleSignInUrl() {
  const callback = `${window.location.origin}/auth/callback`;
  return `${NEON_AUTH}/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callback)}`;
}

export function getEmailSignInUrl() {
  const callback = `${window.location.origin}/auth/callback`;
  return `${NEON_AUTH}/sign-in?callbackURL=${encodeURIComponent(callback)}`;
}
