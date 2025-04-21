
import React from "react";
import { Button } from "@/components/ui/button";

const jobHistoryData = [
  {
    effdate: "2025-04-16",
    department: "IT",
    jobPosition: "PROGRAMMER 1",
    salary: 45000,
  },
  {
    effdate: "2024-12-24",
    department: "Warehouse",
    jobPosition: "Encoder",
    salary: 25000,
  },
];

const ManageJobHistory = () => {
  const employeeNumber = "00005";
  const employeeName = "ESPERANZA, Nehmiah";

  return (
    <div className="border border-gray-400 rounded-md p-6 bg-white max-w-3xl mx-auto">
      <div className="font-bold text-lg mb-4">Manage Job History</div>

      <div className="mb-6">
        <div className="mb-0.5">
          <span className="font-medium">Employee Number&nbsp;:</span>
          <span className="ml-3">{employeeNumber}</span>
        </div>
        <div>
          <span className="font-medium">Employee Name&nbsp;:</span>
          <span className="ml-3 uppercase">{employeeName}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div />
        <Button className="text-blue-600 underline bg-transparent hover:bg-gray-100 px-0 py-0 h-auto" variant="ghost">
          Add New Job History
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-black bg-white">
          <thead>
            <tr className="border-b border-black bg-[#f3f3f3]">
              <th className="px-4 py-2 text-left font-medium">Effectivity Date</th>
              <th className="px-4 py-2 text-left font-medium">Department</th>
              <th className="px-4 py-2 text-left font-medium">Job Position</th>
              <th className="px-4 py-2 text-left font-medium">Salary</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {jobHistoryData.map((row, idx) => (
              <tr key={idx} className="border-b last:border-b-0">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(row.effdate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{row.department}</td>
                <td className="px-4 py-2 whitespace-nowrap">{row.jobPosition}</td>
                <td className="px-4 py-2 whitespace-nowrap">${row.salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-2 py-2 text-center">
                  <a href="#" className="text-blue-600 underline hover:text-blue-800">Edit</a>
                </td>
                <td className="px-2 py-2 text-center">
                  <a href="#" className="text-blue-600 underline hover:text-blue-800">Delete</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageJobHistory;
