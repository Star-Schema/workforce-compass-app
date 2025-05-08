
// Define types that match your actual Supabase database schema

export interface Employee {
  empno: string;
  firstname: string | null;
  lastname: string | null;
  gender: string | null;
  birthdate: string | null;
  hiredate: string | null;
  sepdate: string | null;
  jobhistory?: JobHistory[]; // Added this for joins
}

export interface Department {
  deptcode: string;
  deptname: string | null;
}

export interface Job {
  jobcode: string;
  jobdesc: string | null;
}

export interface JobHistory {
  empno: string;
  jobcode: string;
  deptcode: string | null;
  effdate: string;
  salary: number | null;
}

// Adding DepartmentWithEmployeeCount interface that was missing
export interface DepartmentWithEmployeeCount extends Department {
  employee_count: number;
}

// User role type definition
export type UserRole = 'admin' | 'user' | 'blocked';

// User roles table interface
export interface UserRoles {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// These are helpers for components that expect the newer schema format
export interface EmployeeDisplay {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  hire_date: string | null;
  department_id?: string;
  job_title?: string;
}

export interface DepartmentDisplay {
  id: string;
  name: string | null;
  location?: string;
  manager_id?: string | null;
  employee_count?: number;
}

// Helper functions to convert between database schema and display formats
export const mapEmployeeToDisplay = (emp: Employee): EmployeeDisplay => {
  return {
    id: emp.empno,
    first_name: emp.firstname,
    last_name: emp.lastname,
    hire_date: emp.hiredate,
  };
};

export const mapDepartmentToDisplay = (dept: Department): DepartmentDisplay => {
  return {
    id: dept.deptcode,
    name: dept.deptname,
    // Note: location is not in original schema, so it's not mapped
  };
};
