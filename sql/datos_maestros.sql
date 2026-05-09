-- ============================================================
-- DATOS MAESTROS - BAKERY APP
-- ============================================================

-- MASAS BASE
INSERT OR IGNORE INTO doughs (code, name, unit_weight_g, sort_order) VALUES
    ('BG1', 'Baguette',  310, 1),
    ('BO1', 'Bollito',    60, 2),
    ('CA1', 'Campesino', 750, 3),
    ('DU1', 'Dulce',      60, 4),
    ('IN1', 'Integral',  435, 5),
    ('NE1', 'Negra',     435, 6),
    ('OR1', 'Oregano',   435, 7),
    ('SE1', 'Semilla',   460, 8),
    ('FO1', 'Focaccia',  750, 9);

-- PRODUCTOS
INSERT OR IGNORE INTO products (code, dough_id, name, weight_g, sale_price) VALUES
    ('BG-BAG', (SELECT id FROM doughs WHERE code='BG1'), 'Baguette',            310, 1.40),
    ('BG-MIN', (SELECT id FROM doughs WHERE code='BG1'), 'Mini Baguette',       110, 0.60),
    ('BO-BOL', (SELECT id FROM doughs WHERE code='BO1'), 'Bollito',              60, 0.25),
    ('BO-MOL', (SELECT id FROM doughs WHERE code='BO1'), 'Molde Brioche',       500, 2.20),
    ('BO-HAM', (SELECT id FROM doughs WHERE code='BO1'), 'Hamburguesa Bollito',  80, 0.60),
    ('BO-BRI', (SELECT id FROM doughs WHERE code='BO1'), 'Palanqueta Brioche',   80, 0.60),
    ('CA-CAM', (SELECT id FROM doughs WHERE code='CA1'), 'Campesino',           750, 3.00),
    ('CA-MED', (SELECT id FROM doughs WHERE code='CA1'), 'Medio Campesino',     375, 1.60),
    ('CA-PAN', (SELECT id FROM doughs WHERE code='CA1'), 'Panecook',            250, 1.10),
    ('DU-DUL', (SELECT id FROM doughs WHERE code='DU1'), 'Dulce',                60, 0.30),
    ('FO-POR', (SELECT id FROM doughs WHERE code='FO1'), 'Focaccia Porcion',    190, 1.80),
    ('FO-COM', (SELECT id FROM doughs WHERE code='FO1'), 'Focaccia Completa',   750, 7.20),
    ('IN-INT', (SELECT id FROM doughs WHERE code='IN1'), 'Integral',            435, 2.00),
    ('NE-NEG', (SELECT id FROM doughs WHERE code='NE1'), 'Negra',               435, 2.25),
    ('NE-MIN', (SELECT id FROM doughs WHERE code='NE1'), 'Mini Negra',           80, 0.40),
    ('OR-ORE', (SELECT id FROM doughs WHERE code='OR1'), 'Oregano',             450, 2.00),
    ('OR-MIN', (SELECT id FROM doughs WHERE code='OR1'), 'Mini Oregano',         80, 0.40),
    ('OR-TOC', (SELECT id FROM doughs WHERE code='OR1'), 'Tocino',              450, 2.25),
    ('OR-MTO', (SELECT id FROM doughs WHERE code='OR1'), 'Medio Tocino',        225, 1.35),
    ('SE-SEM', (SELECT id FROM doughs WHERE code='SE1'), 'Semilla',             470, 2.60),
    ('SE-MED', (SELECT id FROM doughs WHERE code='SE1'), 'Media Semilla',       235, 1.40);

-- INGREDIENTES
INSERT OR IGNORE INTO ingredients (code, name, unit, price_per_unit) VALUES
    ('ING-HAR', 'Harina',          'g', 0.00084),
    ('ING-AGU', 'Agua',            'g', 0.00000),
    ('ING-MAS', 'Masa madre',      'g', 0.00042),
    ('ING-LEV', 'Levadura',        'g', 0.00488),
    ('ING-SAL', 'Sal',             'g', 0.00049),
    ('ING-GRA', 'Grasa',           'g', 0.002267),
    ('ING-MAN', 'Manteca',         'g', 0.002267),
    ('ING-MAR', 'Margarina',       'g', 0.002267),
    ('ING-MTQ', 'Mantequilla',     'g', 0.004000),
    ('ING-HUE', 'Huevo',           'g', 0.002111),
    ('ING-LEC', 'Leche',           'g', 0.000800),
    ('ING-AZU', 'Azucar',          'g', 0.000799),
    ('ING-INT', 'Harina Integral', 'g', 0.001000),
    ('ING-ORE', 'Oregano',         'g', 0.006608),
    ('ING-TOC', 'Tocino',          'g', 0.014500),
    ('ING-ACE', 'Aceituna',        'g', 0.008080),
    ('ING-LIN', 'Linaza',          'g', 0.002203),
    ('ING-VAI', 'Vainilla',        'g', 0.006000),
    ('ING-ALB', 'Albahaca',        'g', 0.000000);

-- COSTOS INDIRECTOS
INSERT OR IGNORE INTO indirect_costs (name, monthly_amount) VALUES
    ('Arriendo', 350.00),
    ('Luz',       65.00);