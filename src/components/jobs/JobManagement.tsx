
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Briefcase, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Job {
  jobcode: string;
  jobdesc: string | null;
}

const formSchema = z.object({
  jobcode: z.string().min(1, 'Job code is required'),
  jobdesc: z.string().min(1, 'Job description is required'),
});

type FormValues = z.infer<typeof formSchema>;

const JobManagement = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobcode: '',
      jobdesc: '',
    },
  });

  // Reset form when dialog opens/closes or when editing a different job
  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({ jobcode: '', jobdesc: '' });
    } else if (isEditDialogOpen && currentJob) {
      form.reset({ 
        jobcode: currentJob.jobcode, 
        jobdesc: currentJob.jobdesc || '' 
      });
    }
  }, [isAddDialogOpen, isEditDialogOpen, currentJob, form]);

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job')
        .select('*')
        .order('jobcode');
      
      if (error) {
        toast.error("Failed to fetch jobs");
        throw error;
      }
      
      return data as Job[];
    },
  });

  // Add job mutation
  const addJobMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('job')
        .insert([{
          jobcode: values.jobcode,
          jobdesc: values.jobdesc,
        }]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job added successfully');
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to add job:', error);
      toast.error('Failed to add job. Please try again.');
    },
  });

  // Edit job mutation
  const editJobMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from('job')
        .update({
          jobdesc: values.jobdesc,
        })
        .eq('jobcode', values.jobcode);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to update job:', error);
      toast.error('Failed to update job. Please try again.');
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobcode: string) => {
      const { data, error } = await supabase
        .from('job')
        .delete()
        .eq('jobcode', jobcode);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job. Please try again.');
    },
  });

  const handleAddSubmit = (values: FormValues) => {
    addJobMutation.mutate(values);
  };

  const handleEditSubmit = (values: FormValues) => {
    editJobMutation.mutate(values);
  };

  const handleDeleteConfirm = () => {
    if (currentJob) {
      deleteJobMutation.mutate(currentJob.jobcode);
    }
  };

  const openEditDialog = (job: Job) => {
    setCurrentJob(job);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (job: Job) => {
    setCurrentJob(job);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Manage Jobs</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus size={18} className="mr-1" /> Add Job
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No jobs found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.jobcode}>
                  <TableCell className="font-medium">{job.jobcode}</TableCell>
                  <TableCell>{job.jobdesc}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(job)}>
                        <Edit size={16} />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(job)}>
                        <Trash2 size={16} />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Job Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Job</DialogTitle>
            <DialogDescription>
              Enter job details below to add a new job position.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="jobcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MGR, CLERK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="jobdesc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Manager, Clerk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addJobMutation.isPending}>
                  {addJobMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Update job details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="jobcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Code</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="jobdesc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
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
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editJobMutation.isPending}>
                  {editJobMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the job position "{currentJob?.jobdesc}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobManagement;
