
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

// Add deptcode as a field (auto-generated, not editable)
interface AddDepartmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<{ deptname: string; location?: string }>;
  onSubmit: (data: { deptname: string; location?: string }) => void;
  isPending: boolean;
}

const AddDepartmentDialog: React.FC<AddDepartmentDialogProps> = ({
  isOpen,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}) => {
  // Example deptcode generation preview (not used for submission, just an example)
  // In practice, the backend assigns the code, we just show a placeholder.
  const generatedCode = 'Auto-generated';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
          <DialogDescription>
            Enter details for the new department.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <FormLabel>DeptCode</FormLabel>
              <Input value={generatedCode} disabled className="mb-2" />
              <span className="text-xs text-muted-foreground block">DeptCode will be auto-generated</span>
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
                {isPending ? 'Adding...' : 'Add Department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDepartmentDialog;
