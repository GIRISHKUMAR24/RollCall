async function test() {
  const url = 'http://localhost:5173/.netlify/functions/api/signup';
  const body = {
    name: 'Test User',
    email: `test-${Date.now()}@gmail.com`,
    password: 'password123',
    role: 'student',
    roleSpecificId: '12345',
    branch: 'CSE',
    section: 'A',
    phone: '1234567890'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Status:', res.status);
    console.log('Headers:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
