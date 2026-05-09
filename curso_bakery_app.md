# Curso: Cómo se construyó la Bakery App
### Aprende desarrollo web full-stack con tu propio proyecto

**Para:** Jorge Moncayo — ex programador de FoxPro que quiere entender el desarrollo web moderno  
**Proyecto:** `D:\Desarrollos\bakery-app`  
**Fecha:** Marzo 2026

---
 
## Índice

1. [La arquitectura — el mapa general](#1-la-arquitectura)
2. [La base de datos — SQLite y el schema](#2-la-base-de-datos)
3. [Node.js y Express — el servidor](#3-nodejs-y-express)
4. [La conexión a la BD — database.js](#4-la-conexión-a-la-bd)
5. [Las rutas — doughs.js y products.js](#5-las-rutas-simples)
6. [Las rutas complejas — production.js](#6-las-rutas-de-producción)
7. [El frontend — HTML, CSS y JavaScript](#7-el-frontend)
8. [Cómo hablan el frontend y el backend — fetch y la API REST](#8-fetch-y-api-rest)
9. [El flujo completo — de un clic a la base de datos](#9-flujo-completo)
10. [Conceptos clave que aprendiste](#10-conceptos-clave)

---

## 1. La Arquitectura

Antes de ver una sola línea de código, entendamos el mapa general. La app tiene **dos partes que se comunican**:

```
┌─────────────────────────────────────────────────────┐
│  TU NAVEGADOR (Chrome, Edge, etc.)                  │
│  frontend/index.html + css/style.css + js/app.js    │
│                                                     │
│  Lo que el usuario VE y con lo que INTERACTÚA       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (peticiones y respuestas)
                       │ http://localhost:3000/api/...
┌──────────────────────▼──────────────────────────────┐
│  SERVIDOR NODE.JS (corre en tu máquina Nonna)       │
│  backend/server.js + routes/ + db/                  │
│                                                     │
│  Procesa peticiones, consulta la BD, devuelve datos │
└──────────────────────┬──────────────────────────────┘
                       │ SQL
┌──────────────────────▼──────────────────────────────┐
│  BASE DE DATOS SQLite                               │
│  backend/data/bakery.db                             │
│                                                     │
│  Guarda y recupera todos los datos                  │
└─────────────────────────────────────────────────────┘
```

**Analogía con FoxPro:** Si vienes de FoxPro, piensa así:
- El **frontend** es como los formularios `.scx` — lo que el usuario ve
- El **backend** es como las funciones y procedimientos `.prg` — la lógica
- La **base de datos SQLite** es como las tablas `.dbf` — los datos

La diferencia clave es que ahora el "formulario" corre en el navegador y habla con el "servidor" a través de la red, aunque estén en la misma máquina.

---

## 2. La Base de Datos

### ¿Qué es SQLite?

SQLite es una base de datos que vive en **un solo archivo** (`bakery.db`). No necesita servidor, no necesita instalación. Es perfecta para aplicaciones locales de 1-2 usuarios como la tuya.

Comparado con lo que conoces:
- FoxPro: un archivo `.dbf` por tabla → SQLite: todas las tablas en un solo archivo `.db`
- HSQLDB (OpenXava): requería arrancar un servidor → SQLite: no requiere nada

### El schema — definiendo las tablas

El archivo `sql/schema.sql` define la estructura de todas las tablas. Veamos las más importantes:

```sql
-- Tabla de masas base
CREATE TABLE IF NOT EXISTS doughs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    unit_weight_g INTEGER NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    active        INTEGER NOT NULL DEFAULT 1
);
```

Traduciendo línea por línea:
- `CREATE TABLE IF NOT EXISTS` — crea la tabla solo si no existe todavía
- `id INTEGER PRIMARY KEY AUTOINCREMENT` — campo autoincrementable, como el RECNO() de FoxPro pero automático
- `TEXT NOT NULL UNIQUE` — texto obligatorio y sin repetidos (como un índice UNIQUE en FoxPro)
- `DEFAULT 0` — valor por defecto si no se especifica
- `active INTEGER` — en SQLite los booleanos son 0 o 1, no TRUE/FALSE

### La jerarquía de producción en tablas

La relación entre tablas refleja exactamente tu hoja de papel:

```
production_days     ← "Miércoles 18/Feb"
    │
    └── production_doughs    ← "Masa Orégano — 4785g"
            │
            └── production_items    ← "Tocino: plan=3, prod=3, vend=3, ini=0"
```

Esto se llama **relación uno a muchos**: un día tiene muchas masas, y cada masa tiene muchos ítems.

En SQL se expresa con **FOREIGN KEY** (clave foránea):

```sql
CREATE TABLE IF NOT EXISTS production_doughs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    production_day_id INTEGER NOT NULL,   -- ← apunta al día padre
    dough_id          INTEGER NOT NULL,   -- ← apunta a la masa
    mass_produced_g   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (production_day_id) REFERENCES production_days(id),
    FOREIGN KEY (dough_id) REFERENCES doughs(id)
);
```

`FOREIGN KEY` es como decir: "el valor de `production_day_id` debe existir en la tabla `production_days`". Es la integridad referencial que FoxPro gestionaba con SET RELATION.

### El campo qty_initial — sobrantes del día anterior

```sql
CREATE TABLE IF NOT EXISTS production_items (
    ...
    qty_planned  INTEGER NOT NULL DEFAULT 0,  -- lo que se pidió producir
    qty_produced INTEGER NOT NULL DEFAULT 0,  -- lo que realmente salió
    qty_sold     INTEGER NOT NULL DEFAULT 0,  -- lo que se vendió
    qty_initial  INTEGER NOT NULL DEFAULT 0,  -- sobrante del día anterior
    ...
);
```

La lógica de negocio que captura esto:
- **Disponible** = `qty_initial + qty_produced`
- **Sobrante** = `qty_initial + qty_produced - qty_sold`

---

## 3. Node.js y Express

### ¿Qué es Node.js?

Node.js es un entorno que permite ejecutar JavaScript fuera del navegador, directamente en el sistema operativo. Es lo que hace posible que tu servidor esté escrito en JavaScript.

Cuando ejecutas `node server.js`, estás diciéndole a Node.js: "ejecuta este archivo JavaScript como un programa".

### ¿Qué es Express?

Express es una librería que simplifica la creación de servidores web en Node.js. Sin Express tendrías que escribir mucho código manual para manejar peticiones HTTP. Con Express es mucho más simple.

### El archivo server.js — el punto de entrada

```javascript
const express = require('express');   // importar Express
const cors    = require('cors');      // importar CORS
const path    = require('path');      // importar manejo de rutas de archivos
const db      = require('./src/db/database');  // importar nuestra BD

const app  = express();  // crear la aplicación
const PORT = 3000;       // puerto donde escuchará
```

**`require()`** es la forma de importar módulos en Node.js. Es como `#INCLUDE` en FoxPro o `import` en Java. Los módulos pueden ser:
- Librerías instaladas con npm (como `express`, `cors`, `sqlite3`)
- Archivos propios del proyecto (como `./src/db/database`)

```javascript
app.use(cors());                  // permitir peticiones desde el navegador
app.use(express.json());          // poder leer JSON en las peticiones
app.use(express.static(...));     // servir archivos estáticos (HTML, CSS, JS)
```

**`app.use()`** registra "middleware" — código que se ejecuta en cada petición antes de llegar a la ruta. Piénsalo como interceptores.

- **CORS** (Cross-Origin Resource Sharing): El navegador por seguridad bloquea peticiones entre dominios distintos. CORS le dice "está bien, permite esta petición".
- **express.json()**: Convierte automáticamente el cuerpo JSON de las peticiones en objetos JavaScript.
- **express.static()**: Cuando el navegador pide `http://localhost:3000/`, Node.js devuelve el `index.html` directamente.

```javascript
// Registrar las rutas
app.use('/api/doughs',     require('./src/routes/doughs'));
app.use('/api/products',   require('./src/routes/products'));
app.use('/api/production', require('./src/routes/production'));
```

Esto dice: "cualquier petición que empiece con `/api/doughs` será manejada por el archivo `doughs.js`". Es como un `DO CASE` por URL.

```javascript
// Esperar a que la BD esté lista ANTES de abrir el puerto
db.ready.then(() => {
    app.listen(PORT, () => {
        console.log('Bakery App corriendo en: http://localhost:' + PORT);
    });
});
```

`db.ready` es una **Promise** (promesa) — el servidor espera a que la base de datos esté inicializada antes de empezar a aceptar peticiones. Si abriera el puerto antes, las primeras peticiones fallarían porque la BD no estaría lista.

---

## 4. La Conexión a la BD

El archivo `src/db/database.js` es el "puente" entre el servidor y SQLite.

### Abrir la conexión

```javascript
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(DB_PATH);
```

`.verbose()` activa mensajes de depuración más detallados. `new sqlite3.Database(ruta)` abre (o crea) el archivo `.db`.

### El problema del callback hell

La librería `sqlite3` originalmente usa **callbacks** — funciones que se ejecutan cuando la operación termina:

```javascript
// Estilo antiguo con callbacks (difícil de leer)
db.all('SELECT * FROM doughs', [], function(err, rows) {
    if (err) {
        console.error(err);
        return;
    }
    // hacer algo con rows...
    db.get('SELECT...', [], function(err2, row) {
        // código anidado, difícil de seguir
    });
});
```

Esto se llama **callback hell** — código anidado que se vuelve muy difícil de leer. La solución moderna son las **Promises** y **async/await**.

### Los helpers asíncronos — la solución elegante

```javascript
db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});
```

Esto "envuelve" la función de callback en una Promise. Ahora podemos escribir:

```javascript
// Estilo moderno con async/await (fácil de leer)
const rows = await db.allAsync('SELECT * FROM doughs');
// rows ya tiene los datos, sin anidamiento
```

**`async/await`** es azúcar sintáctica sobre Promises. `await` pausa la ejecución hasta que la Promise se resuelve, sin bloquear el servidor. Es como si el código esperara el resultado, pero en realidad Node.js puede atender otras peticiones mientras espera.

Los cuatro helpers que creamos:
- `db.allAsync(sql, params)` → devuelve **todas** las filas como array
- `db.getAsync(sql, params)` → devuelve **una** fila (la primera)
- `db.runAsync(sql, params)` → ejecuta INSERT/UPDATE/DELETE, devuelve `{lastID, changes}`
- `db.execAsync(sql)` → ejecuta múltiples sentencias SQL de una vez

### Inicialización automática

```javascript
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
})();
```

- `PRAGMA foreign_keys = ON` — activa la verificación de claves foráneas (en SQLite está desactivada por defecto)
- `PRAGMA journal_mode = WAL` — modo de escritura más eficiente y seguro
- Lee el `schema.sql` y lo ejecuta (las tablas ya tienen `IF NOT EXISTS`, así que si ya existen no pasa nada)
- Cuenta los registros en `doughs` — si hay 0, es la primera vez que arranca y carga los datos maestros

---

## 5. Las Rutas Simples

### ¿Qué es una ruta?

Una ruta asocia una **URL + método HTTP** con una función que la procesa. Los métodos HTTP principales son:
- **GET** — pedir datos (leer)
- **POST** — enviar datos nuevos (crear)
- **PUT** — actualizar datos existentes
- **DELETE** — eliminar datos

Es como los verbos del idioma HTTP.

### doughs.js — las masas base

```javascript
const express = require('express');
const router  = express.Router();   // mini-aplicación Express para agrupar rutas
const db      = require('../db/database');

// GET /api/doughs
router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync(
            'SELECT * FROM doughs WHERE active=1 ORDER BY sort_order'
        );
        res.json(rows);  // devolver los datos como JSON
    } catch(e) {
        res.status(500).json({ error: e.message });  // si hay error, devolver el error
    }
});
```

Desglosando:
- `router.get('/', ...)` — cuando alguien hace `GET /api/doughs/` ejecuta esta función
- `async (req, res)` — función asíncrona que recibe la **request** (petición) y la **response** (respuesta)
- `req` contiene todo lo que el cliente envió (URL, parámetros, cuerpo, etc.)
- `res` es el objeto con el que devolvemos la respuesta
- `res.json(rows)` — convierte el array JavaScript a texto JSON y lo envía con status 200
- `try/catch` — manejo de errores: si algo falla, devuelve un error 500

```javascript
// GET /api/doughs/3/products  (productos de la masa con id=3)
router.get('/:id/products', async (req, res) => {
    try {
        const rows = await db.allAsync(
            'SELECT * FROM products WHERE dough_id=? AND active=1 ORDER BY name',
            [req.params.id]   // ← el :id de la URL llega aquí
        );
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
```

`:id` en la ruta es un **parámetro dinámico**. Si la URL es `/api/doughs/3/products`, entonces `req.params.id` vale `"3"`.

El `?` en el SQL es un **placeholder** — evita la inyección SQL. Nunca construyas SQL concatenando strings directamente. El array `[req.params.id]` pasa los valores seguros por separado.

---

## 6. Las Rutas de Producción

`production.js` es el archivo más complejo, con toda la lógica de negocio. Veamos las más interesantes:

### Crear un día nuevo

```javascript
// POST /api/production
router.post('/', async (req, res) => {
    const { prod_date, notes } = req.body;  // extraer datos del cuerpo JSON
    try {
        const result = await db.runAsync(
            'INSERT INTO production_days (prod_date, notes, status) VALUES (?, ?, ?)',
            [prod_date, notes || '', 'planning']
        );
        res.json({ id: result.lastID, prod_date, status: 'planning' });
    } catch(e) {
        res.status(400).json({ error: 'Ya existe un registro para esa fecha.' });
    }
});
```

- `req.body` contiene el JSON que envió el navegador (habilitado por `express.json()`)
- `const { prod_date, notes } = req.body` — **destructuring**: extrae propiedades del objeto en variables
- `notes || ''` — si `notes` es `undefined` o `null`, usa string vacío
- `result.lastID` — el ID autogenerado del registro insertado
- Si la inserción falla (por la restricción UNIQUE en prod_date), el catch devuelve un error 400

### Obtener el día completo con jerarquía anidada

Esta es la ruta más interesante — construye un objeto JavaScript anidado desde 3 tablas:

```javascript
// GET /api/production/2026-02-18
router.get('/:date', async (req, res) => {
    try {
        // 1. Obtener el día
        const day = await db.getAsync(
            'SELECT * FROM production_days WHERE prod_date=?',
            [req.params.date]
        );
        if (!day) return res.json(null);  // si no existe, devolver null

        // 2. Obtener las masas del día
        const doughs = await db.allAsync(`
            SELECT pd.*, d.name as dough_name, d.code as dough_code
            FROM production_doughs pd
            JOIN doughs d ON pd.dough_id = d.id
            WHERE pd.production_day_id=?
            ORDER BY d.sort_order
        `, [day.id]);

        // 3. Para cada masa, obtener sus ítems
        for (const dough of doughs) {
            dough.items = await db.allAsync(`
                SELECT pi.*, p.name as product_name, p.sale_price,
                       (pi.qty_initial + pi.qty_produced) as qty_available,
                       (pi.qty_initial + pi.qty_produced - pi.qty_sold) as qty_leftover
                FROM production_items pi
                JOIN products p ON pi.product_id = p.id
                WHERE pi.production_dough_id=?
                ORDER BY p.name
            `, [dough.id]);
        }

        // 4. Anidar las masas dentro del día y devolver
        day.doughs = doughs;
        res.json(day);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
```

El resultado es un objeto JSON así:
```json
{
  "id": 1,
  "prod_date": "2026-02-18",
  "status": "planning",
  "doughs": [
    {
      "id": 1,
      "dough_name": "Baguette",
      "mass_produced_g": 3720,
      "items": [
        { "product_name": "Baguette", "qty_planned": 12, "qty_produced": 12, ... },
        { "product_name": "Mini Baguette", "qty_planned": 3, ... }
      ]
    },
    ...
  ]
}
```

Nota el `JOIN` en el SQL: en lugar de hacer consultas separadas para cada tabla, une los datos en una sola consulta. `pd.*` trae todos los campos de `production_doughs`, y `d.name as dough_name` trae el nombre de la masa con un alias.

### Los sobrantes — leftovers

```javascript
// GET /api/production/2026-02-19/leftovers
router.get('/:date/leftovers', async (req, res) => {
    try {
        // Buscar el día anterior MÁS CERCANO que esté cerrado
        const prevDay = await db.getAsync(`
            SELECT * FROM production_days
            WHERE prod_date < ? AND status = 'closed'
            ORDER BY prod_date DESC LIMIT 1
        `, [req.params.date]);

        if (!prevDay) return res.json([]);

        // Traer solo los ítems que tienen sobrante > 0
        const leftovers = await db.allAsync(`
            SELECT p.id as product_id, p.code as product_code,
                   d.id as dough_id, d.code as dough_code, d.sort_order,
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
```

El truco aquí es la condición `WHERE prod_date < ? AND status = 'closed' ORDER BY prod_date DESC LIMIT 1` — busca el día cerrado más reciente antes de la fecha solicitada. No asume que fue "ayer", porque puede haber días sin producción.

### Las sugerencias — el sistema predictivo

```javascript
// GET /api/production/2026-02-25/suggest
router.get('/:date/suggest', async (req, res) => {
    try {
        // Calcular qué día de la semana es la fecha pedida (0=dom, 1=lun... 6=sáb)
        const targetDate = new Date(req.params.date + 'T12:00:00');
        const dayOfWeek  = targetDate.getDay();

        const suggestions = await db.allAsync(`
            SELECT
                p.id as product_id,
                p.code as product_code,
                ROUND(AVG(pi.qty_sold), 0) as avg_sold,  -- promedio de ventas
                COUNT(*) as weeks_data                    -- cuántas semanas hay de datos
            FROM production_days dy
            JOIN production_doughs pdg ON pdg.production_day_id = dy.id
            JOIN production_items pi ON pi.production_dough_id = pdg.id
            JOIN products p ON pi.product_id = p.id
            WHERE dy.prod_date < ?                              -- antes de la fecha pedida
              AND dy.prod_date >= date(?, '-21 days')           -- últimas 3 semanas
              AND CAST(strftime('%w', dy.prod_date) AS INTEGER) = ?  -- mismo día de semana
              AND dy.status = 'closed'                          -- solo días cerrados
            GROUP BY p.id
            ORDER BY d.sort_order, p.name
        `, [req.params.date, req.params.date, dayOfWeek]);

        res.json(suggestions);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
```

La función SQL `strftime('%w', fecha)` devuelve el día de la semana de una fecha como texto ('0'=domingo). El `CAST(...AS INTEGER)` lo convierte a número para compararlo con `dayOfWeek`.

`date(?, '-21 days')` es una función SQLite que resta 21 días a una fecha — así filtramos solo las últimas 3 semanas.

`AVG(pi.qty_sold)` promedia las ventas de ese producto en los días equivalentes encontrados.

---

## 7. El Frontend

El frontend es la parte que el usuario ve. Está compuesto por tres archivos:

### index.html — la estructura

HTML define la **estructura** de la página. Es como el plano de un edificio. Las partes más importantes:

```html
<!-- Navegación -->
<nav>
    <a href="#" class="active" onclick="showPage('produccion')">Produccion</a>
    <a href="#" onclick="showPage('reporte')">Reportes</a>
    <a href="#" onclick="showPage('maestros')">Maestros</a>
</nav>
```

`onclick="showPage('produccion')"` — cuando el usuario hace clic, llama a la función `showPage()` en el JavaScript.

```html
<!-- Las tres páginas, una oculta, solo una visible a la vez -->
<div id="page-produccion">...</div>
<div id="page-reporte" class="hidden">...</div>
<div id="page-maestros" class="hidden">...</div>
```

La clase `hidden` tiene `display: none` en el CSS. Mostrar/ocultar páginas es tan simple como agregar o quitar esa clase.

```html
<!-- Botón que llama a una función JS -->
<button class="btn btn-primary" onclick="crearDia()">Nuevo dia</button>

<!-- Contenedor donde el JS inyecta HTML dinámico -->
<div id="tabla-planificacion"></div>
```

### style.css — los estilos

CSS define el **aspecto visual**. La paleta de tonos café:

```css
/* Variables de color implícitas en la paleta */
header  { background: #4a2c0a; }  /* café muy oscuro */
nav     { background: #6b3f1a; }  /* café oscuro */
th      { background: #6b3f1a; }  /* cabeceras de tabla */
tr.masa-header td { background: #f5d9b8; }  /* filas de masa: crema */

/* Botones */
.btn-primary { background: #6b3f1a; color: white; }
.btn-success { background: #4a7c3f; color: white; }  /* verde para guardar */
.btn-info    { background: #8b5e3c; color: white; }  /* café medio */

/* Input de stock inicial con fondo diferente para distinguirlo visualmente */
input.qty-initial {
    background: #fff8e1 !important;  /* amarillo muy suave */
    border-color: #c8a96e !important; /* dorado */
}

/* Clases especiales para datos importantes */
.stock-ini  { color: #a0522d; font-weight: 600; }  /* naranja café */
.disponible { font-weight: 700; color: #4a2c0a; }  /* café oscuro negrita */
```

El sistema de clases para los botones (`.btn`, `.btn-primary`, `.btn-sm`) permite reutilizar estilos. Un botón pequeño y primario sería `class="btn btn-primary btn-sm"`.

---

## 8. Fetch y la API REST

### ¿Qué es REST?

REST es una convención para diseñar APIs web. Define que las URLs representen **recursos** (cosas) y los métodos HTTP representen **acciones**:

| Acción | Método | URL | Descripción |
|--------|--------|-----|-------------|
| Leer todos | GET | /api/doughs | Listar masas |
| Leer uno | GET | /api/production/2026-02-18 | Leer el día 18/2 |
| Crear | POST | /api/production | Crear nuevo día |
| Actualizar | PUT | /api/production/2026-02-18/status | Cambiar estado |

### fetch() — cómo el frontend habla con el backend

`fetch()` es la función nativa de JavaScript para hacer peticiones HTTP desde el navegador:

```javascript
// GET simple — solo pedir datos
const r    = await fetch('http://localhost:3000/api/doughs');
const data = await r.json();  // convertir la respuesta de texto JSON a objeto JS
// data es ahora un array de masas
```

```javascript
// POST — enviar datos al servidor
const r = await fetch('http://localhost:3000/api/production', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prod_date: '2026-02-18', notes: '' })
});
const data = await r.json();
```

`JSON.stringify()` convierte un objeto JavaScript a texto JSON para enviarlo. `r.json()` hace lo inverso al recibirlo.

### El ciclo completo de una petición

Cuando el usuario hace clic en "Nuevo día":

```
1. Usuario hace clic en "Nuevo dia"
2. El navegador ejecuta: crearDia()
3. crearDia() llama: fetch('/api/production', { method: 'POST', body: {...} })
4. La petición viaja por HTTP a Node.js en el puerto 3000
5. Express la recibe y la enruta a production.js router.post('/')
6. El handler ejecuta: db.runAsync('INSERT INTO production_days...')
7. SQLite inserta el registro y devuelve el nuevo ID
8. El handler responde: res.json({ id: 1, prod_date: '2026-02-18', status: 'planning' })
9. La respuesta viaja de vuelta al navegador
10. fetch() recibe la respuesta
11. crearDia() llama: cargarDia() para refrescar la pantalla
12. cargarDia() hace otro fetch() para traer el día recién creado
13. La pantalla se actualiza con los nuevos datos
```

Todo esto ocurre en milisegundos.

---

## 9. Flujo Completo — de un clic a la BD

Vamos a seguir exactamente qué pasa cuando el usuario carga los sobrantes del día anterior:

### Paso 1: Clic en "Cargar sobrantes del día anterior"

```html
<button onclick="cargarSobrantes()">Cargar sobrantes del dia anterior</button>
```

### Paso 2: Se ejecuta cargarSobrantes() en app.js

```javascript
async function cargarSobrantes() {
    const fecha = document.getElementById('prod-date').value;  // ej: "2026-02-19"

    // Pedir los sobrantes al servidor
    const r    = await fetch(`${API}/production/${fecha}/leftovers`);
    const data = await r.json();
    // data = { date: "2026-02-18", leftovers: [ {product_code: "OR-TOC", qty_leftover: 2}, ... ] }

    if (!data.leftovers || data.leftovers.length === 0) {
        mostrarMsg('msg-plan', 'No hay sobrantes del dia anterior.', false);
        return;
    }

    // Para cada sobrante, buscar el input correspondiente y llenarlo
    data.leftovers.forEach(s => {
        const inp = document.querySelector(`input.qty-initial[data-product-code="${s.product_code}"]`);
        if (inp) inp.value = s.qty_leftover;
    });

    mostrarMsg('msg-plan', `Sobrantes del ${data.date} cargados.`, false);
}
```

`document.querySelector()` es como `THISFORM.txtCantidad` en FoxPro — busca un elemento en la página por su selector CSS. El selector `input.qty-initial[data-product-code="OR-TOC"]` significa: "el input con clase `qty-initial` y atributo `data-product-code` igual a `OR-TOC`".

### Paso 3: La petición llega a production.js

```javascript
router.get('/:date/leftovers', async (req, res) => {
    // req.params.date = "2026-02-19"

    const prevDay = await db.getAsync(`
        SELECT * FROM production_days
        WHERE prod_date < '2026-02-19' AND status = 'closed'
        ORDER BY prod_date DESC LIMIT 1
    `);
    // prevDay = { id: 1, prod_date: "2026-02-18", status: "closed" }

    const leftovers = await db.allAsync(`
        SELECT p.code as product_code,
               (pi.qty_initial + pi.qty_produced - pi.qty_sold) as qty_leftover
        FROM production_days dy
        ...
        WHERE dy.id = 1
          AND (pi.qty_initial + pi.qty_produced - pi.qty_sold) > 0
    `);
    // leftovers = [ { product_code: "BO-MOL", qty_leftover: 2 }, { product_code: "FO-POR", qty_leftover: 2 } ]

    res.json({ date: "2026-02-18", leftovers });
});
```

### Paso 4: La respuesta llena los inputs

El JavaScript recorre el array de sobrantes y para cada uno encuentra el input correcto en la tabla y le pone el valor. El usuario ve los números aparecer automáticamente en la columna "Stock inicial".

---

## 10. Conceptos Clave

Aquí un glosario de los conceptos más importantes que usamos:

| Concepto | Qué es | Analogía FoxPro |
|----------|--------|-----------------|
| **Node.js** | Entorno para ejecutar JS fuera del navegador | Como el runtime de VFP |
| **Express** | Framework para crear servidores web | Como las librerías de VFP |
| **npm** | Gestor de paquetes (instala librerías) | Como el setup de instaladores |
| **package.json** | Lista de dependencias del proyecto | Como el registro de librerías |
| **require()** | Importar un módulo | Como `#INCLUDE` o `SET PROCEDURE TO` |
| **async/await** | Manejar operaciones asíncronas | No tiene equivalente directo |
| **Promise** | Valor que llegará en el futuro | No tiene equivalente directo |
| **JSON** | Formato de datos texto | Como los strings de FoxPro pero estructurado |
| **fetch()** | Petición HTTP desde el navegador | Como `INET` o conexiones HTTP de FoxPro |
| **REST API** | Convención para diseñar URLs | Como los endpoints de un servicio web |
| **GET/POST/PUT** | Verbos HTTP | Leer / Crear / Actualizar |
| **req.params** | Parámetros en la URL | Como parámetros de funciones |
| **req.body** | Datos enviados en la petición | Como el contenido de un formulario |
| **res.json()** | Devolver datos al cliente | Como el RETURN de una función |
| **SQL JOIN** | Unir tablas en una consulta | Como SET RELATION en FoxPro |
| **FOREIGN KEY** | Clave foránea, integridad referencial | Como SET RELATION con integridad |
| **try/catch** | Manejo de errores | Como `ON ERROR` en FoxPro |
| **const/let** | Declarar variables | Como `LOCAL` en FoxPro |
| **Arrow function** | `(x) => x + 1` — función corta | Como una función lambda |
| **Destructuring** | `const {a, b} = obj` — extraer propiedades | Como `SCATTER NAME` en FoxPro |
| **Template literal** | `` `Hola ${nombre}` `` — strings con variables | Como `"Hola " + nombre` pero más claro |

---

## Próximos pasos de aprendizaje

Ahora que entiendes cómo está construida la app, los próximos pasos naturales son:

1. **Modificar una ruta existente** — por ejemplo, agregar un campo nuevo a la respuesta del reporte
2. **Crear una ruta nueva** — por ejemplo, un endpoint para el total de ventas del mes
3. **Mejorar el frontend** — por ejemplo, agregar un gráfico de ventas por semana
4. **Implementar el módulo de costos** — ya tienes las tablas diseñadas, solo falta la lógica
5. **Aprender Kotlin** — la misma arquitectura (API REST + frontend) funciona con un backend en Kotlin/Spring Boot

La buena noticia es que toda esta arquitectura — servidor HTTP, API REST, base de datos relacional, frontend con fetch — es universal. Lo que aprendiste aquí aplica a cualquier lenguaje moderno.

---

*Documento generado el 20/03/2026 — Bakery App v2*
