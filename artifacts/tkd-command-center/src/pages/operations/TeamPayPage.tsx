import { DollarSign, Clock, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TEAM = [
  { id: "T-01", name: "Marcus Johnson", role: "Lead Tech", status: "On Duty", hours: 38.5, rate: "$28.00", pay: "$1,078.00" },
  { id: "T-02", name: "David Miller", role: "Technician", status: "On Duty", hours: 36.0, rate: "$22.00", pay: "$792.00" },
  { id: "T-03", name: "James Wilson", role: "Technician", status: "Off Duty", hours: 42.5, rate: "$24.00", pay: "$1,050.00" }, // 40 * 24 + 2.5 * 36
  { id: "T-04", name: "Sarah Davis", role: "Dispatcher", status: "On Duty", hours: 35.0, rate: "$25.00", pay: "$875.00" },
  { id: "T-05", name: "Tommy Lee", role: "Apprentice", status: "On Duty", hours: 28.0, rate: "$18.00", pay: "$504.00" },
];

export function TeamPayPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2333]">Team & Pay</h1>
          <p className="text-[#6b7a90] text-sm mt-1">Manage personnel, hours, and payroll</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1a2333] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export Payroll
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-[#6b7a90] mb-1">Total Hours (This Week)</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[#1a2333]">180.0</p>
                <span className="text-sm text-green-500 font-medium mb-1">-2.5 hrs vs last wk</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-[#6b7a90] mb-1">Estimated Payroll</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[#1a2333]">$4,299.00</p>
                <span className="text-sm text-red-500 font-medium mb-1">+$150 vs last wk</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-[#3db54a]">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h3 className="font-semibold text-[#1a2333]">Team Members</h3>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-[#6b7a90] font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Hours (Week)</th>
                  <th className="px-6 py-4 text-right">Pay Rate</th>
                  <th className="px-6 py-4 text-right">Est. Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TEAM.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1a2333]">{member.name}</div>
                      <div className="text-xs text-[#6b7a90]">{member.id}</div>
                    </td>
                    <td className="px-6 py-4 text-[#6b7a90]">{member.role}</td>
                    <td className="px-6 py-4">
                      <Badge className={`
                        border-none font-medium px-2 py-0.5 shadow-none
                        ${member.status === 'On Duty' ? 'bg-green-100 text-[#3db54a] hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}
                      `}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <span className={member.hours > 40 ? "text-amber-600" : "text-[#1a2333]"}>
                        {member.hours.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[#6b7a90]">{member.rate}/hr</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1a2333]">{member.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
