import { Search, Filter, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CUSTOMERS = [
  { id: "C-1042", name: "Oakwood Apartments", contact: "Mark Stevens", phone: "(918) 555-0192", lastJob: "Oct 24, 2023", totalSpent: "$14,500", status: "Active" },
  { id: "C-0891", name: "Sarah Jenkins", contact: "Sarah Jenkins", phone: "(918) 555-4821", lastJob: "Today", totalSpent: "$1,250", status: "Active" },
  { id: "C-0922", name: "City Library", contact: "Director's Office", phone: "(918) 555-9932", lastJob: "Yesterday", totalSpent: "$3,800", status: "Active" },
  { id: "C-0455", name: "Michael Chen", contact: "Michael Chen", phone: "(918) 555-2241", lastJob: "Mar 12, 2023", totalSpent: "$850", status: "Dormant" },
  { id: "C-1102", name: "David Ross", contact: "David Ross", phone: "(918) 555-8839", lastJob: "Pending", totalSpent: "$0", status: "Lead" },
  { id: "C-0784", name: "River Creek HOA", contact: "Property Mgmt", phone: "(918) 555-1104", lastJob: "Aug 05, 2023", totalSpent: "$8,200", status: "Active" },
  { id: "C-0633", name: "Elena Rodriguez", contact: "Elena Rodriguez", phone: "(918) 555-7742", lastJob: "Jan 18, 2023", totalSpent: "$450", status: "Dormant" },
  { id: "C-0988", name: "TechHub Co-working", contact: "Facilities", phone: "(918) 555-5521", lastJob: "Sep 30, 2023", totalSpent: "$2,100", status: "Active" },
];

export function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2333]">Customer Directory</h1>
          <p className="text-[#6b7a90] text-sm mt-1">Manage and track your client base</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1a2333] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2b4fac] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Add Customer
          </button>
        </div>
      </div>

      <Card className="bg-white border-[rgba(0,0,0,0.07)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50 rounded-t-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search customers by name, ID, or phone..." 
              className="pl-9 bg-white border-gray-200 focus-visible:ring-[#2b4fac]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#6b7a90] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-[#6b7a90] font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact & Phone</th>
                  <th className="px-6 py-4">Last Job</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CUSTOMERS.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1a2333]">{customer.name}</div>
                      <div className="text-xs text-[#6b7a90]">{customer.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#1a2333]">{customer.contact}</div>
                      <div className="text-[#6b7a90]">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-[#6b7a90]">{customer.lastJob}</td>
                    <td className="px-6 py-4 font-medium text-[#1a2333]">{customer.totalSpent}</td>
                    <td className="px-6 py-4">
                      <Badge className={`
                        border-none font-medium px-2.5 py-0.5 shadow-none
                        ${customer.status === 'Active' ? 'bg-green-100 text-[#3db54a] hover:bg-green-100' : ''}
                        ${customer.status === 'Dormant' ? 'bg-gray-100 text-gray-600 hover:bg-gray-100' : ''}
                        ${customer.status === 'Lead' ? 'bg-blue-100 text-[#2b4fac] hover:bg-blue-100' : ''}
                      `}>
                        {customer.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#2b4fac] text-sm font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-[#6b7a90]">
            <div>Showing 1 to 8 of 42 entries</div>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded disabled:opacity-50" disabled>Prev</button>
              <button className="px-3 py-1 border border-gray-200 rounded bg-[#2b4fac] text-white">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
