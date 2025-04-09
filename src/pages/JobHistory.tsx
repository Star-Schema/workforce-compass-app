"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

interface Department {
  deptcode: string
  deptname: string
}

interface Employee {
  empno: string
  firstname: string
  lastname: string
}

export function FilterPopover() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: departmentsData, error: deptError } = await supabase
        .from("departments")
        .select("*")

      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select("*")

      if (deptError) console.error("Department fetch error:", deptError)
      if (empError) console.error("Employee fetch error:", empError)

      if (departmentsData) setDepartments(departmentsData)
      if (employeesData) setEmployees(employeesData)
    }

    fetchData()
  }, [supabase])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Advance Filter</h4>
            <p className="text-sm text-muted-foreground">
              Set filter for employee attendance record.
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Department</label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                {departments && departments.length > 0 ? (
                  departments.map((department: Department) => (
                    <SelectItem key={department.deptcode} value={department.deptcode}>
                      {department.deptname}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="">No departments</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Employee</label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                {employees && employees.length > 0 ? (
                  employees.map((employee: Employee) => (
                    <SelectItem key={employee.empno} value={employee.empno}>
                      {employee.firstname} {employee.lastname}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="">No employees</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
