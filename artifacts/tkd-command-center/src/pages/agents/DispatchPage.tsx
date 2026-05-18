import { Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DispatchPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
      <Card className="w-full max-w-md text-center bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
        <CardContent className="pt-10 pb-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
            <Radio className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a2333] mb-2">Dispatch</h2>
          <p className="text-[#6b7a90] mb-8">Real-time team dispatch and coordination</p>
          
          <div className="w-full p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-500">Interface Coming Soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
