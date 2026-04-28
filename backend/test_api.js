const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students/subjects/list?level=FORM+VI&stream=ALL&year=2025',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.end();
