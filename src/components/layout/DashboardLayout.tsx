
import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building, 
  LayoutDashboard, 
  Users, 
  History, 
  LogOut,
  Briefcase,
  UserCog
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavLink = ({ to, icon: Icon, label }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 text-sm rounded-md ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      }`}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </Link>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-background border-r p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">HR System</h2>
        </div>
        <nav className="space-y-1">
          <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavLink to="/employees" icon={Users} label="Employees" />
          <NavLink to="/departments" icon={Building} label="Departments" />
          <NavLink to="/jobs" icon={Briefcase} label="Jobs" />
          <NavLink to="/job-history" icon={History} label="Job History" />
          <NavLink to="/user-management" icon={UserCog} label="Manage Users" />
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 mt-8 text-sm text-red-500 rounded-md hover:bg-muted"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
