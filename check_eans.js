import { getClient } from './server/db.js';

(async () => {
    const client = await getClient();
    try {
        const eans = ['7898962128664', '7898962128183'];
        console.log(`Checking for EANs: ${eans.join(', ')}`);

        const res = await client.query(`SELECT id, ean, descricao FROM produtos WHERE ean = ANY($1)`, [eans]);

        console.log('--- FOUND PRODUCTS ---');
        console.table(res.rows);

        if (res.rows.length === 0) {
            console.log('RESULT: NO MATCHES FOUND');
        } else {
            console.log(`RESULT: Found ${res.rows.length} out of ${eans.length}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        // Force exit to close pool
        process.exit(0);
    }
})();
