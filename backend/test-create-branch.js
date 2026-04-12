import jwt from 'jsonwebtoken';

const JWT_SECRET = 'NmVlZjQzMzAtYjZmNi00ZTk4LTg4ZDAtNDI0NTM0Y2NkYjI5ZWI0NzEwNjYtOGEzMy00NmMzLWIyZWEtMTNmMTZhODI4ZjY0';

async function testCreateBranch() {
  console.log('Generating Admin Token...');
  const token = jwt.sign(
    { id: 'system-agent', email: 'admin@antidote.ai', name: 'System Agent', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Sending request to live API: https://multipos.onrender.com/api/branches');
  try {
    const response = await fetch('https://multipos.onrender.com/api/branches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Branch (Auto-Created)',
        location: 'Virtual Sandbox QA'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('SUCCESS✅! Newly created branch:', data);
    } else {
      console.error('FAILED❌! Server responded with:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testCreateBranch();
