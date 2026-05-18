import { Plus, MoreHorizontal, Calendar, MapPin } from "lucide-react";

const PIPELINE = [
  {
    id: "col-new",
    title: "New Requests",
    color: "border-blue-200 bg-blue-50/30",
    headerColor: "bg-blue-100 text-blue-800",
    cards: [
      { id: "J-8501", customer: "Lisa Wong", service: "Water Extraction", address: "1422 E 3rd St", time: "ASAP" },
      { id: "J-8502", customer: "Pine Plaza", service: "Carpet Cleaning", address: "8800 S Yale Ave", time: "Flexible" }
    ]
  },
  {
    id: "col-scheduled",
    title: "Scheduled",
    color: "border-amber-200 bg-amber-50/30",
    headerColor: "bg-amber-100 text-amber-800",
    cards: [
      { id: "J-8493", customer: "Michael Chen", service: "Mold Remediation", address: "4410 S Peoria Ave", time: "Today, 2:00 PM" },
      { id: "J-8495", customer: "The Meridia", service: "Tile & Grout", address: "112 W 7th St", time: "Tomorrow, 9:00 AM" }
    ]
  },
  {
    id: "col-progress",
    title: "In Progress",
    color: "border-purple-200 bg-purple-50/30",
    headerColor: "bg-purple-100 text-purple-800",
    cards: [
      { id: "J-8492", customer: "Sarah Jenkins", service: "Water Extraction", address: "8411 S Florence", time: "Started 9:00 AM" }
    ]
  },
  {
    id: "col-completed",
    title: "Completed",
    color: "border-green-200 bg-green-50/30",
    headerColor: "bg-green-100 text-green-800",
    cards: [
      { id: "J-8491", customer: "Oakwood Apts", service: "Carpet Cleaning", address: "Unit 4B", time: "Finished 8:15 AM" },
      { id: "J-8488", customer: "City Library", service: "Upholstery", address: "Main Branch", time: "Finished Yesterday" }
    ]
  }
];

export function JobPipelinePage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2333]">Job Pipeline</h1>
          <p className="text-[#6b7a90] text-sm mt-1">Track service tickets from request to completion</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2b4fac] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {PIPELINE.map((column) => (
          <div key={column.id} className={`flex flex-col w-[320px] shrink-0 rounded-xl border ${column.color}`}>
            <div className="p-3 border-b border-[rgba(0,0,0,0.05)] flex justify-between items-center">
              <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${column.headerColor}`}>
                {column.title} <span className="ml-1 opacity-70">{column.cards.length}</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {column.cards.map((card) => (
                <div key={card.id} className="bg-white p-4 rounded-lg shadow-sm border border-[rgba(0,0,0,0.07)] hover:shadow-md transition-shadow cursor-grab group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-[#2b4fac] bg-blue-50 px-1.5 py-0.5 rounded">{card.id}</span>
                    <button className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-semibold text-[#1a2333] mb-1">{card.customer}</h4>
                  <p className="text-xs font-medium text-[#6b7a90] mb-3">{card.service}</p>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span className="truncate">{card.address}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span>{card.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
