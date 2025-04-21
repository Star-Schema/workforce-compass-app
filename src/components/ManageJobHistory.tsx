
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  deptcode: string;
  jobcode: string;
}

const ManageJobHistory = ({
  isOpen,
  onClose,
  employeeNumber,
  employeeName,
}: ManageJobHistoryProps) => {
  const [jobHistoryData, setJobHistoryData] = useState<JobHistoryItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editDialogOpenIdx, setEditDialogOpenIdx] = useState<number | null>(null);
  const [deleteDialogOpenIdx, setDeleteDialogOpenIdx] = useState<number | null>(null);
  const [form, setForm] = useState<{ effdate: string; deptcode: string; jobcode: string; salary: string }>({ effdate: '', deptcode: '', jobcode: '', salary: '' });
  const [departments, setDepartments] = useState<{ deptcode: string; deptname: string }[]>([]);
  const [jobs, setJobs] = useState<{ jobcode: string; jobdesc: string }[]>([]);
  const { toast } = useToast();

  // Fetch job history data when the dialog opens
  useEffect(() => {
    if (isOpen && employeeNumber) {
      fetchJobHistory();
      fetchDepartments();
      fetchJobs();
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

      if (error) throw error;

      // Attach department and job descriptions from lookups
      const transformedData: JobHistoryItem[] = await Promise.all(
        (data || []).map(async (item) => {
          // Get department name
          let departmentName = 'Unknown';
          if (item.deptcode) {
            const { data: deptData } = await supabase
              .from('department')
              .select('deptname')
              .eq('deptcode', item.deptcode)
              .maybeSingle();
            if (deptData && deptData.deptname) {
              departmentName = deptData.deptname;
            }
          }

          // Get job description
          let jobDescription = 'Unknown';
          if (item.jobcode) {
            const { data: jobData } = await supabase
              .from('job')
              .select('jobdesc')
              .eq('jobcode', item.jobcode)
              .maybeSingle();
            if (jobData && jobData.jobdesc) {
              jobDescription = jobData.jobdesc;
            }
          }

          return {
            effdate: item.effdate,
            deptcode: item.deptcode,
            jobcode: item.jobcode,
            department: departmentName,
            jobPosition: jobDescription,
            salary: Number(item.salary) || 0,
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

  // Department list for dropdown
  const fetchDepartments = async () => {
    const { data } = await supabase.from('department').select('deptcode, deptname').order('deptname', { ascending: true });
    setDepartments(data || []);
  };
  // Job list for dropdown
  const fetchJobs = async () => {
    const { data } = await supabase.from('job').select('jobcode, jobdesc').order('jobdesc', { ascending: true });
    setJobs(data || []);
  };

  // Add New Job History
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('jobhistory').insert({
        empno: employeeNumber,
        effdate: form.effdate,
        jobcode: form.jobcode,
        deptcode: form.deptcode,
        salary: parseFloat(form.salary),
      });
      toast({ title: "Success", description: "Added job history." });
      setShowAddDialog(false);
      setForm({ effdate: '', deptcode: '', jobcode: '', salary: '' });
      fetchJobHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add job history",
        variant: "destructive"
      });
    }
  };

  // Edit Job History
  const handleEdit = async (idx: number) => {
    try {
      const entry = jobHistoryData[idx];
      await supabase.from('jobhistory')
        .update({
          effdate: form.effdate,
          jobcode: form.jobcode,
          deptcode: form.deptcode,
          salary: parseFloat(form.salary)
        })
        .eq('empno', employeeNumber)
        .eq('effdate', entry.effdate)
        .eq('jobcode', entry.jobcode)
        .eq('deptcode', entry.deptcode);
      toast({ title: "Success", description: "Updated job history." });
      setEditDialogOpenIdx(null);
      setForm({ effdate: '', deptcode: '', jobcode: '', salary: '' });
      fetchJobHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job history",
        variant: "destructive"
      });
    }
  };

  // Delete Job History
  const handleDelete = async (idx: number) => {
    try {
      const entry = jobHistoryData[idx];
      await supabase.from('jobhistory')
        .delete()
        .eq('empno', employeeNumber)
        .eq('effdate', entry.effdate)
        .eq('jobcode', entry.jobcode)
        .eq('deptcode', entry.deptcode);
      toast({ title: "Success", description: "Deleted job history entry." });
      setDeleteDialogOpenIdx(null);
      fetchJobHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job history entry",
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
            <Button
              className="text-blue-600 underline bg-transparent hover:bg-gray-100 px-0 py-0 h-auto"
              variant="ghost"
              onClick={() => { setShowAddDialog(true); setForm({ effdate: '', deptcode: '', jobcode: '', salary: '' }); }}
            >
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
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditDialogOpenIdx(idx);
                          setForm({
                            effdate: row.effdate,
                            deptcode: row.deptcode,
                            jobcode: row.jobcode,
                            salary: row.salary.toString()
                          });
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialogOpenIdx(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add job history dialog */}
        {showAddDialog && (
          <Dialog open onOpenChange={setShowAddDialog}>
            <DialogContent className="sm:max-w-[400px]">
              <div className="font-bold mb-2">Add Job History Entry</div>
              <form onSubmit={handleAdd} className="space-y-2">
                <div>
                  <label className="block font-medium text-sm mb-1">Effectivity Date</label>
                  <Input type="date" value={form.effdate} onChange={e => setForm(f => ({ ...f, effdate: e.target.value }))} required />
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Department</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    value={form.deptcode}
                    onChange={(e) => setForm(f => ({ ...f, deptcode: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select</option>
                    {departments.map((d) => <option value={d.deptcode} key={d.deptcode}>{d.deptname}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Job Position</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    value={form.jobcode}
                    onChange={(e) => setForm(f => ({ ...f, jobcode: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select</option>
                    {jobs.map(j => <option value={j.jobcode} key={j.jobcode}>{j.jobdesc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Salary</label>
                  <Input type="number" min="0" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} required />
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button type="submit" className="bg-hrm-600 hover:bg-hrm-700 text-white">Add Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit job history dialog */}
        {editDialogOpenIdx !== null && (
          <Dialog open onOpenChange={() => setEditDialogOpenIdx(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <div className="font-bold mb-2">Edit Job History Entry</div>
              <form onSubmit={e => { e.preventDefault(); handleEdit(editDialogOpenIdx); }} className="space-y-2">
                <div>
                  <label className="block font-medium text-sm mb-1">Effectivity Date</label>
                  <Input type="date" value={form.effdate} onChange={e => setForm(f => ({ ...f, effdate: e.target.value }))} required />
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Department</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    value={form.deptcode}
                    onChange={(e) => setForm(f => ({ ...f, deptcode: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select</option>
                    {departments.map((d) => <option value={d.deptcode} key={d.deptcode}>{d.deptname}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Job Position</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    value={form.jobcode}
                    onChange={(e) => setForm(f => ({ ...f, jobcode: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select</option>
                    {jobs.map(j => <option value={j.jobcode} key={j.jobcode}>{j.jobdesc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1">Salary</label>
                  <Input type="number" min="0" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} required />
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpenIdx(null)}>Cancel</Button>
                  <Button type="submit" className="bg-hrm-600 hover:bg-hrm-700 text-white">Update Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete confirm dialog */}
        {deleteDialogOpenIdx !== null && (
          <Dialog open onOpenChange={() => setDeleteDialogOpenIdx(null)}>
            <DialogContent className="sm:max-w-[350px]">
              <div className="font-bold mb-2">Delete Job History Entry</div>
              <div>Are you sure you want to delete this entry?</div>
              <div className="flex gap-2 pt-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setDeleteDialogOpenIdx(null)}>Cancel</Button>
                <Button type="button" variant="destructive" onClick={() => handleDelete(deleteDialogOpenIdx!)}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageJobHistory;
