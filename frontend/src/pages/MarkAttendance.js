import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import WebcamCapture from '@/components/WebcamCapture';
import { Camera, UserCheck, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const MarkAttendance = () => {
  const [showWebcam, setShowWebcam] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleCapture = async (imageData) => {
    setShowWebcam(false);
    setProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('face_image', imageData);

      const response = await axios.post(`${API}/attendance/mark`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);

      if (response.data.already_marked) {
        toast.info(response.data.message);
      } else {
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Attendance error:', error);
      const message = error.response?.data?.detail || 'Failed to recognize face';
      toast.error(message);
      setResult({ error: message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2" data-testid="mark-attendance-title">
          MARK ATTENDANCE
        </h1>
        <p className="text-sm text-muted-foreground">Use face recognition to mark student attendance</p>
      </div>

      <div className="bg-white border border-zinc-200 p-8">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-block border-2 border-black p-8 bg-zinc-50">
              <Camera size={64} className="mx-auto" />
            </div>
          </div>

          {processing && (
            <div className="mb-8 bg-white border-2 border-black p-6" data-testid="processing-message">
              <p className="text-sm uppercase tracking-wider font-bold">Processing face recognition...</p>
            </div>
          )}

          {result && !result.error && (
            <div className="mb-8 bg-white border-2 border-black p-6" data-testid="success-result">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-tight">RECOGNITION RESULT</h3>
                <button
                  onClick={() => setResult(null)}
                  data-testid="close-result-btn"
                  className="hover:bg-zinc-100 p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Name:</span>
                  <span className="font-mono font-bold">{result.student?.name}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Roll Number:</span>
                  <span className="font-mono font-bold">{result.student?.roll_number}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Confidence:</span>
                  <span className="font-mono font-bold">{(result.student?.confidence * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Status:</span>
                  <span className="font-mono font-bold">
                    {result.already_marked ? 'ALREADY MARKED' : 'MARKED PRESENT'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {result && result.error && (
            <div className="mb-8 bg-white border-2 border-black p-6" data-testid="error-result">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-tight">ERROR</h3>
                <button
                  onClick={() => setResult(null)}
                  data-testid="close-error-btn"
                  className="hover:bg-zinc-100 p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm">{result.error}</p>
            </div>
          )}

          <button
            onClick={() => setShowWebcam(true)}
            disabled={processing}
            data-testid="start-recognition-btn"
            className="border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-8 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-3"
          >
            <UserCheck size={20} />
            Start Face Recognition
          </button>
        </div>
      </div>

      {showWebcam && (
        <WebcamCapture
          onCapture={handleCapture}
          onClose={() => setShowWebcam(false)}
          title="Scan Face for Attendance"
        />
      )}
    </div>
  );
};

export default MarkAttendance;