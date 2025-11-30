# Attendance Management System - Backend API

## 🚀 Server Status
✅ **Server Running**: http://localhost:8080  
✅ **Database Connected**: MongoDB Atlas (attendanceDB)  
✅ **Collections Created**: students, teachers, principals  
✅ **Indexes Created**: Unique email indexes on all collections  

---

## 📡 API Endpoints

### 1. Health Check
**GET** `/api/health`

**Response:**
```json
{
  "message": "Database connection healthy",
  "database": "attendanceDB",
  "collections": ["students", "teachers", "principals"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. User Signup
**POST** `/api/signup`

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "role": "student" | "teacher" | "principal"
}
```

**Success Response (201):**
```json
{
  "message": "Signup successful",
  "collection": "students",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "error": "Validation Error",
  "message": "All fields are required: name, email, password, role"
}
```

**409 - Email Already Exists:**
```json
{
  "error": "Conflict",
  "message": "Email already exists in students collection"
}
```

---

## 🧪 Test Examples

### Test 1: Student Signup
```bash
curl -X POST http://localhost:8080/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Girish Kumar Gundapu",
    "email": "girishkumargundapu@gmail.com",
    "password": "password123",
    "role": "student"
  }'
```

### Test 2: Teacher Signup
```bash
curl -X POST http://localhost:8080/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith Johnson",
    "email": "smith.johnson@teacher.edu",
    "password": "teacher123",
    "role": "teacher"
  }'
```

### Test 3: Principal Signup
```bash
curl -X POST http://localhost:8080/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Principal Anderson",
    "email": "anderson@principal.edu",
    "password": "principal123",
    "role": "principal"
  }'
```

---

## 🛡️ Security Features

### Password Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Security**: Passwords are never stored in plain text

### Email Uniqueness
- **Validation**: Unique email per collection
- **Index**: MongoDB unique index prevents duplicates
- **Error Handling**: Proper conflict responses

### Input Validation
- **Required Fields**: All fields validated
- **Email Format**: Regex validation
- **Password Strength**: Minimum 6 characters
- **Role Validation**: Only allowed roles accepted

---

## 🗄️ Database Structure

### Database Name
`attendanceDB`

### Collections

#### students
```json
{
  "_id": ObjectId("..."),
  "name": "Girish Kumar Gundapu",
  "email": "girishkumargundapu@gmail.com",
  "password": "$2b$12$...", // bcrypt hashed
  "role": "student",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### teachers
```json
{
  "_id": ObjectId("..."),
  "name": "Dr. Smith Johnson",
  "email": "smith.johnson@teacher.edu",
  "password": "$2b$12$...", // bcrypt hashed
  "role": "teacher",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### principals
```json
{
  "_id": ObjectId("..."),
  "name": "Principal Anderson",
  "email": "anderson@principal.edu",
  "password": "$2b$12$...", // bcrypt hashed
  "role": "principal",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 Technical Implementation

### Dependencies
- **express**: Web framework
- **mongodb**: Native MongoDB driver
- **bcrypt**: Password hashing
- **cors**: Cross-origin requests
- **dotenv**: Environment variables

### Key Features
1. **Type Safety**: Full TypeScript implementation
2. **Error Handling**: Comprehensive error responses
3. **Database Indexes**: Optimized queries with unique constraints
4. **Connection Pooling**: Efficient MongoDB connection management
5. **Input Sanitization**: Email normalization and trimming

### Environment Variables
```env
MONGODB_URI=mongodb+srv://...
DATABASE_NAME=attendanceDB
PORT=8080
BCRYPT_SALT_ROUNDS=12
```

---

## 📊 Verification in MongoDB Atlas

After running the signup endpoints, you can verify the data in MongoDB Atlas:

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Navigate to**: Cluster0 → Browse Collections
3. **Database**: attendanceDB
4. **Collections**: 
   - students (for student signups)
   - teachers (for teacher signups)
   - principals (for principal signups)

Each collection will show the inserted documents with:
- Hashed passwords (bcrypt)
- Normalized email addresses
- Creation timestamps
- Proper role assignments

---

## 🎯 Next Steps

1. **Test the API** using tools like Postman or curl
2. **Verify data** in MongoDB Atlas dashboard
3. **Add authentication** endpoints (login, JWT tokens)
4. **Implement attendance** tracking endpoints
5. **Add data validation** middleware
6. **Create user management** endpoints (update, delete)

---

## 🚨 Important Notes

- **Security**: Never commit the .env file with real credentials
- **Passwords**: Always use bcrypt for password hashing
- **Database**: Ensure proper indexing for performance
- **Error Handling**: Always return appropriate HTTP status codes
- **Validation**: Validate all inputs on both client and server side
