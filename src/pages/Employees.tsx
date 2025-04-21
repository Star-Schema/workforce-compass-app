import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  User,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  X,
  Check
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Employee, Department, Job, JobHistory } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface EmployeeWithJobHistory extends Employee {
  jobhistory: JobHistory[];
}

const employeeFormSchema = z.object({
  firstname: z.string().min(1, { message: 'First name is required' }),
  lastname: z.string().min(1, { message: 'Last name is required' }),
  gender: z.string().optional(),
  birthdate: z.string().optional(),
  hiredate: z.string().min(1, { message: 'Hire date is required' }),
  sepdate: z.string().optional(),
  deptcode: z.string().optional(),
  jobcode: z.string().optional(),
  salary: z.coerce.number().min(0, { message: 'Salary must be a positive number' }).optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithJobHistory | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    console.log("Employees component mounted");
    
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('employee').select('*').limit(1);
        console.log("Supabase employee check:", { data, error });
        if (error) {
          toast({
            title: "Error",
            description: "Supabase connection issue: " + error.message,
            variant: "destructive"
          });
        }
      } catch (e) {
        console.error("Failed to check Supabase connection:", e);
      }
    };
    
    checkSupabase();
  }, [toast]);

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', searchTerm],
    queryFn: async () => {
      try {
        console.log("Fetching employees with search term:", searchTerm);
        
        let employeeQuery = supabase
          .from('employee')
          .select('*')
          .order('lastname', { ascending: true });
        
        if (searchTerm) {
          employeeQuery = employeeQuery.or(`firstname.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%`);
        }
        
        const { data: employeeData, error: employeeError } = await employeeQuery;
        
        if (employeeError) {
          console.error("Error fetching employees:", employeeError);
          throw employeeError;
        }
        
        console.log("Employee data:", employeeData);
        
        if (employeeData && employeeData.length > 0) {
          const employeeIds = employeeData.map(emp => emp.empno);
          
          const { data: jobHistoryData, error: jobHistoryError } = await supabase
            .from('jobhistory')
            .select('*')
            .in('empno', employeeIds);
          
          if (jobHistoryError) {
            console.error("Error fetching job history:", jobHistoryError);
            throw jobHistoryError;
          }
          
          console.log("Job history data:", jobHistoryData);
          
          const employeesWithJobHistory = employeeData.map(employee => {
            const jobHistory = jobHistoryData?.filter(jh => jh.empno === employee.empno) || [];
            return {
              ...employee,
              jobhistory: jobHistory
            } as EmployeeWithJobHistory;
          });
          
          return employeesWithJobHistory;
        }
        
        return employeeData as EmployeeWithJobHistory[] || [];
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast({
          title: "Error",
          description: "Failed to load employee data",
          variant: "destructive"
        });
        throw error;
      }
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .order('deptname', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job')
        .select('*')
        .order('jobdesc', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (newEmployee: EmployeeFormValues) => {
      // Generate a 5-character employee code
      const empno = 'E' + Math.floor(1000 + Math.random() * 9000).toString();
      
      const { data: empData, error: empError } = await supabase
        .from('employee')
        .insert([{
          empno: empno,
          firstname: newEmployee.firstname,
          lastname: newEmployee.lastname,
          gender: newEmployee.gender,
          birthdate: newEmployee.birthdate,
          hiredate: newEmployee.hiredate,
          sepdate: newEmployee.sepdate
        }])
        .select();
      
      if (empError) throw empError;
      
      if (empData && empData[0] && newEmployee.deptcode && newEmployee.jobcode) {
        const { error: jobHistoryError } = await supabase
          .from('jobhistory')
          .insert([{
            empno: empData[0].empno,
            jobcode: newEmployee.jobcode,
            deptcode: newEmployee.deptcode,
            effdate: new Date().toISOString().split('T')[0],
            salary: newEmployee.salary || 0
          }]);
          
        if (jobHistoryError) throw jobHistoryError;
      }
      
      return empData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeCount'] });
      toast({
        title: 'Success',
        description: 'Employee has been added',
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add employee: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ empno, ...updateData }: { empno: string } & EmployeeFormValues) => {
      const { data: empData, error: empError } = await supabase
        .from('employee')
        .update({
          firstname: updateData.firstname,
          lastname: updateData.lastname,
          gender: updateData.gender,
          birthdate: updateData.birthdate,
          hiredate: updateData.hiredate,
          sepdate: updateData.sepdate
        })
        .eq('empno', empno)
        .select();
      
      if (empError) throw empError;
      
      if (updateData.deptcode && updateData.jobcode) {
        const { error: jobHistoryError } = await supabase
          .from('jobhistory')
          .upsert([{
            empno: empno,
            jobcode: updateData.jobcode,
            deptcode: updateData.deptcode,
            effdate: new Date().toISOString().split('T')[0],
            salary: updateData.salary || 0
          }]);
          
        if (jobHistoryError) throw jobHistoryError;
      }
      
      return empData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Success',
        description: 'Employee has been updated',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update employee: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (empno: string) => {
      const { error: jobHistoryError } = await supabase
        .from('jobhistory')
        .delete()
        .eq('empno', empno);
      
      if (jobHistoryError) throw jobHistoryError;
      
      const { error: empError } = await supabase
        .from('employee')
        .delete()
        .eq('empno', empno);
      
      if (empError) throw empError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeCount'] });
      toast({
        title: 'Success',
        description: 'Employee has been deleted',
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete employee: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const addForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      gender: '',
      birthdate: '',
      hiredate: new Date().toISOString().split('T')[0],
      sepdate: '',
      deptcode: '',
      jobcode: '',
      salary: 0,
    },
  });

  const editForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      gender: '',
      birthdate: '',
      hiredate: '',
      sepdate: '',
      deptcode: '',
      jobcode: '',
      salary: 0,
    },
  });

  const handleAddEmployee = (data: EmployeeFormValues) => {
    addEmployeeMutation.mutate(data);
  };

  const handleUpdateEmployee = (data: EmployeeFormValues) => {
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({
        ...data,
        empno: selectedEmployee.empno,
      });
    }
  };

  const handleDeleteEmployee = () => {
    if (selectedEmployee) {
      deleteEmployeeMutation.mutate(selectedEmployee.empno);
    }
  };

  const openEditDialog = (employee: EmployeeWithJobHistory) => {
    setSelectedEmployee(employee);
    
    const jobHistory = employee.jobhistory ? employee.jobhistory[0] : null;
    
    editForm.reset({
      firstname: employee.firstname || '',
      lastname: employee.lastname || '',
      gender: employee.gender || '',
      birthdate: employee.birthdate || '',
      hiredate: employee.hiredate || '',
      sepdate: employee.sepdate || '',
      deptcode: jobHistory?.deptcode || '',
      jobcode: jobHistory?.jobcode || '',
      salary: jobHistory?.salary || 0,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: EmployeeWithJobHistory) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const filteredEmployees = employees;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">Manage your employee data</p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-hrm-600 hover:bg-hrm-700 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <div className="flex items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">No employees found</TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee: EmployeeWithJobHistory) => {
                  const jobHistory = employee.jobhistory ? employee.jobhistory[0] : null;
                  const department = departments.find(d => d.deptcode === jobHistory?.deptcode);
                  const job = jobs.find(j => j.jobcode === jobHistory?.jobcode);
                  
                  return (
                    <TableRow key={employee.empno}>
                      <TableCell>
                        <div className="font-medium">
                          {employee.firstname} {employee.lastname}
                        </div>
                      </TableCell>
                      <TableCell>{job?.jobdesc || jobHistory?.jobcode || 'N/A'}</TableCell>
                      <TableCell>{department?.deptname || jobHistory?.deptcode || 'N/A'}</TableCell>
                      <TableCell>
                        {employee.hiredate && format(new Date(employee.hiredate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>${jobHistory?.salary?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(employee)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(employee)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* "Add Employee" dialog with styled form */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <form
            onSubmit={addForm.handleSubmit(handleAddEmployee)}
            className="border border-gray-400 rounded w-full bg-white px-8 py-6"
          >
            <div className="font-bold text-lg mb-1">Add New employee</div>
            <div className="ml-0.5 mb-2">
              <div className="flex flex-col text-sm">
                <span className="font-medium">Employee Number</span>
                <span className="text-gray-500">&lt;auto increment&gt; not editable</span>
              </div>
            </div>
            {/* First Name + Last Name */}
            <div className="flex flex-row gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">First name</label>
                <Input
                  {...addForm.register("firstname")}
                  className="w-full"
                  placeholder=""
                />
                <span className="text-destructive text-xs">{addForm.formState.errors.firstname?.message}</span>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  {...addForm.register("lastname")}
                  className="w-full"
                  placeholder=""
                />
                <span className="text-destructive text-xs">{addForm.formState.errors.lastname?.message}</span>
              </div>
            </div>
            {/* Gender + Birthdate */}
            <div className="flex flex-row gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  {...addForm.register("gender")}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Birthdate</label>
                <Input
                  {...addForm.register("birthdate")}
                  className="w-full"
                  type="date"
                />
              </div>
            </div>
            {/* Hire Date + Separation Date */}
            <div className="flex flex-row gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Hire Date</label>
                <Input
                  {...addForm.register("hiredate")}
                  className="w-full"
                  type="date"
                />
                <span className="text-destructive text-xs">{addForm.formState.errors.hiredate?.message}</span>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Seperation Date</label>
                <Input
                  {...addForm.register("sepdate")}
                  className="w-full"
                  type="date"
                />
              </div>
            </div>
            {/* Footer Buttons */}
            <div className="flex flex-row justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/4"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-1/4 text-gray-800 underline bg-transparent hover:bg-gray-100"
                onClick={() => {
                  // Placeholder action for Manage Job History
                  alert("Manage Job History not yet implemented.");
                }}
              >
                Manage Job History
              </Button>
              <Button
                type="submit"
                className="w-1/4 bg-hrm-600 hover:bg-hrm-700 text-white"
                disabled={addEmployeeMutation.isPending}
              >
                {addEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateEmployee)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birth Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="hiredate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="deptcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.deptcode} value={department.deptcode}>
                              {department.deptname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="jobcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.jobcode} value={job.jobcode}>
                              {job.jobdesc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-hrm-600 hover:bg-hrm-700 text-white"
                  disabled={updateEmployeeMutation.isPending}
                >
                  {updateEmployeeMutation.isPending ? 'Updating...' : 'Update Employee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedEmployee?.firstname} {selectedEmployee?.lastname}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteEmployeeMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? 
                'Deleting...' : 
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Employee
                </>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Employees;
