-- ============================================================
-- SCHEMA BAKERY-APP - SQLite
-- ============================================================

-- Masas base
CREATE TABLE IF NOT EXISTS doughs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit_weight_g INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    dough_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    weight_g INTEGER NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (dough_id) REFERENCES doughs(id)
);

-- Ingredientes / Materia prima
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'g',
    price_per_unit REAL NOT NULL DEFAULT 0,
    stock REAL NOT NULL DEFAULT 0,
    min_stock REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

-- Receta de cada masa base (porcentaje panadero)
CREATE TABLE IF NOT EXISTS dough_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dough_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    percentage REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (dough_id) REFERENCES doughs(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    UNIQUE(dough_id, ingredient_id)
);

-- Ingredientes adicionales por producto
CREATE TABLE IF NOT EXISTS product_extra_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity_per_unit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    UNIQUE(product_id, ingredient_id)
);

-- Costos indirectos mensuales
CREATE TABLE IF NOT EXISTS indirect_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    monthly_amount REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

-- Compras de ingredientes
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    supplier TEXT,
    notes TEXT,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- Dia de produccion
CREATE TABLE IF NOT EXISTS production_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_date TEXT NOT NULL UNIQUE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'planning'
    -- status: planning | produced | closed
);

-- Masa del dia
CREATE TABLE IF NOT EXISTS production_doughs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    production_day_id INTEGER NOT NULL,
    dough_id INTEGER NOT NULL,
    mass_produced_g INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (production_day_id) REFERENCES production_days(id),
    FOREIGN KEY (dough_id) REFERENCES doughs(id),
    UNIQUE(production_day_id, dough_id)
);

-- Item de produccion
CREATE TABLE IF NOT EXISTS production_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    production_dough_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty_planned INTEGER NOT NULL DEFAULT 0,
    qty_produced INTEGER NOT NULL DEFAULT 0,
    qty_sold INTEGER NOT NULL DEFAULT 0,
    qty_initial INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (production_dough_id) REFERENCES production_doughs(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(production_dough_id, product_id)
);

-- Pedidos del dia (para el sistema de sugerencias)
CREATE TABLE IF NOT EXISTS daily_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_date TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    qty_ordered INTEGER NOT NULL DEFAULT 0,
    customer TEXT,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indices de ajuste (feriados, clima, etc.)
CREATE TABLE IF NOT EXISTS adjustment_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_date TEXT NOT NULL UNIQUE,
    factor REAL NOT NULL DEFAULT 1.0,
    reason TEXT
);