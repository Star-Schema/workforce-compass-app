
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  supabase, 
  isAdmin, 
  handleSupabaseError, 
  getAllUsers, 
  createUserByAdmin,
  makeCurrentUserAdmin,
  makeHardcodedEmailAdmin
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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
  DialogClose
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
import { UserPlus, Pencil, Trash2, Lock, Shield, UserIcon, Star, Mail } from 'lucide-react';
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
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  const [adminPromoted, setAdminPromoted] = useState(false);
  const [specificEmailAdded, setSpecificEmailAdded] = useState(false);
  
  const queryClient = useQueryClient();

  // Make current user admin mutation
  const makeAdminMutation = useMutation({
    mutationFn: makeCurrentUserAdmin,
    onSuccess: () => {
      setAdminPromoted(true);
      toast({
        title: "Success!",
        description: "Your account is now an admin."
      });
      // Refetch admin status and users list
      refetchAdminStatus();
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Error making user admin",
        description: handleSupabaseError(error),
        variant: "destructive"
      });
    }
  });
  
  // Make specific email admin mutation
  const makeSpecificEmailAdminMutation = useMutation({
    mutationFn: makeHardcodedEmailAdmin,
    onSuccess: (success) => {
      if (success) {
        setSpecificEmailAdded(true);
        toast({
          title: "Success!",
          description: "ramoel.bello5@gmail.com is now an admin."
        });
      } else {
        toast({
          title: "Not found",
          description: "Could not find ramoel.bello5@gmail.com in the users list.",
          variant: "destructive"
        });
      }
      // Refetch users list
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Error setting specific email as admin",
        description: handleSupabaseError(error),
        variant: "destructive"
      });
    }
  });

  // Check if current user is an admin
  const { data: isAdminUser = false, isLoading: isCheckingAdmin, refetch: refetchAdminStatus } = useQuery({
    queryKey: ['admin-status'],
    queryFn: isAdmin
  });
  
  // Fetch users - always try to fetch regardless of admin status
  const { data: users = [], isLoading, error, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers,
    retry: 3,
    refetchOnWindowFocus: false
  });

  // Listen for authentication events to update user list when new users sign up
  useEffect(() => {
    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      // Fix: Using the correct event types for Supabase Auth
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // When a user signs in or is updated, refetch the users list
        refetchUsers();
      }
    });
    
    return () => {
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  // Automatically make user admin if they're not already
  useEffect(() => {
    if (currentUser && !isAdminUser && !adminPromoted) {
      console.log("Automatically making user admin");
      makeAdminMutation.mutate();
    }
  }, [currentUser, isAdminUser, adminPromoted]);

  // Add user mutation (no password needed as admin)
  const addUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string, role: UserRole }) => {
      return await createUserByAdmin(email, role);
    },
    onSuccess: () => {
      toast({
        title: "User added successfully",
        description: `User ${newUserEmail} has been added.`
      });
      setIsAddUserDialogOpen(false);
      setNewUserEmail('');
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

  // Show the user management screen regardless of admin status
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>

        {!isAdminUser && !isCheckingAdmin && (
          <div className="bg-muted p-6 rounded-lg mb-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Make yourself an admin</h2>
              <p className="text-center text-muted-foreground max-w-md">
                You need admin privileges to manage users. Click the button below to make your account an admin.
              </p>
              <Button 
                onClick={() => makeAdminMutation.mutate()} 
                disabled={makeAdminMutation.isPending}
              >
                <Star className="mr-2 h-4 w-4" />
                {makeAdminMutation.isPending ? "Making you admin..." : "Make me an admin"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Special button for making ramoel.bello5@gmail.com admin */}
        <div className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Mail className="h-12 w-12 text-blue-500" />
            <h2 className="text-xl font-semibold">Make ramoel.bello5@gmail.com an admin</h2>
            <p className="text-center text-muted-foreground max-w-md">
              Click the button below to make ramoel.bello5@gmail.com an admin user.
            </p>
            <Button 
              onClick={() => makeSpecificEmailAdminMutation.mutate()} 
              disabled={makeSpecificEmailAdminMutation.isPending || specificEmailAdded}
              variant="outline"
              className="bg-blue-100 hover:bg-blue-200 border-blue-300"
            >
              <Shield className="mr-2 h-4 w-4" />
              {specificEmailAdded ? "Email set as admin" : 
               makeSpecificEmailAdminMutation.isPending ? "Setting as admin..." : 
               "Make ramoel.bello5@gmail.com admin"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 p-4 rounded-md border border-destructive">
            <h2 className="text-destructive font-medium">Error loading users</h2>
            <p>{error instanceof Error ? error.message : "Unknown error occurred"}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => refetchUsers()}
            >
              Try Again
            </Button>
          </div>
        )}

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
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
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
                    <TableCell className={user.email === 'ramoel.bello5@gmail.com' ? 'font-bold text-blue-600' : ''}>
                      {user.email}
                    </TableCell>
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
