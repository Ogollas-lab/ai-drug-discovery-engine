import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
} from "recharts";

export const ConfidencePanel = ({ breakdown, overall }: { breakdown: { aspect: string; value: number; max: number }[]; overall: number }) => {
  const radarData = breakdown.map(b => ({ subject: b.aspect, value: b.value, fullMark: b.max }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Confidence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Confidence" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3 w-full">
            {breakdown.map(b => (
              <div key={b.aspect} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{b.aspect}</span>
                  <span className="font-mono text-foreground">{b.value}%</span>
                </div>
                <Progress value={b.value} className="h-1.5" />
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Overall Confidence</span>
              <Badge variant={overall >= 85 ? "default" : overall >= 70 ? "secondary" : "destructive"} className="font-mono">
                {overall}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
