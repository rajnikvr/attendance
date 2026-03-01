import React, { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

const WebcamCapture = ({ onCapture, onClose, title = "Capture Face" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Failed to access webcam. Please ensure you have granted camera permissions.');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturing(true);
    
    setTimeout(() => {
      stopWebcam();
      onCapture(imageData);
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="webcam-modal">
      <div className="bg-white p-8 max-w-3xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight uppercase">{title}</h2>
          <button
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            data-testid="webcam-close-btn"
            className="hover:bg-zinc-100 p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error ? (
          <div className="bg-white border-2 border-black p-6 mb-6" data-testid="webcam-error">
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="relative border-2 border-black bg-zinc-50 aspect-video flex items-center justify-center overflow-hidden mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              data-testid="webcam-video"
              className="w-full h-full object-cover"
            />
            {capturing && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
            )}
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="flex gap-4">
          <button
            onClick={captureImage}
            disabled={!stream || capturing || error}
            data-testid="webcam-capture-btn"
            className="flex-1 border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            Capture Face
          </button>
          <button
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            data-testid="webcam-cancel-btn"
            className="border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors duration-200 font-bold uppercase tracking-wider h-12 px-6"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;