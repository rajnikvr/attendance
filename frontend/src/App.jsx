import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import Dashboard from '@/pages/Dashboard';
import RegisterStudent from '@/pages/RegisterStudent';
import MarkAttendance from '@/pages/MarkAttendance';
import ViewStudents from '@/pages/ViewStudents';
import AttendanceRecords from '@/pages/AttendanceRecords';
import Layout from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="register" element={<RegisterStudent />} />
            <Route path="attendance" element={<MarkAttendance />} />
            <Route path="students" element={<ViewStudents />} />
            <Route path="records" element={<AttendanceRecords />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;