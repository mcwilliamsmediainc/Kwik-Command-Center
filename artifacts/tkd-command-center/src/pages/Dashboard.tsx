import { Briefcase, DollarSign, Activity, Users, Plus, Send, FileText, BarChart } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RECENT_JOBS = [
  { id: "J-8492", customer: "Sarah Jenkins", service: "Water Extraction", status: "In Progress", statusColor: "bg-blue-100 text-[#2b4fac] hover:bg-blue-100", date: "Today, 9:00 AM" },
  { id: "J-8491", customer: "Oakwood Apartments", service: "Carpet Cleaning", status: "Completed", statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100", date: "Today, 8:15 AM" },
  { id: "J-8493", customer: "Michael Chen", service: "Mold Remediation", status: "Scheduled", statusColor: "bg-amber-100 text-amber-700 hover:bg-amber-100", date: "Today, 2:00 PM" },
  { id: "J-8488", customer: "City Library", service: "Upholstery Cleaning", status: "Completed", statusColor: "bg-green-100 text-[#3db54a] hover:bg-green-100", date: "Yesterday" },
  { id: "J-8494", customer: "David Ross", service: "Tile & Grout", status: "On Hold", statusColor: "bg-gray-100 text-gray-700 hover:bg-gray-100", date: "Tomorrow" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Jobs Today" 
          value="12" 
          icon={Briefcase} 
          accentColor="#2b4fac" 
          trend="+8%"
        />
        <KpiCard 
          title="Revenue (MTD)" 
          value="$48,200" 
          icon={DollarSign} 
          accentColor="#3db54a" 
          trend="+12%"
        />
        <KpiCard 
          title="Active Jobs" 
          value="7" 
          icon={Activity} 
          accentColor="#f59e0b" 
        />
        <KpiCard 
          title="Team Members" 
          value="14" 
          icon={Users} 
          accentColor="#2b4fac" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Jobs Table */}
        <Card className="lg:col-span-3 bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-[#1a2333] text-lg font-semibold flex items-center justify-between">
              Recent Jobs
              <button className="text-sm text-[#2b4fac] font-medium hover:underline">View All</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-[#6b7a90] font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Job #</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {RECENT_JOBS.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#1a2333]">{job.id}</td>
                      <td className="px-5 py-3 text-[#1a2333]">{job.customer}</td>
                      <td className="px-5 py-3 text-[#6b7a90]">{job.service}</td>
                      <td className="px-5 py-3">
                        <Badge className={`${job.statusColor} border-none font-medium px-2 py-0.5 shadow-none`}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[#6b7a90] whitespace-nowrap">{job.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2 bg-white border-[rgba(0,0,0,0.07)] shadow-sm h-fit">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-[#1a2333] text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="flex flex-col items-start text-left p-4 rounded-lg border border-gray-200 hover:border-[#2b4fac] hover:shadow-sm hover:bg-blue-50/30 transition-all group">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2b4fac] mb-3 group-hover:bg-[#2b4fac] group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1a2333] mb-1">New Job</span>
                <span className="text-xs text-[#6b7a90]">Create & schedule</span>
              </button>
              
              <button className="flex flex-col items-start text-left p-4 rounded-lg border border-gray-200 hover:border-[#2b4fac] hover:shadow-sm hover:bg-blue-50/30 transition-all group">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Send className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1a2333] mb-1">Dispatch Team</span>
                <span className="text-xs text-[#6b7a90]">Assign vehicles</span>
              </button>

              <button className="flex flex-col items-start text-left p-4 rounded-lg border border-gray-200 hover:border-[#2b4fac] hover:shadow-sm hover:bg-blue-50/30 transition-all group">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-[#3db54a] mb-3 group-hover:bg-[#3db54a] group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1a2333] mb-1">Send Invoice</span>
                <span className="text-xs text-[#6b7a90]">Bill completed jobs</span>
              </button>

              <button className="flex flex-col items-start text-left p-4 rounded-lg border border-gray-200 hover:border-[#2b4fac] hover:shadow-sm hover:bg-blue-50/30 transition-all group">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <BarChart className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#1a2333] mb-1">View Reports</span>
                <span className="text-xs text-[#6b7a90]">Financial & ops</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
