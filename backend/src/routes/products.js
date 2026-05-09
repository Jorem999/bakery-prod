const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync(`
            SELECT p.*, d.name as dough_name, d.code as dough_code, d.sort_order
            FROM products p JOIN doughs d ON p.dough_id = d.id
            WHERE p.active=1 ORDER BY d.sort_order, p.name
        `);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;