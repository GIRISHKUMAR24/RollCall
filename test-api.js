// Test script for the Attendance Management System API
const API_BASE = 'http://localhost:8080/api';

async function testAPI() {
  console.log('🧪 Testing Attendance Management System API\n');

  // Test 1: Health Check
  console.log('1️⃣ Testing health check...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: Student Signup
  console.log('\n2️⃣ Testing student signup...');
  try {
    const studentData = {
      name: 'Girish Kumar Gundapu',
      email: 'girishkumargundapu@gmail.com',
      password: 'password123',
      role: 'student'
    };

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData)
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Student signup successful:', data);
    } else {
      console.log('⚠️ Student signup response:', data);
    }
  } catch (error) {
    console.error('❌ Student signup failed:', error.message);
  }

  // Test 3: Teacher Signup
  console.log('\n3️⃣ Testing teacher signup...');
  try {
    const teacherData = {
      name: 'Dr. Smith Johnson',
      email: 'smith.johnson@teacher.edu',
      password: 'teacher123',
      role: 'teacher'
    };

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teacherData)
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Teacher signup successful:', data);
    } else {
      console.log('⚠️ Teacher signup response:', data);
    }
  } catch (error) {
    console.error('❌ Teacher signup failed:', error.message);
  }

  // Test 4: Principal Signup
  console.log('\n4️⃣ Testing principal signup...');
  try {
    const principalData = {
      name: 'Principal Anderson',
      email: 'anderson@principal.edu',
      password: 'principal123',
      role: 'principal'
    };

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(principalData)
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Principal signup successful:', data);
    } else {
      console.log('⚠️ Principal signup response:', data);
    }
  } catch (error) {
    console.error('❌ Principal signup failed:', error.message);
  }

  // Test 5: Duplicate Email Test
  console.log('\n5️⃣ Testing duplicate email prevention...');
  try {
    const duplicateData = {
      name: 'Another Student',
      email: 'girishkumargundapu@gmail.com', // Same email as first student
      password: 'password456',
      role: 'student'
    };

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateData)
    });

    const data = await response.json();
    if (response.status === 409) {
      console.log('✅ Duplicate email correctly rejected:', data);
    } else {
      console.log('⚠️ Unexpected response for duplicate email:', data);
    }
  } catch (error) {
    console.error('❌ Duplicate email test failed:', error.message);
  }

  // Test 6: Invalid Role Test
  console.log('\n6️⃣ Testing invalid role validation...');
  try {
    const invalidData = {
      name: 'Invalid User',
      email: 'invalid@example.com',
      password: 'password123',
      role: 'admin' // Invalid role
    };

    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    const data = await response.json();
    if (response.status === 400) {
      console.log('✅ Invalid role correctly rejected:', data);
    } else {
      console.log('⚠️ Unexpected response for invalid role:', data);
    }
  } catch (error) {
    console.error('❌ Invalid role test failed:', error.message);
  }

  console.log('\n🎉 API testing completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Check MongoDB Atlas dashboard to see the data');
  console.log('   2. Database: attendanceDB');
  console.log('   3. Collections: students, teachers, principals');
}

// Run the tests
testAPI().catch(console.error);
