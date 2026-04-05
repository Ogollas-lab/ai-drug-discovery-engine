import { Card } from "@/components/ui/card";

interface PredictionGaugeProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "primary" | "accent" | "green";
}

const colorMap = {
  primary: { ring: "text-primary", bg: "bg-primary/10", text: "text-primary" },
  accent: { ring: "text-accent", bg: "bg-accent/10", text: "text-accent" },
  green: { ring: "text-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400" },
};

const PredictionGauge = ({ label, value, icon, color }: PredictionGaugeProps) => {
  const c = colorMap[color];
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Card className="flex flex-col items-center justify-center p-6">
      <div className="relative w-24 h-24 mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
            className="text-secondary" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8"
            className={c.ring}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold font-mono ${c.text}`}>{value.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={c.text}>{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </Card>
  );
};

export default PredictionGauge;
