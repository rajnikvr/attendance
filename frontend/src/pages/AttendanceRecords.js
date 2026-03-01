import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Calendar } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const AttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchRecords();
  }, [days]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/attendance?days=${days}`);
      setRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2" data-testid="records-title">
          ATTENDANCE RECORDS
        </h1>
        <p className="text-sm text-muted-foreground">View attendance history and records</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium uppercase tracking-wider">
          <Calendar size={16} className="inline mr-2" />
          Filter by Days:
        </label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          data-testid="filter-days-select"
          className="border-2 border-zinc-200 focus:border-black focus:ring-0 h-10 bg-white font-mono text-sm px-4"
        >
          <option value={1}>Last 24 Hours</option>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white border border-zinc-200 p-8">
          <p className="text-muted-foreground">Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white border border-zinc-200 p-8" data-testid="no-records-message">
          <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-bold uppercase tracking-wider mb-2">No Attendance Records</p>
          <p className="text-sm text-muted-foreground">No attendance marked in the selected time period</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="records-table">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Student Name</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Roll Number</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Date & Time</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Confidence</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={record.id}
                    data-testid={`record-row-${index}`}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="p-4 font-medium">{record.student_name}</td>
                    <td className="p-4 font-mono text-sm">{record.roll_number}</td>
                    <td className="p-4 text-sm font-mono">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-mono">
                      {(record.confidence * 100).toFixed(2)}%
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 bg-zinc-50">
            <p className="text-sm text-muted-foreground">
              Total Records: <span className="font-bold text-black">{records.length}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecords;