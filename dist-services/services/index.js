/**
 * Service entry point for the backend services
 */
import { createServer } from 'http';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
// For ES modules in Node.js
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
// Simple service router
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const path = url.pathname;
        console.log(`${req.method} ${path}`);
        // Set CORS headers for cross-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        // Handle OPTIONS requests (CORS preflight)
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // Health check endpoint
        if (path === '/health' || path === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'backend-services',
                time: new Date().toISOString(),
            }));
            return;
        }
        // Proxy requests to MM service
        if (path.startsWith('/mm/')) {
            try {
                const mmServiceUrl = process.env.MM_SERVICE_URL || 'http://localhost:8010';
                const mmPath = path.replace('/mm', '');
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        const mmResponse = await fetch(`${mmServiceUrl}${mmPath}`, {
                            method: req.method,
                            headers: {
                                'Content-Type': req.headers['content-type'] || 'application/json',
                            },
                            body: body || undefined,
                        });
                        const responseData = await mmResponse.text();
                        res.writeHead(mmResponse.status, {
                            'Content-Type': mmResponse.headers.get('Content-Type') || 'application/json',
                        });
                        res.end(responseData);
                    }
                    catch (error) {
                        console.error('Error proxying to MM service:', error);
                        res.writeHead(502, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'MM service unavailable', details: error.message }));
                    }
                });
            }
            catch (error) {
                console.error('Error handling MM proxy request:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
            }
            return;
        }
        // Not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    catch (error) {
        console.error('Unhandled error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
    }
});
server.listen(PORT, () => {
    console.log(`Backend services running at http://${HOST}:${PORT}`);
});
//# sourceMappingURL=index.js.map