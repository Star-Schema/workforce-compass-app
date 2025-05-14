
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  History,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from 'date-fns';
import { JobHistory, Employee, Department } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';

interface JobHistoryRecord {
  jobcode: string;
  effdate: string;
  salary: number | null;
  empno: string;
  deptcode: string;
  employee: {
    empno: string;
    firstname: string | null;
    lastname: string | null;
  };
  department: {
    deptcode: string;
    deptname: string | null;
  };
}

const JobHistoryPage = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    console.log("JobHistory component mounted");
    
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('jobhistory').select('*').limit(1);
        console.log("Supabase connection check:", { data, error });
        if (error) {
          toast.error("Supabase connection issue: " + error.message);
        } else {
          console.log("Supabase connection successful");
        }
      } catch (e) {
        console.error("Failed to check Supabase connection:", e);
      }
    };
    
    checkSupabase();
  }, []);

  const { data: jobHistory = [], isLoading: isLoadingJobHistory, refetch, error } = useQuery<JobHistoryRecord[]>({
    queryKey: ['jobHistory', searchQuery],
    queryFn: async () => {
      try {
        console.log("Fetching job history with search:", { searchQuery });
        
        let query = supabase
          .from('jobhistory')
          .select(`
            jobcode,
            effdate,
            salary,
            empno,
            deptcode,
            employee:employee!jobhistory_empno_fkey(empno, firstname, lastname),
            department:department!jobhistory_deptcode_fkey(deptcode, deptname)
          `);
        
        const { data, error } = await query.order('effdate', { ascending: false });
        
        if (error) {
          console.error("Error fetching job history:", error);
          throw error;
        }
        
        console.log("Job history data:", data);
        
        let filteredData = data || [];
        
        // Apply search filter if search query exists
        if (searchQuery) {
          const lowerCaseSearch = searchQuery.toLowerCase();
          filteredData = filteredData.filter((record: any) => {
            const employeeName = `${record.employee?.firstname || ''} ${record.employee?.lastname || ''}`.toLowerCase();
            const departmentName = record.department?.deptname?.toLowerCase() || '';
            const jobCode = record.jobcode?.toLowerCase() || '';
            
            return employeeName.includes(lowerCaseSearch) || 
                   departmentName.includes(lowerCaseSearch) ||
                   jobCode.includes(lowerCaseSearch);
          });
        }
        
        // Transform the data to match our JobHistoryRecord interface
        const transformedData: JobHistoryRecord[] = filteredData.map((record: any) => ({
          jobcode: record.jobcode,
          effdate: record.effdate,
          salary: record.salary,
          empno: record.empno,
          deptcode: record.deptcode,
          employee: {
            empno: record.employee?.empno || '',
            firstname: record.employee?.firstname || '',
            lastname: record.employee?.lastname || '',
          },
          department: {
            deptcode: record.department?.deptcode || '',
            deptname: record.department?.deptname || '',
          }
        }));
        
        return transformedData;
      } catch (error) {
        console.error("Failed to fetch job history:", error);
        toast.error("Failed to load job history data");
        throw error;
      }
    },
  });

  useEffect(() => {
    if (error) {
      console.error("Job history query error:", error);
    }
  }, [error]);

  const handleRefresh = () => {
    toast.info("Refreshing data...");
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
          <p className="text-muted-foreground">Track employee job transitions and career progression</p>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by employee name, department, or job code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Code</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingJobHistory ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-destructive">
                    Error loading data: {(error as Error).message}
                  </TableCell>
                </TableRow>
              ) : jobHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">No job history records found</TableCell>
                </TableRow>
              ) : (
                jobHistory.map((history: JobHistoryRecord, index: number) => (
                  <TableRow key={`${history.empno}-${history.effdate}-${index}`}>
                    <TableCell className="font-medium">
                      {history.employee?.firstname} {history.employee?.lastname}
                    </TableCell>
                    <TableCell>{history.department?.deptname}</TableCell>
                    <TableCell>{history.jobcode}</TableCell>
                    <TableCell>${history.salary?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      {history.effdate && format(new Date(history.effdate), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobHistoryPage;
