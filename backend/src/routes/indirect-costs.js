const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync('SELECT * FROM indirect_costs WHERE active=1 ORDER BY name');
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
