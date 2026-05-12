const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sessionJwt = process.env.DEV_AUTO_LOGIN_JWT;
if (!sessionJwt) {
  console.error('Set DEV_AUTO_LOGIN_JWT in backend/.env (JWT from /api/auth/login, dev only).');
  process.exit(1);
}

// Create a simple HTML file that automatically logs you in
const createAutoLoginHTML = (jwtForBrowser) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Auto Login - PDF Generation Fix</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .step { 
            background: #e8f4fd; 
            color: #0066cc; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px;
            font-weight: bold;
        }
        .button { 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px;
            margin: 10px 5px;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover { background: #218838; }
        .success { 
            background: #28a745; 
            color: white; 
            padding: 20px; 
            border-radius: 5px; 
            margin-top: 20px;
            text-align: center;
        }
        .code { 
            background: #f8f9fa; 
            padding: 10px; 
            border-radius: 3px; 
            font-family: monospace; 
            font-size: 12px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 PDF Generation Auto-Login Fix</h1>
        
        <div class="step">
            <strong>Step 1:</strong> Open this HTML file in your browser
        </div>
        
        <div class="step">
            <strong>Step 2:</strong> Click the button below to automatically log you in
        </div>
        
        <button class="button" onclick="autoLogin()">
            🔑 Click Here to Auto-Login
        </button>
        
        <div id="status" style="margin-top: 20px;"></div>
        
        <div class="step">
            <strong>Step 3:</strong> After successful login, click this link to download PDF:
            <br>
            <a href="http://localhost:3001/admin/pre-form-one/2025/interview-results" target="_blank" style="color: #0066cc;">
                📄 Go to Interview Results Page
            </a>
        </div>
        
        <div id="token-display" style="margin-top: 20px;"></div>
    </div>

    <script>
        function autoLogin() {
            const status = document.getElementById('status');
            const tokenDisplay = document.getElementById('token-display');
            
            status.innerHTML = '⏳ Logging you in...';
            
            const token = ${JSON.stringify(jwtForBrowser)};
            
            const user = {
                id: 1,
                username: 'test_admin',
                email: 'test@example.com',
                role: 'admin',
                permissions: {
                    modules: ['all'],
                    class_subjects: {},
                    classes: ['all'],
                    subjects: ['all'],
                    score_entry_months: ['all'],
                    class_permissions: {}
                }
            };
            
            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            status.innerHTML = '<div class="success">✅ Successfully logged in as Admin!</div>';
            
            tokenDisplay.innerHTML = '<div class="step"><strong>Token stored:</strong><br><div class="code">' + token + '</div></div>';
            
            // Open the PDF page in a new tab after 2 seconds
            setTimeout(() => {
                window.open('http://localhost:3001/admin/pre-form-one/2025/interview-results', '_blank');
            }, 2000);
        }
        
        // Check if already logged in
        window.onload = function() {
            const existingToken = localStorage.getItem('token');
            const status = document.getElementById('status');
            
            if (existingToken) {
                status.innerHTML = '<div class="success">✅ You are already logged in!</div>';
                document.getElementById('token-display').innerHTML = '<div class="step"><strong>Current Token:</strong><br><div class="code">' + existingToken + '</div></div>';
            }
        };
    </script>
</body>
</html>
  `;
  
  return html;
};

// Write the HTML file
const htmlContent = createAutoLoginHTML(sessionJwt);
const filePath = path.join(__dirname, 'auto_login.html');

fs.writeFileSync(filePath, htmlContent);
console.log('✅ Auto-login HTML file created: ' + filePath);
console.log('🌐 Open this file in your browser and click the button to auto-login!');
console.log('📁 File location: ' + filePath);
