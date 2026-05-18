import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor: string;
  topBorderColor: string;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  accentColor,
  topBorderColor,
  trend,
  trendUp = true,
  subtext,
}: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        borderTop: `2px solid ${topBorderColor}`,
      }}
      data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5 flex-1 min-w-0 pr-3">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6b7a90", letterSpacing: "0.6px" }}>
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: "#1a2333" }}>
              {value}
            </p>
          </div>
          <div
            className="p-2.5 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}14` }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
        </div>
        {(trend || subtext) && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className="font-semibold"
                style={{ color: trendUp ? "#3db54a" : "#ef4444" }}
              >
                {trend}
              </span>
            )}
            {subtext && (
              <span style={{ color: "#6b7a90" }}>{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
