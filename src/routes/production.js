// routes/production.js - Rutas de produccion diaria
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/production - listar dias
router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync('SELECT * FROM production_days ORDER BY prod_date DESC LIMIT 30');
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/production/:date - dia completo
router.get('/:date', async (req, res) => {
    try {
        const day = await db.getAsync('SELECT * FROM production_days WHERE prod_date=?', [req.params.date]);
        if (!day) return res.json(null);

        const doughs = await db.allAsync(`
            SELECT pd.*, d.name as dough_name, d.code as dough_code, d.id as dough_id
            FROM production_doughs pd
            JOIN doughs d ON pd.dough_id = d.id
            WHERE pd.production_day_id=?
            ORDER BY d.sort_order
        `, [day.id]);

        for (const dough of doughs) {
            dough.items = await db.allAsync(`
                SELECT pi.*, p.name as product_name, p.code as product_code,
                       p.sale_price, p.weight_g,
                       (pi.qty_initial + pi.qty_produced - pi.qty_sold) as qty_leftover,
                       (pi.qty_initial + pi.qty_produced) as qty_available
                FROM production_items pi
                JOIN products p ON pi.product_id = p.id
                WHERE pi.production_dough_id=?
                ORDER BY p.name
            `, [dough.id]);
        }
        day.doughs = doughs;
        res.json(day);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/production/:date/leftovers - sobrantes del dia anterior inmediato
// Solo busca el dia calendario anterior (contemplando domingo no trabaja)
router.get('/:date/leftovers', async (req, res) => {
    try {
        const targetDate = new Date(req.params.date + 'T12:00:00');
        const dayOfWeek = targetDate.getDay();
        
        let prevDate;
        if (dayOfWeek === 1) {
            prevDate = new Date(targetDate);
            prevDate.setDate(prevDate.getDate() - 3);
        } else {
            prevDate = new Date(targetDate);
            prevDate.setDate(prevDate.getDate() - 1);
        }
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const prevDay = await db.getAsync(`
            SELECT * FROM production_days
            WHERE prod_date = ? AND status = 'closed'
        `, [prevDateStr]);

        if (!prevDay) return res.json({ date: prevDateStr, leftovers: [] });

        const leftovers = await db.allAsync(`
            SELECT
                p.id as product_id,
                p.name as product_name,
                p.code as product_code,
                d.id as dough_id,
                d.name as dough_name,
                d.code as dough_code,
                d.sort_order,
                (pi.qty_initial + pi.qty_produced - pi.qty_sold) as qty_leftover
            FROM production_days dy
            JOIN production_doughs pd ON pd.production_day_id = dy.id
            JOIN doughs d ON pd.dough_id = d.id
            JOIN production_items pi ON pi.production_dough_id = pd.id
            JOIN products p ON pi.product_id = p.id
            WHERE dy.id = ?
              AND (pi.qty_initial + pi.qty_produced - pi.qty_sold) > 0
            ORDER BY d.sort_order, p.name
        `, [prevDay.id]);

        res.json({ date: prevDay.prod_date, leftovers });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/production - crear dia
router.post('/', async (req, res) => {
    const { prod_date, notes } = req.body;
    try {
        const result = await db.runAsync(
            'INSERT INTO production_days (prod_date, notes, status) VALUES (?, ?, ?)',
            [prod_date, notes || '', 'planning']
        );
        res.json({ id: result.lastID, prod_date, status: 'planning' });
    } catch(e) { res.status(400).json({ error: 'Ya existe un registro para esa fecha.' }); }
});

// POST /api/production/:date/dough - agregar masa al dia
router.post('/:date/dough', async (req, res) => {
    const { dough_id, mass_produced_g } = req.body;
    try {
        const day = await db.getAsync('SELECT id FROM production_days WHERE prod_date=?', [req.params.date]);
        if (!day) return res.status(404).json({ error: 'Dia no encontrado' });

        const existing = await db.getAsync(
            'SELECT id FROM production_doughs WHERE production_day_id=? AND dough_id=?',
            [day.id, dough_id]
        );
        let id;
        if (existing) {
            await db.runAsync('UPDATE production_doughs SET mass_produced_g=? WHERE id=?',
                [mass_produced_g || 0, existing.id]);
            id = existing.id;
        } else {
            const result = await db.runAsync(
                'INSERT INTO production_doughs (production_day_id, dough_id, mass_produced_g) VALUES (?, ?, ?)',
                [day.id, dough_id, mass_produced_g || 0]
            );
            id = result.lastID;
        }
        res.json({ id });
    } catch(e) { res.status(400).json({ error: e.message }); }
});

// POST /api/production/dough/:doughId/item - agregar/actualizar item
router.post('/dough/:doughId/item', async (req, res) => {
    const { product_id, qty_planned, qty_produced, qty_sold, qty_initial, notes } = req.body;
    try {
        const existing = await db.getAsync(
            'SELECT id FROM production_items WHERE production_dough_id=? AND product_id=?',
            [req.params.doughId, product_id]
        );
        let id;
        if (existing) {
            const updates = [];
            const vals = [];
            if (qty_planned !== undefined)  { updates.push('qty_planned=?');  vals.push(qty_planned); }
            if (qty_produced !== undefined) { updates.push('qty_produced=?'); vals.push(qty_produced); }
            if (qty_sold !== undefined)     { updates.push('qty_sold=?');     vals.push(qty_sold); }
            if (qty_initial !== undefined)  { updates.push('qty_initial=?');  vals.push(qty_initial); }
            if (notes !== undefined)        { updates.push('notes=?');        vals.push(notes); }
            if (updates.length > 0) {
                vals.push(existing.id);
                await db.runAsync(`UPDATE production_items SET ${updates.join(',')} WHERE id=?`, vals);
            }
            id = existing.id;
        } else {
            const result = await db.runAsync(`
                INSERT INTO production_items
                (production_dough_id, product_id, qty_planned, qty_produced, qty_sold, qty_initial, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [req.params.doughId, product_id,
                qty_planned||0, qty_produced||0, qty_sold||0, qty_initial||0, notes||'']);
            id = result.lastID;
        }
        res.json({ id });
    } catch(e) { res.status(400).json({ error: e.message }); }
});

// POST /api/production/batch-items - crear items de producción (para scan)
router.post('/batch-items', async (req, res) => {
    const { prod_date, items } = req.body;
    try {
        let day = await db.getAsync('SELECT id FROM production_days WHERE prod_date=?', [prod_date]);
        if (!day) {
            const result = await db.runAsync(
                'INSERT INTO production_days (prod_date, notes, status) VALUES (?, ?, ?)',
                [prod_date, 'Importado desde scan', 'planning']
            );
            day = { id: result.lastID };
        }
        
        const results = [];
        
        for (const item of items) {
            const product = await db.getAsync('SELECT id, dough_id FROM products WHERE id=?', [item.product_id]);
            if (!product) continue;
            
            let dough = await db.getAsync(
                'SELECT id FROM production_doughs WHERE production_day_id=? AND dough_id=?',
                [day.id, product.dough_id]
            );
            
            if (!dough) {
                const result = await db.runAsync(
                    'INSERT INTO production_doughs (production_day_id, dough_id) VALUES (?, ?)',
                    [day.id, product.dough_id]
                );
                dough = { id: result.lastID };
            }
            
            const existing = await db.getAsync(
                'SELECT id FROM production_items WHERE production_dough_id=? AND product_id=?',
                [dough.id, item.product_id]
            );
            
            if (existing) {
                await db.runAsync(
                    'UPDATE production_items SET qty_planned=?, qty_produced=? WHERE id=?',
                    [item.qty_planned, item.qty_produced, existing.id]
                );
                results.push({ product_id: item.product_id, id: existing.id, updated: true });
            } else {
                const result = await db.runAsync(
                    'INSERT INTO production_items (production_dough_id, product_id, qty_planned, qty_produced, qty_initial) VALUES (?, ?, ?, ?, ?)',
                    [dough.id, item.product_id, item.qty_planned, item.qty_produced, item.qty_initial || 0]
                );
                results.push({ product_id: item.product_id, id: result.lastID, created: true });
            }
        }
        
        res.json({ day_id: day.id, items: results });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/production/:date/status
router.put('/:date/status', async (req, res) => {
    try {
        await db.runAsync('UPDATE production_days SET status=? WHERE prod_date=?',
            [req.body.status, req.params.date]);
        res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/production/:date/report
router.get('/:date/report', async (req, res) => {
    try {
        const rows = await db.allAsync(`
            SELECT
                dy.prod_date,
                d.name as masa,
                p.name as producto,
                pi.qty_initial as stock_inicial,
                pi.qty_planned as planificado,
                pi.qty_produced as producido,
                (pi.qty_initial + pi.qty_produced) as disponible,
                pi.qty_sold as vendido,
                (pi.qty_initial + pi.qty_produced - pi.qty_sold) as sobrante,
                ROUND(pi.qty_sold * p.sale_price, 2) as total_usd
            FROM production_days dy
            JOIN production_doughs pd ON pd.production_day_id = dy.id
            JOIN doughs d ON pd.dough_id = d.id
            JOIN production_items pi ON pi.production_dough_id = pd.id
            JOIN products p ON pi.product_id = p.id
            WHERE dy.prod_date = ?
            ORDER BY d.sort_order, p.name
        `, [req.params.date]);
        const total = rows.reduce((s, r) => s + (r.total_usd || 0), 0);
        res.json({ rows, total: Math.round(total * 100) / 100 });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/production/:date/suggest
router.get('/:date/suggest', async (req, res) => {
    try {
        const targetDate = new Date(req.params.date + 'T12:00:00');
        const dayOfWeek = targetDate.getDay();
        const suggestions = await db.allAsync(`
            SELECT
                p.id as product_id, p.name as product_name, p.code as product_code,
                d.id as dough_id, d.name as dough_name, d.code as dough_code, d.sort_order,
                ROUND(AVG(pi.qty_sold), 0) as avg_sold,
                COUNT(*) as weeks_data
            FROM production_days dy
            JOIN production_doughs pdg ON pdg.production_day_id = dy.id
            JOIN doughs d ON pdg.dough_id = d.id
            JOIN production_items pi ON pi.production_dough_id = pdg.id
            JOIN products p ON pi.product_id = p.id
            WHERE dy.prod_date < ?
              AND dy.prod_date >= date(?, '-21 days')
              AND CAST(strftime('%w', dy.prod_date) AS INTEGER) = ?
              AND dy.status = 'closed'
            GROUP BY p.id
            ORDER BY d.sort_order, p.name
        `, [req.params.date, req.params.date, dayOfWeek]);
        res.json(suggestions);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
