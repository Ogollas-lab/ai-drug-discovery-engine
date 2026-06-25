import { AlertTriangle } from "lucide-react";

interface DemoBannerProps {
  title?: string;
  message: string;
  variant?: "demo" | "simulator" | "education";
}

export default function DemoBanner({ title, message, variant = "demo" }: DemoBannerProps) {
  const colors =
    variant === "simulator"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-destructive/30 bg-destructive/10 text-destructive/90";

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 mb-4 ${colors}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold font-mono uppercase tracking-wide">
          {title || (variant === "simulator" ? "Training Simulator" : "Demonstration Data")}
        </p>
        <p className="text-xs mt-1 leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  );
}
