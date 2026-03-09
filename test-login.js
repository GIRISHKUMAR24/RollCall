async function test() {
    const url = 'http://localhost:5173/api/login';
    const signupUrl = 'http://localhost:5173/api/signup';
    const email = `teacher-${Date.now()}@gmail.com`;

    try {
        // 1. Signup
        console.log('Signing up as Teacher...');
        const signupRes = await fetch(signupUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Teacher',
                email: email,
                password: 'password123',
                role: 'teacher',
                teacherId: 'T123'
            })
        });
        console.log('Signup Status:', signupRes.status);

        // 2. Login
        console.log('Logging in as Teacher...');
        const loginRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: 'password123',
                role: 'teacher'
            })
        });

        console.log('Login Status:', loginRes.status);
        const body = await loginRes.json();
        console.log('Login Body:', body);
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
