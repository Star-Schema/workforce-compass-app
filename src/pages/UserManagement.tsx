
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isAdmin, handleSupabaseError } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Pencil, Trash2, Lock, Shield, UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  
  const queryClient = useQueryClient();

  // Fetch users from auth.users via our security definer function
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // First check if we are an admin using the security definer function
        const { data: isAdminUser, error: adminCheckError } = await supabase.rpc('is_admin');
        
        if (adminCheckError) {
          console.error("Error checking admin status:", adminCheckError);
          toast({
            title: "Error checking permissions",
            description: handleSupabaseError(adminCheckError),
            variant: "destructive"
          });
          return [];
        }

        if (!isAdminUser) {
          toast({
            title: "Permission denied",
            description: "You don't have permission to view user management",
            variant: "destructive"
          });
          return [];
        }

        // Get all auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching auth users:", authError);
          toast({
            title: "Error fetching users",
            description: handleSupabaseError(authError),
            variant: "destructive"
          });
          return [];
        }
        
        // Get all user roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*');
          
        if (roleError) {
          console.error("Error fetching user roles:", roleError);
          toast({
            title: "Error fetching user roles",
            description: handleSupabaseError(roleError),
            variant: "destructive"
          });
          // Still continue with auth users but without roles
        }
        
        // Map and merge the data
        const combinedUsers: UserData[] = authUsers.users.map(user => {
          // Find role for this user if it exists
          const userRole = roleData?.find(role => role.user_id === user.id);
          
          return {
            id: user.id,
            email: user.email || user.id,
            role: (userRole?.role as UserRole) || 'user', // Default to user if no role found
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at
          };
        });
        
        return combinedUsers;
      } catch (error: any) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error fetching users",
          description: handleSupabaseError(error),
          variant: "destructive"
        });
        return [];
      }
    },
    refetchOnWindowFocus: false
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async ({ email, password, role }: { email: string, password: string, role: UserRole }) => {
      // Create user with Supabase auth
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (userError) throw userError;

      if (!userData.user) throw new Error("Failed to create user");

      // Set user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userData.user.id, role });

      if (roleError) throw roleError;

      return userData.user;
    },
    onSuccess: () => {
      toast({
        title: "User added successfully",
        description: `User ${newUserEmail} has been added.`
      });
      setIsAddUserDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding user",
        description: handleSupabaseError(error),
        variant: "destructive"
      });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role,
          updated_at: new Date().toISOString()
        });
          
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: `User ${selectedUser?.email} role changed to ${editUserRole}.`
      });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: handleSupabaseError(error),
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // We don't have direct access to delete users through the client API,
      // so we'll disable the account by setting their role to 'blocked'
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: 'blocked',
          updated_at: new Date().toISOString()
        });
          
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "User blocked successfully",
        description: `User ${selectedUser?.email} has been blocked.`
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error blocking user",
        description: handleSupabaseError(error),
        variant: "destructive"
      });
    }
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole
    });
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserRoleMutation.mutate({
        userId: selectedUser.id,
        role: editUserRole
      });
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleEditClick = (user: UserData) => {
    setSelectedUser(user);
    setEditUserRole(user.role);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteClick = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      case 'blocked': return <Lock className="h-4 w-4 text-destructive" />;
      default: return <UserIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <div className="bg-destructive/10 p-4 rounded-md border border-destructive">
            <h2 className="text-destructive font-medium">Error loading users</h2>
            <p>{error instanceof Error ? error.message : "Unknown error occurred"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {users.length} total users
            </p>
          </div>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUserRole}
                    onValueChange={(value) => setNewUserRole(value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addUserMutation.isPending}
                  >
                    {addUserMutation.isPending ? "Adding..." : "Add User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email/ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {/* Don't allow current user to edit themselves */}
                      {currentUser?.id !== user.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Email/ID</Label>
                <Input
                  type="text"
                  value={selectedUser?.email || ''}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editUserRole}
                  onValueChange={(value) => setEditUserRole(value as UserRole)}
                >
                  <SelectTrigger id="editRole">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateUserRoleMutation.isPending}
                >
                  {updateUserRoleMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will block the user account for {selectedUser?.email}.
                The user will no longer be able to access the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUserMutation.isPending ? "Blocking..." : "Block User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
