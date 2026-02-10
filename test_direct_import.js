
import http from 'http';

const PORT = 3001; // Back to 3001

const data = JSON.stringify({
    fileContent: Buffer.from("Ref,Descricao,EAN\n123,Teste,789").toString('base64')
});

const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/products/import',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`Port ${PORT} Status: ${res.statusCode}`);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Body:', body.substring(0, 500)));
});

req.on('error', (e) => console.error(`❌ Request Error: ${e.message}`));
req.write(data);
req.end();
