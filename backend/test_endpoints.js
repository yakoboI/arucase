const http = require('http');

const testEndpoint = (path, description) => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`${description}: STATUS ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log(`✅ SUCCESS: ${description}`);
      } else {
        console.log(`❌ FAILED: ${description} - ${data.substring(0, 100)}`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`❌ ERROR: ${description} - ${e.message}`);
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.log(`❌ TIMEOUT: ${description}`);
  });

  req.end();
};

console.log('Testing API endpoints...');
testEndpoint('/api/public/homepage', 'Homepage API');
testEndpoint('/api/public/visitor-stats', 'Visitor Stats API');
