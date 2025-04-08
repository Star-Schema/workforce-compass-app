
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  History,
  Search,
  Filter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { JobHistory, Employee, Department } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';

const JobHistoryPage = () => {
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Fetch job history
  const { data: jobHistory = [], isLoading: isLoadingJobHistory, refetch } = useQuery({
    queryKey: ['jobHistory', employeeFilter, departmentFilter],
    queryFn: async () => {
      let query = supabase
        .from('jobhistory')
        .select(`
          *,
          employee (empno, firstname, lastname),
          department (deptcode, deptname)
        `)
        .order('effdate', { ascending: false });
      
      if (employeeFilter) {
        query = query.eq('empno', employeeFilter);
      }
      
      if (departmentFilter) {
        query = query.eq('deptcode', departmentFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['employeesDropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee')
        .select('empno, firstname, lastname')
        .order('lastname', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departmentsDropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department')
        .select('deptcode, deptname')
        .order('deptname', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleClearFilters = () => {
    setEmployeeFilter('');
    setDepartmentFilter('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
          <p className="text-muted-foreground">Track employee job transitions and career progression</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {(employeeFilter || departmentFilter) && (
                    <span className="ml-1 rounded-full bg-primary w-2 h-2"></span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Filter job history by employee or department
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid gap-1">
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
                    <div className="grid gap-1">
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
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleClearFilters}
                      disabled={!employeeFilter && !departmentFilter}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
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
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => refetch()}
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
              ) : jobHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">No job history records found</TableCell>
                </TableRow>
              ) : (
                jobHistory.map((history: any) => (
                  <TableRow key={`${history.empno}-${history.effdate}-${history.jobcode}`}>
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
