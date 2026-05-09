// db/database.js - Conexion SQLite con sqlite3
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../bakery.db');
const SCHEMA_PATH = path.join(__dirname, '../../../sql/schema.sql');
const DATOS_PATH = path.join(__dirname, '../../../sql/datos_maestros.sql');

// Crear carpeta data si no existe
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

// Helpers asincrono
db.runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});

db.getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});

db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

db.execAsync = (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => { if (err) reject(err); else resolve(); });
});

// Inicializar BD y exportar promesa lista
db.ready = (async () => {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await db.execAsync(schema);
    const row = await db.getAsync('SELECT COUNT(*) as n FROM doughs');
    if (row.n === 0) {
        const datos = fs.readFileSync(DATOS_PATH, 'utf8');
        await db.execAsync(datos);
        console.log('Base de datos inicializada con datos maestros.');
    }
    console.log('Base de datos lista:', DB_PATH);
    return db;
})();

module.exports = db;