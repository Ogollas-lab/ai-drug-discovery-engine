import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let neonAuthUrlPromise: Promise<string> | null = null;

async function fetchNeonAuthUrl(): Promise<string> {
  if (!neonAuthUrlPromise) {
    neonAuthUrlPromise = fetch(`${API_BASE}/api/auth/config`)
      .then((r) => {
        if (!r.ok) throw new Error(`auth config ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const url = data?.neonAuthUrl;
        if (!url) throw new Error("neonAuthUrl missing from /api/auth/config");
        return url as string;
      })
      .catch((err) => {
        neonAuthUrlPromise = null;
        throw err;
      });
  }
  return neonAuthUrlPromise;
}

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

export async function getGoogleSignInUrl(): Promise<string> {
  const base = await fetchNeonAuthUrl();
  const callback = `${window.location.origin}/auth/callback`;
  return `${base}/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callback)}`;
}

export async function getEmailSignInUrl(): Promise<string> {
  const base = await fetchNeonAuthUrl();
  const callback = `${window.location.origin}/auth/callback`;
  return `${base}/sign-in?callbackURL=${encodeURIComponent(callback)}`;
}
