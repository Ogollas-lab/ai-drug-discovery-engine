import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

interface Props {
  riskFlags: string[];
  recommendations: string[];
}

const RiskPanel = ({ riskFlags, recommendations }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Risk Flags
        </CardTitle>
      </CardHeader>
      <CardContent>
        {riskFlags.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            No risk flags detected
          </div>
        ) : (
          <ul className="space-y-2">
            {riskFlags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-1 shrink-0">→</span>
              <span className="text-muted-foreground">{r}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </div>
);

export default RiskPanel;
