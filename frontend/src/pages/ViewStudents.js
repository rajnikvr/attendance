import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Trash2, Users } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const ViewStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    setDeleting(studentId);
    try {
      await axios.delete(`${API}/students/${studentId}`);
      toast.success(`${studentName} deleted successfully`);
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2" data-testid="students-title">
          REGISTERED STUDENTS
        </h1>
        <p className="text-sm text-muted-foreground">View and manage all registered students</p>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white border border-zinc-200 p-8">
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white border border-zinc-200 p-8" data-testid="no-students-message">
          <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-bold uppercase tracking-wider mb-2">No Students Registered</p>
          <p className="text-sm text-muted-foreground mb-6">Start by registering your first student</p>
          <a
            href="/register"
            className="inline-block border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-6 leading-[44px]"
          >
            Register Student
          </a>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="students-table">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Name</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Roll Number</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Department</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-bold">Registered On</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={student.id}
                    data-testid={`student-row-${index}`}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="p-4 font-medium">{student.name}</td>
                    <td className="p-4 font-mono text-sm">{student.roll_number}</td>
                    <td className="p-4 text-sm">{student.department || 'Not Specified'}</td>
                    <td className="p-4 text-sm font-mono">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        disabled={deleting === student.id}
                        data-testid={`delete-student-${index}`}
                        className="inline-flex items-center gap-2 border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors duration-200 text-sm font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                        {deleting === student.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 bg-zinc-50">
            <p className="text-sm text-muted-foreground">
              Total Students: <span className="font-bold text-black">{students.length}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewStudents;