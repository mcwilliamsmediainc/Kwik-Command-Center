import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor: string;
  trend?: string;
  trendUp?: boolean;
}

export function KpiCard({ title, value, icon: Icon, accentColor, trend, trendUp = true }: KpiCardProps) {
  return (
    <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#6b7a90]">{title}</p>
            <p className="text-3xl font-bold text-[#1a2333] tracking-tight">{value}</p>
          </div>
          <div 
            className="p-2.5 rounded-full flex items-center justify-center bg-opacity-10"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Icon 
              className="w-5 h-5" 
              style={{ color: accentColor }} 
            />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-xs">
            <span 
              className={cn(
                "font-medium mr-1.5",
                trendUp ? "text-[#3db54a]" : "text-red-500"
              )}
            >
              {trend}
            </span>
            <span className="text-[#6b7a90]">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
