import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, FileText } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    today_attendance: 0,
    total_attendance_records: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, testId }) => (
    <div className="bg-white border border-zinc-200 p-6 hover:border-black transition-colors duration-200" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
          <p className="text-4xl font-black tracking-tight">{value}</p>
        </div>
        <Icon size={32} className="text-black" />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2" data-testid="dashboard-title">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground">Face Recognition Attendance System Overview</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Students"
            value={stats.total_students}
            icon={Users}
            testId="stat-total-students"
          />
          <StatCard
            title="Today's Attendance"
            value={stats.today_attendance}
            icon={UserCheck}
            testId="stat-today-attendance"
          />
          <StatCard
            title="Total Records"
            value={stats.total_attendance_records}
            icon={FileText}
            testId="stat-total-records"
          />
        </div>
      )}

      <div className="mt-12 bg-white border border-zinc-200 p-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">QUICK ACTIONS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/register"
            data-testid="quick-action-register"
            className="border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors duration-200 p-6 flex items-center justify-center font-bold uppercase tracking-wider"
          >
            Register New Student
          </a>
          <a
            href="/attendance"
            data-testid="quick-action-mark-attendance"
            className="border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 p-6 flex items-center justify-center font-bold uppercase tracking-wider"
          >
            Mark Attendance
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;