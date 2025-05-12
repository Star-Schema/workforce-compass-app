
import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JobManagement from '@/components/jobs/JobManagement';

const Jobs = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage job positions</p>
        </div>

        <div className="mt-6">
          <JobManagement />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
