const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync('SELECT * FROM doughs WHERE active=1 ORDER BY sort_order');
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/products', async (req, res) => {
    try {
        const rows = await db.allAsync(
            'SELECT * FROM products WHERE dough_id=? AND active=1 ORDER BY name',
            [req.params.id]
        );
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;