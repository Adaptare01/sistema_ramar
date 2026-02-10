
import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/products/import', (req, res) => {
    console.log('HIT: /api/products/import');
    res.json({ success: true, message: 'Minimal server working' });
});

app.listen(3002, () => {
    console.log('Minimal debug server running on 3002');
});
