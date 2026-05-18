import { RefreshCw, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const DORMANT_CUSTOMERS = [
  { id: "C-0455", name: "Michael Chen", service: "Carpet Cleaning", lastDate: "Mar 12, 2023", months: 8 },
  { id: "C-0633", name: "Elena Rodriguez", service: "Upholstery", lastDate: "Jan 18, 2023", months: 10 },
  { id: "C-0211", name: "Robert Taylor", service: "Tile & Grout", lastDate: "Dec 05, 2022", months: 11 },
  { id: "C-0198", name: "Sunrise Diner", service: "Commercial Carpet", lastDate: "Nov 22, 2022", months: 12 },
  { id: "C-0342", name: "Amanda Lewis", service: "Water Damage (Minor)", lastDate: "Feb 14, 2023", months: 9 },
];

export function ReactivationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2333]">Reactivation Campaigns</h1>
          <p className="text-[#6b7a90] text-sm mt-1">Win back dormant customers with automated outreach</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2b4fac] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" />
          Run Bulk Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#2b4fac] shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6b7a90]">Dormant (&gt;6 mos)</p>
              <p className="text-2xl font-bold text-[#1a2333]">142</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#3db54a] shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6b7a90]">Messages Sent (MTD)</p>
              <p className="text-2xl font-bold text-[#1a2333]">45</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6b7a90]">Reactivated</p>
              <p className="text-2xl font-bold text-[#1a2333]">8 <span className="text-sm font-normal text-green-500 ml-1">+$1.2k</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h3 className="font-semibold text-[#1a2333]">Ready for Outreach</h3>
          <span className="text-sm text-[#6b7a90]">Showing 5 priority targets</span>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-[#6b7a90] font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Last Service</th>
                  <th className="px-6 py-4">Dormant Time</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DORMANT_CUSTOMERS.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1a2333]">{customer.name}</div>
                      <div className="text-xs text-[#6b7a90]">{customer.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#1a2333]">{customer.service}</div>
                      <div className="text-xs text-[#6b7a90]">{customer.lastDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">
                        {customer.months} months
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-1.5 border border-[#2b4fac] text-[#2b4fac] rounded-md text-xs font-medium hover:bg-blue-50 transition-colors">
                        Send Reactivation
                      </button>
                    </td>
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
