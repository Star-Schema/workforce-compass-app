
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ManageJobHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  employeeNumber: string;
  employeeName: string;
}

interface JobHistoryItem {
  effdate: string;
  department: string;
  jobPosition: string;
  salary: number;
}

const ManageJobHistory = ({
  isOpen,
  onClose,
  employeeNumber,
  employeeName,
}: ManageJobHistoryProps) => {
  const [jobHistoryData, setJobHistoryData] = useState<JobHistoryItem[]>([]);
  const { toast } = useToast();

  // Fetch job history data when the dialog opens
  useEffect(() => {
    if (isOpen && employeeNumber) {
      fetchJobHistory();
    }
  }, [isOpen, employeeNumber]);

  const fetchJobHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('jobhistory')
        .select(`
          effdate,
          deptcode,
          jobcode,
          salary
        `)
        .eq('empno', employeeNumber)
        .order('effdate', { ascending: false });

      if (error) {
        throw error;
      }

      // Fetch department names and job descriptions separately
      const transformedData = await Promise.all(
        data.map(async (item) => {
          // Get department name
          let departmentName = 'Unknown';
          if (item.deptcode) {
            const { data: deptData } = await supabase
              .from('department')
              .select('deptname')
              .eq('deptcode', item.deptcode)
              .single();
            
            if (deptData) {
              departmentName = deptData.deptname || 'Unknown';
            }
          }

          // Get job description
          let jobDescription = 'Unknown';
          const { data: jobData } = await supabase
            .from('job')
            .select('jobdesc')
            .eq('jobcode', item.jobcode)
            .single();
          
          if (jobData) {
            jobDescription = jobData.jobdesc || 'Unknown';
          }

          return {
            effdate: item.effdate,
            department: departmentName,
            jobPosition: jobDescription,
            salary: item.salary || 0,
          };
        })
      );

      setJobHistoryData(transformedData);
    } catch (error) {
      console.error("Error fetching job history:", error);
      toast({
        title: "Error",
        description: "Failed to load job history data",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0">
        <div className="border border-gray-400 rounded-md p-6 bg-white w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-lg">Manage Job History</div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

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
              <Plus className="h-4 w-4 mr-1" />
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
                {jobHistoryData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center">No job history records found</td>
                  </tr>
                ) : (
                  jobHistoryData.map((row, idx) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageJobHistory;
