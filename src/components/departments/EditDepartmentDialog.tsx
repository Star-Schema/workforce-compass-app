
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { UseFormReturn } from 'react-hook-form';

// Add deptcode field for viewing (not editable)
interface EditDepartmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<{ deptname: string; location?: string }>;
  onSubmit: (data: { deptname: string; location?: string }) => void;
  isPending: boolean;
}

const EditDepartmentDialog: React.FC<EditDepartmentDialogProps> = ({
  isOpen,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}) => {
  // deptcode will be on form._defaultValues, but if not, fallback ''
  const deptcode = form.getValues('deptcode') || form._defaultValues.deptcode || '';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update the department details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <FormLabel>DeptCode</FormLabel>
              <Input value={deptcode} disabled className="mb-2" />
            </div>
            <FormField
              control={form.control}
              name="deptname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-hrm-600 hover:bg-hrm-700 text-white"
                disabled={isPending}
              >
                {isPending ? 'Updating...' : 'Update Department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDepartmentDialog;
