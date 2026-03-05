const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
}

// Configuration
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'saits-super-secret-build-token';

const server = http.createServer((req, res) => {
    // Use a dummy host to parse the URL correctly
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'POST' && url.pathname === '/webhook/build') {
        const token = url.searchParams.get('token');

        // 1. Verify the secret token
        if (token !== SECRET) {
            console.warn(`[${new Date().toISOString()}] Unauthorized webhook attempt thwarted.`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }

        // 2. Respond immediately so NocoDB doesn't timeout
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'Build triggered successfully' }));

        console.log(`[${new Date().toISOString()}] Webhook received! Rebuilding website...`);

        // 3. Run the build command in the background
        exec('npm run build', (error, stdout, stderr) => {
            if (error) {
                console.error(`Build failed: ${error.message}`);
                return;
            }
            if (stderr) console.error(`Build warnings/errors: ${stderr}`);
            console.log(`Build precise output:\n${stdout}`);
            console.log(`[${new Date().toISOString()}] Website successfully generated with new data!`);
        });
    } else {
        // 404 for any other requests to keep it stealthy
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`=========================================`);
    console.log(`🚀 Automated Build Webhook Listener Live!`);
    console.log(`=========================================`);
    console.log(`Listening on local port: ${PORT}`);
    console.log(`Incoming Trigger URL: http://localhost:9000/webhook/build?token=${SECRET}`);
    console.log(`Waiting for NocoDB triggers...`);
});
