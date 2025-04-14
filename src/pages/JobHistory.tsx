
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  History,
  Search,
  RefreshCw,
  FilterX,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

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
    queryKey: ['jobHistory', employeeFilter, departmentFilter, searchQuery],
    queryFn: async () => {
      try {
        console.log("Fetching job history with filters:", { employeeFilter, departmentFilter, searchQuery });
        
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
        
        if (employeeFilter) {
          query = query.eq('empno', employeeFilter);
        }
        
        if (departmentFilter) {
          query = query.eq('deptcode', departmentFilter);
        }
        
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
          filteredData = filteredData.filter(record => {
            const employeeName = `${record.employee?.firstname || ''} ${record.employee?.lastname || ''}`.toLowerCase();
            const departmentName = record.department?.deptname?.toLowerCase() || '';
            const jobCode = record.jobcode?.toLowerCase() || '';
            
            return employeeName.includes(lowerCaseSearch) || 
                   departmentName.includes(lowerCaseSearch) ||
                   jobCode.includes(lowerCaseSearch);
          });
        }
        
        return filteredData;
      } catch (error) {
        console.error("Failed to fetch job history:", error);
        toast.error("Failed to load job history data");
        throw error; // Rethrow to let React Query handle the error state
      }
    },
  });

  useEffect(() => {
    if (error) {
      console.error("Job history query error:", error);
    }
  }, [error]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employeesDropdown'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('employee')
          .select('empno, firstname, lastname')
          .order('lastname', { ascending: true });
        
        if (error) throw error;
        console.log("Employees data:", data);
        return data || [];
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employee data");
        return [];
      }
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departmentsDropdown'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('department')
          .select('deptcode, deptname')
          .order('deptname', { ascending: true });
        
        if (error) throw error;
        console.log("Departments data:", data);
        return data || [];
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        toast.error("Failed to load department data");
        return [];
      }
    },
  });

  const handleClearFilters = () => {
    setEmployeeFilter('');
    setDepartmentFilter('');
    setSearchQuery('');
  };

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

        <Tabs 
          defaultValue="all" 
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            handleClearFilters();
          }}
          className="w-full"
        >
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <TabsList className="mb-2">
              <TabsTrigger value="all">All History</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
            </TabsList>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <TabsContent value="all" className="mt-0">
            {/* All job history with no filters */}
          </TabsContent>
          
          <TabsContent value="search" className="mt-0 space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by employee name, department, or job code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  <FilterX className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="filters" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="employee" className="text-sm font-medium leading-none">
                  Employee
                </label>
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Employees</SelectItem>
                    {employees.map((employee: Employee) => (
                      <SelectItem key={employee.empno} value={employee.empno}>
                        {employee.firstname} {employee.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                          
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium leading-none">
                  Department
                </label>
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map((department: Department) => (
                      <SelectItem key={department.deptcode} value={department.deptcode}>
                        {department.deptname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(employeeFilter || departmentFilter) && (
              <div className="flex items-center justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="mr-2"
                >
                  <FilterX className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {(employeeFilter || departmentFilter) && (
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-muted text-muted-foreground rounded-md px-2 py-1">
              {employeeFilter && employees.length > 0 && (
                <span className="inline-flex items-center">
                  Employee: {
                    (() => {
                      const emp = employees.find(e => e.empno === employeeFilter);
                      return emp ? `${emp.firstname} ${emp.lastname}` : '';
                    })()
                  }
                </span>
              )}
              {departmentFilter && departments.length > 0 && (
                <span className="inline-flex items-center">
                  {employeeFilter && ' • '}
                  Department: {
                    (() => {
                      const dept = departments.find(d => d.deptcode === departmentFilter);
                      return dept ? dept.deptname : '';
                    })()
                  }
                </span>
              )}
            </div>
          </div>
        )}

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
