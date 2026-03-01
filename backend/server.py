from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import cv2
import numpy as np
# Using direct OpenCV cascade to avoid Tensorflow 2.20 dependency crashes in deepface
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
import base64
from io import BytesIO
from PIL import Image
import tempfile
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

sync_client = MongoClient(mongo_url)
sync_db = sync_client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Face Recognition Attendance System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Storage directory for face images
FACE_STORAGE_DIR = ROOT_DIR / "face_storage"
FACE_STORAGE_DIR.mkdir(exist_ok=True)

# Pydantic Models
class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    roll_number: str
    department: str = "Not Specified"
    face_encoding_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentCreate(BaseModel):
    name: str
    roll_number: str
    department: str = "Not Specified"

class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    roll_number: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence: float
    status: str = "present"

class AttendanceRecordResponse(BaseModel):
    id: str
    student_name: str
    roll_number: str
    timestamp: str
    confidence: float
    status: str

class DashboardStats(BaseModel):
    total_students: int
    today_attendance: int
    total_attendance_records: int

# Helper Functions
def decode_base64_image(base64_string: str):
    """Decode base64 image string to numpy array"""
    try:
        # Remove header if present
        if 'base64,' in base64_string:
            base64_string = base64_string.split('base64,')[1]
        
        img_data = base64.b64decode(base64_string)
        img = Image.open(BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logging.error(f"Error decoding image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

def save_face_image(image_array, student_id: str) -> str:
    """Save face image to disk"""
    student_dir = FACE_STORAGE_DIR / student_id
    student_dir.mkdir(exist_ok=True)
    
    image_path = student_dir / "face.jpg"
    cv2.imwrite(str(image_path), image_array)
    return str(image_path)

def recognize_face(image_array):
    """Recognize face using OpenCV LBPH with histogram fallback"""
    try:
        # Convert to grayscale for Haarcascade
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # Detect face with lenient parameters
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
        logging.info(f"[recognize_face] Detected {len(faces)} faces in input image")
        
        if len(faces) == 0:
            # Try even more lenient detection
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=2, minSize=(20, 20))
            logging.info(f"[recognize_face] Retry detection found {len(faces)} faces")
            if len(faces) == 0:
                logging.warning("[recognize_face] No face detected in input image")
                return None, 0.0
            
        # Get all students from database to compare
        students = list(sync_db.students.find({}, {"_id": 0}))
        logging.info(f"[recognize_face] Found {len(students)} students in DB")
        
        if not students:
            return None, 0.0
        
        # Extract the test face ROI
        (x, y, w, h) = faces[0]
        test_roi = gray[y:y+h, x:x+w]
        test_roi_resized = cv2.resize(test_roi, (100, 100))
        
        best_match = None
        highest_confidence = 0.0
        
        # Method 1: Try LBPH Face Recognizer
        try:
            recognizer = cv2.face.LBPHFaceRecognizer_create()
            
            labels = []
            faces_data = []
            student_map = {}
            
            for idx, student in enumerate(students):
                try:
                    enc_path = student.get('face_encoding_path')
                    if enc_path and os.path.exists(enc_path):
                        st_img = cv2.imread(enc_path, cv2.IMREAD_GRAYSCALE)
                        if st_img is None:
                            logging.warning(f"[recognize_face] Could not read image: {enc_path}")
                            continue
                        st_faces = face_cascade.detectMultiScale(st_img, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
                        if len(st_faces) == 0:
                            st_faces = face_cascade.detectMultiScale(st_img, scaleFactor=1.05, minNeighbors=2, minSize=(20, 20))
                        if len(st_faces) > 0:
                            (sx, sy, sw, sh) = st_faces[0]
                            face_roi = st_img[sy:sy+sh, sx:sx+sw]
                            face_roi = cv2.resize(face_roi, (100, 100))
                            faces_data.append(face_roi)
                            labels.append(idx)
                            student_map[idx] = student
                        else:
                            logging.warning(f"[recognize_face] No face in stored image for: {student.get('name')}")
                except Exception as e:
                    logging.error(f"[recognize_face] Error processing student: {e}")
                    continue
            
            logging.info(f"[recognize_face] Trained LBPH with {len(faces_data)} faces")
            
            if len(faces_data) > 0:
                recognizer.train(faces_data, np.array(labels))
                label_id, distance = recognizer.predict(test_roi_resized)
                logging.info(f"[recognize_face] LBPH result - label: {label_id}, distance: {distance:.2f}")
                
                # LBPH distance: lower is better
                confidence = max(0.0, 1.0 - (distance / 300.0))
                logging.info(f"[recognize_face] LBPH confidence: {confidence:.4f}")
                
                if confidence > 0.15:
                    best_match = student_map.get(label_id)
                    highest_confidence = confidence
        except Exception as e:
            logging.error(f"[recognize_face] LBPH failed: {e}")
        
        # Method 2: Histogram comparison fallback
        if best_match is None:
            logging.info("[recognize_face] Trying histogram comparison fallback")
            test_hist = cv2.calcHist([test_roi_resized], [0], None, [256], [0, 256])
            cv2.normalize(test_hist, test_hist)
            
            for idx, student in enumerate(students):
                try:
                    enc_path = student.get('face_encoding_path')
                    if enc_path and os.path.exists(enc_path):
                        st_img = cv2.imread(enc_path, cv2.IMREAD_GRAYSCALE)
                        if st_img is None:
                            continue
                        st_faces = face_cascade.detectMultiScale(st_img, scaleFactor=1.05, minNeighbors=2, minSize=(20, 20))
                        if len(st_faces) > 0:
                            (sx, sy, sw, sh) = st_faces[0]
                            st_roi = st_img[sy:sy+sh, sx:sx+sw]
                            st_roi = cv2.resize(st_roi, (100, 100))
                            
                            st_hist = cv2.calcHist([st_roi], [0], None, [256], [0, 256])
                            cv2.normalize(st_hist, st_hist)
                            
                            score = cv2.compareHist(test_hist, st_hist, cv2.HISTCMP_CORREL)
                            logging.info(f"[recognize_face] Histogram correlation with {student.get('name')}: {score:.4f}")
                            
                            if score > highest_confidence and score > 0.5:
                                highest_confidence = score
                                best_match = student
                except Exception as e:
                    continue
        
        logging.info(f"[recognize_face] Final result: match={best_match.get('name') if best_match else None}, confidence={highest_confidence:.4f}")
        return best_match, highest_confidence
    
    except Exception as e:
        logging.error(f"Recognition error: {e}", exc_info=True)
        return None, 0.0

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Face Recognition Attendance System API"}

@api_router.post("/students/register")
async def register_student(name: str = Form(...), roll_number: str = Form(...), department: str = Form("Not Specified"), face_image: str = Form(...)):
    """Register a new student with face image"""
    try:
        # Check if student already exists
        existing = await db.students.find_one({"roll_number": roll_number}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Student with this roll number already exists")
        
        # Decode and save face image
        image_array = decode_base64_image(face_image)
        
        # Verify face detection using OpenCV instead of DeepFace
        try:
            gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                raise HTTPException(status_code=400, detail="No face detected in image")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Face detection failed: {str(e)}")
        
        # Create student
        student = Student(
            name=name,
            roll_number=roll_number,
            department=department,
            face_encoding_path=""
        )
        
        # Save face image
        face_path = save_face_image(image_array, student.id)
        student.face_encoding_path = face_path
        
        # Save to database
        doc = student.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.students.insert_one(doc)
        
        return JSONResponse(
            status_code=201,
            content={"message": f"Student {name} registered successfully", "student_id": student.id}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/attendance/mark")
async def mark_attendance(face_image: str = Form(...)):
    """Mark attendance by recognizing face"""
    try:
        # Decode image
        image_array = decode_base64_image(face_image)
        
        # Get all students
        students = await db.students.find({}, {"_id": 0}).to_list(1000)
        
        if not students:
            raise HTTPException(status_code=404, detail="No students registered")
            
        best_match, highest_confidence = recognize_face(image_array)
        
        # We lowered LBPH confidence threshold slightly compared to deepface
        if not best_match or highest_confidence < 0.15:
            raise HTTPException(status_code=404, detail=f"Face not recognized. Confidence: {highest_confidence:.4f}")
        
        # Check if already marked today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing_attendance = await db.attendance.find_one({
            "student_id": best_match['id'],
            "timestamp": {"$gte": today_start.isoformat()}
        })
        
        if existing_attendance:
            return JSONResponse(
                status_code=200,
                content={
                    "message": f"Attendance already marked for {best_match['name']} today",
                    "student": {
                        "name": best_match['name'],
                        "roll_number": best_match['roll_number'],
                        "confidence": float(highest_confidence)
                    },
                    "already_marked": True
                }
            )
        
        # Create attendance record
        attendance = AttendanceRecord(
            student_id=best_match['id'],
            student_name=best_match['name'],
            roll_number=best_match['roll_number'],
            confidence=float(highest_confidence)
        )
        
        # Save to database
        doc = attendance.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.attendance.insert_one(doc)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Attendance marked for {best_match['name']}",
                "student": {
                    "name": best_match['name'],
                    "roll_number": best_match['roll_number'],
                    "confidence": float(highest_confidence)
                },
                "already_marked": False
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Attendance marking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/students")
async def get_students():
    """Get all registered students"""
    try:
        students = await db.students.find({}, {"_id": 0}).to_list(1000)
        return JSONResponse(
            status_code=200,
            content={"students": students, "total": len(students)}
        )
    except Exception as e:
        logging.error(f"Error fetching students: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    """Delete a student"""
    try:
        student = await db.students.find_one({"id": student_id}, {"_id": 0})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Delete face image
        student_dir = FACE_STORAGE_DIR / student_id
        if student_dir.exists():
            shutil.rmtree(student_dir)
        
        # Delete from database
        await db.students.delete_one({"id": student_id})
        
        return JSONResponse(
            status_code=200,
            content={"message": f"Student {student['name']} deleted successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting student: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/attendance")
async def get_attendance(days: int = 7):
    """Get attendance records"""
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        records = await db.attendance.find(
            {"timestamp": {"$gte": cutoff_date.isoformat()}},
            {"_id": 0}
        ).sort("timestamp", -1).to_list(1000)
        
        return JSONResponse(
            status_code=200,
            content={"records": records, "total": len(records)}
        )
    except Exception as e:
        logging.error(f"Error fetching attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        total_students = await db.students.count_documents({})
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_attendance = await db.attendance.count_documents({
            "timestamp": {"$gte": today_start.isoformat()}
        })
        
        total_attendance = await db.attendance.count_documents({})
        
        return JSONResponse(
            status_code=200,
            content={
                "total_students": total_students,
                "today_attendance": today_attendance,
                "total_attendance_records": total_attendance
            }
        )
    except Exception as e:
        logging.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()