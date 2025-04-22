
import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DepartmentWithEmployeeCount } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DepartmentTable from '@/components/departments/DepartmentTable';
import AddDepartmentDialog from '@/components/departments/AddDepartmentDialog';
import EditDepartmentDialog from '@/components/departments/EditDepartmentDialog';
import DeleteDepartmentDialog from '@/components/departments/DeleteDepartmentDialog';
import { useDepartments, DepartmentFormValues } from '@/hooks/useDepartments';

// Define the schema to match the DepartmentFormValues type
const departmentFormSchema = z.object({
  deptname: z.string().min(1, { message: 'Department name is required' }),
  location: z.string().optional(),
  deptcode: z.string().optional(), // Add deptcode to the schema
});

const Departments = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithEmployeeCount | null>(null);
  
  const { 
    departments, 
    isLoading, 
    addDepartmentMutation, 
    updateDepartmentMutation, 
    deleteDepartmentMutation 
  } = useDepartments();

  // Update defaultValues to include deptcode
  const addForm = useForm<DepartmentFormValues & { deptcode?: string }>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      deptname: '',
      location: '',
      deptcode: '',
    },
  });

  const editForm = useForm<DepartmentFormValues & { deptcode: string }>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      deptname: '',
      location: '',
      deptcode: '',
    },
  });

  const handleAddDepartment = (data: DepartmentFormValues) => {
    addDepartmentMutation.mutate(data, {
      onSuccess: () => setIsAddDialogOpen(false)
    });
  };

  const handleUpdateDepartment = (data: DepartmentFormValues) => {
    if (selectedDepartment) {
      updateDepartmentMutation.mutate({
        deptcode: selectedDepartment.deptcode,
        deptname: data.deptname,
      }, {
        onSuccess: () => setIsEditDialogOpen(false)
      });
    }
  };

  const handleDeleteDepartment = () => {
    if (selectedDepartment) {
      deleteDepartmentMutation.mutate(selectedDepartment.deptcode, {
        onSuccess: () => setIsDeleteDialogOpen(false)
      });
    }
  };

  const openEditDialog = (department: DepartmentWithEmployeeCount) => {
    setSelectedDepartment(department);
    editForm.reset({
      deptname: department.deptname || '',
      location: '',
      deptcode: department.deptcode, // Pass deptcode to the form
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (department: DepartmentWithEmployeeCount) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage your organization's departments</p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-hrm-600 hover:bg-hrm-700 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>

        <DepartmentTable 
          departments={departments} 
          isLoading={isLoading} 
          onEditDepartment={openEditDialog}
          onDeleteDepartment={openDeleteDialog}
        />
      </div>

      <AddDepartmentDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        form={addForm}
        onSubmit={handleAddDepartment}
        isPending={addDepartmentMutation.isPending}
      />

      <EditDepartmentDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        form={editForm}
        onSubmit={handleUpdateDepartment}
        isPending={updateDepartmentMutation.isPending}
      />

      <DeleteDepartmentDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        department={selectedDepartment}
        onDelete={handleDeleteDepartment}
        isPending={deleteDepartmentMutation.isPending}
      />
    </DashboardLayout>
  );
};

export default Departments;
