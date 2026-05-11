# Attendance Management System - Backend API

## 🚀 Server Status
✅ **Server Running**: http://localhost:4000  
✅ **Database Connected**: MongoDB Atlas (attendanceDB)  
✅ **Collections**: students, teachers, principals, sessions, attendance  
✅ **Dashboard**: [Principal Dashboard](http://localhost:5173/principal-dashboard) | [Teacher Dashboard](http://localhost:5173/teacher-dashboard)

---

## 📡 API Endpoints

### 1. Authentication
#### **POST** `/api/signup`
Creates a new user in the specific role collection.
- **Body**: `{ name, email, password, role, roleSpecificId, branch, section, phone }`
- **Roles**: `student`, `teacher`, `principal`

#### **POST** `/api/login`
Authenticates a user and returns a JWT token.
- **Body**: `{ email, password, role }`
- **Response**: `{ success, user, token }`

---

### 2. System Statistics (Principal)
#### **GET** `/api/stats`
Returns counts and samples for all collections.
- **Response**: 
```json
{
  "statistics": {
    "students": { "count": 10 },
    "teachers": { "count": 2 },
    "attendance": { "count": 150 }
  }
}
```

---

### 3. Student Management
#### **GET** `/api/students/search?rollNumber=XXX`
Finds a student and calculates their real-time attendance analytics.
- **Response**: `{ success, student: { name, rollNo, overallAttendance, subjectWiseAttendance, recentAttendance } }`

#### **GET** `/api/students?branch=CSE&section=1`
Lists all students in a specific class.

---

### 4. Attendance & Sessions
#### **POST** `/api/session/start`
Starts a new attendance session for a class.
- **Body**: `{ subject, branch, section, teacherLocation }`

#### **POST** `/api/attendance/record`
Students call this (via QR scan) to mark themselves present.
- **Body**: `{ sessionId, rollNumber, studentLocation }`

#### **POST** `/api/attendance/finalize`
Closes the session and marks missing students as "Absent".

---

### 5. Email System
#### **POST** `/api/email/send-attendance`
Generates and sends unique, time-limited QR code links to an entire class via Gmail SMTP.

---

## 🛠️ Security & Architecture
- **JWT Authentication**: Secured endpoints for teachers/principals.
- **Bcrypt Hashing**: 12 rounds of salting for all passwords.
- **Geofencing**: Automatic verification of student GPS coordinates against teacher location.
- **QR Expiry**: 60-second time-to-live for attendance tokens to prevent spoofing.
- **Full-Stack Integration**: Built with Express, Vite, and MongoDB.

---

## 📊 Verification
You can monitor the database directly in **MongoDB Atlas** under the `attendanceDB` database.
- **Total Users**: Check `students`, `teachers`, `principals` collections.
- **Live Attendance**: Monitor the `attendance` collection during an active session.
