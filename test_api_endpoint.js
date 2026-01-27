// Native fetch in Node 18+

async function testApi() {
    console.log('Testing GET http://localhost:3001/api/cargas ...');
    try {
        const res = await fetch('http://localhost:3001/api/cargas');
        if (!res.ok) {
            console.error('API Error:', res.status, res.statusText);
            const text = await res.text();
            console.error('Body:', text);
            return;
        }
        const data = await res.json();
        console.log(`API returned ${data.length} items.`);
        if (data.length > 0) {
            console.log('First item sample:', data[0]);
        }
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

testApi();
