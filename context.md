# Bakery App - Contexto del Proyecto

## Información General

- **Proyecto**: Panadería artesanal de masa madre en Ambato, Ecuador
- **Dueño**: Planifica la producción
- **Panadero**: Ejecuta y registra
- **Objetivo**: Digitalizar el proceso de producción diaria

---

## Flujo de Producción (3 Momentos)

| Momento | Estado | Descripción |
|---------|--------|-------------|
| Planificación | `planning` | Definir unidades a producir |
| Producción | `produced` | Registrar unidades reales |
| Cierre | `closed` | Registrar ventas y sobrantes |

**Stock inicial**: Solo viene del día calendario anterior inmediato
- Lunes ← Viernes
- Martes a Sábado ← Día anterior
- Domingo no se trabaja

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Node.js v24 + Express |
| Base de datos | SQLite (archivo local) |
| Frontend | HTML + CSS + JavaScript vanilla |
| Puerto | localhost:3000 |

---

## Estructura del Proyecto

```
bakery-app/
├── backend/
│   ├── server.js              # Punto de entrada
│   └── src/
│       ├── db/database.js     # Conexión SQLite
│       └── routes/
│           ├── doughs.js         # GET /api/doughs
│           ├── products.js       # GET /api/products
│           ├── production.js     # Todas las rutas de producción
│           ├── ingredients.js    # GET /api/ingredients
│           └── indirect-costs.js # GET /api/indirect-costs
├── frontend/
│   ├── index.html             # SPA con sidebar
│   ├── css/style.css
│   └── js/app.js
├── sql/
│   ├── schema.sql
│   └── datos_maestros.sql
├── data/bakery.db
└── context.md
```

### Ejecutar
```bash
cd backend && node server.js
# Abrir: http://localhost:3000
```

---

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/doughs | Listar masas activas |
| GET | /api/doughs/:id/products | Productos de una masa |
| GET | /api/products | Listar productos |
| GET | /api/production | Últimos 30 días |
| GET | /api/production/:date | Día completo |
| GET | /api/production/:date/leftovers | Sobrantes día anterior |
| POST | /api/production | Crear día |
| POST | /api/production/:date/dough | Agregar/actualizar masa |
| POST | /api/production/dough/:id/item | Agregar/actualizar item |
| PUT | /api/production/:date/status | Cambiar estado |
| GET | /api/production/:date/report | Reporte del día |
| GET | /api/production/:date/suggest | Sugerencias histórico |
| GET | /api/ingredients | Lista ingredientes |
| GET | /api/indirect-costs | Costos indirectos |

### Campos de production_item
- `qty_initial` - Stock inicial (sobrante día anterior)
- `qty_planned` - Unidades planificadas
- `qty_produced` - Unidades producidas
- `qty_sold` - Unidades vendidas
- `notes` - Notas

---

## Modelo de Datos

### Tablas activas
```sql
production_days    (id, prod_date, notes, status)
production_doughs  (id, production_day_id, dough_id, mass_produced_g)
production_items   (id, production_dough_id, product_id, qty_planned, qty_produced, qty_sold, qty_initial, notes)
doughs             (id, code, name, unit_weight_g, sort_order, active)
products           (id, code, dough_id, name, weight_g, sale_price, active)
ingredients        (id, code, name, unit, price_per_unit, stock, min_stock, active)
indirect_costs     (id, name, monthly_amount, active)
```

### Tablas pendientes
```sql
dough_recipes, product_extra_ingredients, purchases, daily_orders, adjustment_factors
```

---

## Datos Maestros

### Masas Base (9)
| Código | Nombre | Peso (g) | Orden |
|--------|--------|:--------:|:-----:|
| BG1 | Baguette | 310 | 1 |
| BO1 | Bollito | 60 | 2 |
| CA1 | Campesino | 750 | 3 |
| DU1 | Dulce | 60 | 4 |
| IN1 | Integral | 435 | 5 |
| NE1 | Negra | 435 | 6 |
| OR1 | Orégano | 435 | 7 |
| SE1 | Semilla | 460 | 8 |
| FO1 | Focaccia | 750 | 9 |

### Productos (21)
| Código | Masa | Nombre | g | $ |
|--------|------|--------|:-:|:-:|
| BG-BAG | BG1 | Baguette | 310 | 1.40 |
| BG-MIN | BG1 | Mini Baguette | 110 | 0.60 |
| BO-BOL | BO1 | Bollito | 60 | 0.25 |
| BO-MOL | BO1 | Molde Brioche | 500 | 2.20 |
| BO-HAM | BO1 | Hamburguesa Bollito | 80 | 0.60 |
| BO-BRI | BO1 | Palanqueta Brioche | 80 | 0.60 |
| CA-CAM | CA1 | Campesino | 750 | 3.00 |
| CA-MED | CA1 | Medio Campesino | 375 | 1.60 |
| CA-PAN | CA1 | Panecook | 250 | 1.10 |
| DU-DUL | DU1 | Dulce | 60 | 0.30 |
| FO-POR | FO1 | Focaccia Porción | 190 | 1.80 |
| FO-COM | FO1 | Focaccia Completa | 750 | 7.20 |
| IN-INT | IN1 | Integral | 435 | 2.00 |
| NE-NEG | NE1 | Negra | 435 | 2.25 |
| NE-MIN | NE1 | Mini Negra | 80 | 0.40 |
| OR-ORE | OR1 | Orégano | 450 | 2.00 |
| OR-MIN | OR1 | Mini Orégano | 80 | 0.40 |
| OR-TOC | OR1 | Tocino | 450 | 2.25 |
| OR-MTO | OR1 | Medio Tocino | 225 | 1.35 |
| SE-SEM | SE1 | Semilla | 470 | 2.60 |
| SE-MED | SE1 | Media Semilla | 235 | 1.40 |

### Ingredientes
| Ingrediente | $/g |
|-------------|:---:|
| Harina | 0.00084 |
| Agua | 0.00000 |
| Masa madre | 0.00042 |
| Levadura | 0.00488 |
| Sal | 0.00049 |
| Grasa/Manteca | 0.002267 |
| Mantequilla | 0.004000 |
| Huevo | 0.002111 |
| Leche | 0.000800 |
| Azúcar | 0.000799 |
| Harina Integral | 0.001000 |
| Orégano | 0.006608 |
| Tocino | 0.014500 |

### Costos Indirectos
- Arriendo: $350/mes
- Luz: $65/mes

---

## Interfaz de Usuario (v4)

### Layout
- **Sidebar izquierdo**: Lista de días con registro (scrollable)
- **Panel derecho**: Producción del día seleccionado

### Funcionalidades
- Seleccionar día de la lista → ver su producción
- Crear nuevos días
- Reabrir días cerrados para corregir errores
- Editar: stock inicial, planificado, producido, vendido, sobrante
- Vendido y sobrante se sincronizan automáticamente
- Botón "Cargar sobrantes día anterior" en estado planning

---

## Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 06/04/2026 | Layout sidebar: lista de días a la izquierda, producción del día seleccionado a la derecha |
| 06/04/2026 | Reabrir días cerrados para edición (botón "Reabrir para editar") |
| 06/04/2026 | Editar vendido y sobrante con sincronización automática |
| 06/04/2026 | Stock inicial solo del día calendario anterior (no más de un día) |
| 06/04/2026 | Botón para cargar sobrantes del día anterior |
| 06/04/2026 | Inputs editables para stock inicial |
| 06/04/2026 | Rutas nuevas: /api/ingredients, /api/indirect-costs |

---

## Próximos Pasos

- [ ] Módulo de costos: calcular costo unitario por producto
- [ ] Poblar histórico con datos reales de producción
- [ ] Mejorar Maestros: formularios de edición
- [ ] Reportes: rango de fechas, productos más vendidos
- [ ] Pedidos del día integrados en sugerencias
- [ ] Dashboard con gráficos de tendencias
- [ ] Alertas de stock mínimo de ingredientes
