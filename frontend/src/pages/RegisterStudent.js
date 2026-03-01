import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import WebcamCapture from '@/components/WebcamCapture';
import { Camera, User, Hash, Building } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const RegisterStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    department: '',
  });
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCapture = (imageData) => {
    setCapturedImage(imageData);
    setShowWebcam(false);
    toast.success('Face captured successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.roll_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!capturedImage) {
      toast.error('Please capture a face image');
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('roll_number', formData.roll_number);
      formDataToSend.append('department', formData.department || 'Not Specified');
      formDataToSend.append('face_image', capturedImage);

      const response = await axios.post(`${API}/students/register`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message);

      // Reset form
      setFormData({ name: '', roll_number: '', department: '' });
      setCapturedImage(null);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2" data-testid="register-title">REGISTER STUDENT</h1>
        <p className="text-sm text-muted-foreground">Add a new student with face recognition</p>
      </div>

      <div className="bg-white border border-zinc-200 p-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium mb-2" htmlFor="name">
                <User size={16} className="inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                data-testid="input-name"
                required
                className="w-full border-2 border-zinc-200 focus:border-black focus:ring-0 h-12 bg-transparent font-mono text-sm placeholder:text-zinc-400 px-4"
                placeholder="Enter student name"
              />
            </div>

            {/* Roll Number Input */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium mb-2" htmlFor="roll_number">
                <Hash size={16} className="inline mr-2" />
                Roll Number *
              </label>
              <input
                type="text"
                id="roll_number"
                name="roll_number"
                value={formData.roll_number}
                onChange={handleInputChange}
                data-testid="input-roll-number"
                required
                className="w-full border-2 border-zinc-200 focus:border-black focus:ring-0 h-12 bg-transparent font-mono text-sm placeholder:text-zinc-400 px-4"
                placeholder="Enter roll number"
              />
            </div>

            {/* Department Input */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium mb-2" htmlFor="department">
                <Building size={16} className="inline mr-2" />
                Department
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                data-testid="input-department"
                className="w-full border-2 border-zinc-200 focus:border-black focus:ring-0 h-12 bg-transparent font-mono text-sm placeholder:text-zinc-400 px-4"
                placeholder="Enter department (optional)"
              />
            </div>

            {/* Face Capture */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium mb-2">
                <Camera size={16} className="inline mr-2" />
                Face Image *
              </label>

              {capturedImage ? (
                <div className="border-2 border-black bg-zinc-50 p-4">
                  <img src={capturedImage} alt="Captured face" className="w-full max-w-md mx-auto" data-testid="captured-image" />
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    data-testid="recapture-btn"
                    className="mt-4 w-full border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors duration-200 font-bold uppercase tracking-wider h-10 px-6"
                  >
                    Recapture
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWebcam(true)}
                  data-testid="open-webcam-btn"
                  className="w-full border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-6 flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Capture Face
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-register-btn"
              className="w-full border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>

      {showWebcam && (
        <WebcamCapture
          onCapture={handleCapture}
          onClose={() => setShowWebcam(false)}
          title="Capture Student Face"
        />
      )}
    </div>
  );
};

export default RegisterStudent;