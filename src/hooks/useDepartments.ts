import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Department, DepartmentWithEmployeeCount } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export type DepartmentFormValues = {
  deptname: string;       // required
  location?: string;      // optional
  deptcode?: string;      // optional, used for editing
};

export const useDepartments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    data: departments = [],
    isLoading,
  } = useQuery<DepartmentWithEmployeeCount[]>({
    queryKey: ['departmentsWithCount'],
    queryFn: async (): Promise<DepartmentWithEmployeeCount[]> => {
      try {
        const { data, error } = await supabase
          .from('department')
          .select('*, employee_count:jobhistory(count)')
          .returns<DepartmentWithEmployeeCount[]>();
        
        if (error) throw error;
        return data || [];
      } catch (rpcError) {
        console.log('RPC not available, using manual join');
        
        const { data: deptData, error: deptError } = await supabase
          .from('department')
          .select('*')
          .order('deptname', { ascending: true });
        
        if (deptError) throw deptError;
        
        const departmentsWithCount = await Promise.all(
          (deptData || []).map(async (dept: Department) => {
            const { count, error: countError } = await supabase
              .from('jobhistory')
              .select('*', { count: 'exact', head: true })
              .eq('deptcode', dept.deptcode);
            
            if (countError) throw countError;
            
            return {
              ...dept,
              employee_count: count || 0
            };
          })
        );
        
        return departmentsWithCount || [];
      }
    },
  });

  const addDepartmentMutation = useMutation({
    mutationFn: async (newDepartment: DepartmentFormValues) => {
      let deptcode = '';
      
      const randomNum = Math.floor(100 + Math.random() * 900);
      deptcode = randomNum.toString();
      
      console.log(`Generated department code: ${deptcode} (length: ${deptcode.length})`);
      
      if (deptcode.length !== 3) {
        throw new Error("Failed to generate a valid 3-character department code");
      }
      
      const { data, error } = await supabase
        .from('department')
        .insert([{ 
          deptcode: deptcode,
          deptname: newDepartment.deptname
        }])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentsWithCount'] });
      queryClient.invalidateQueries({ queryKey: ['departmentCount'] });
      toast({
        title: 'Success',
        description: 'Department has been added',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add department: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ deptcode, deptname }: Department) => {
      const { data, error } = await supabase
        .from('department')
        .update({ deptname })
        .eq('deptcode', deptcode)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentsWithCount'] });
      toast({
        title: 'Success',
        description: 'Department has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update department: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (deptcode: string) => {
      const { error } = await supabase
        .from('department')
        .delete()
        .eq('deptcode', deptcode);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentsWithCount'] });
      queryClient.invalidateQueries({ queryKey: ['departmentCount'] });
      toast({
        title: 'Success',
        description: 'Department has been deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete department: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    departments,
    isLoading,
    addDepartmentMutation,
    updateDepartmentMutation,
    deleteDepartmentMutation
  };
};
