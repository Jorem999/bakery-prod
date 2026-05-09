// js/app.js - Bakery App v4 (sidebar + editar dias cerrados)
const API = 'http://localhost:3001/api';

let diasDisponibles = [];
let diaSeleccionado = null;
let productosPorMasa = {};

// ===================== NAVEGACION =====================
function showPage(page) {
    ['produccion','reporte','maestros','scan'].forEach(p => {
        document.getElementById('page-' + p).classList.add('hidden');
    });
    document.getElementById('page-' + page).classList.remove('hidden');
    document.querySelectorAll('nav a').forEach((a, i) => {
        a.classList.remove('active');
    });
    document.querySelectorAll('nav a').forEach(a => {
        if (a.textContent.toLowerCase().includes(page === 'scan' ? 'escanear' : page)) {
            a.classList.add('active');
        }
    });
    if (page === 'produccion') cargarListaDias();
    if (page === 'reporte') cargarListaDiasReporte();
    if (page === 'maestros') {
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.menu-item').classList.add('active');
        showMasterPanel('masas');
    }
}

function hoy() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
}

// ===================== LISTA DE DIAS =====================
async function cargarListaDias() {
    const r = await fetch(`${API}/production`);
    diasDisponibles = await r.json();
    renderListaDias('lista-dias');
}

async function cargarListaDiasReporte() {
    const r = await fetch(`${API}/production`);
    diasDisponibles = await r.json();
    renderListaDias('lista-dias-reporte');
}

function renderListaDias(containerId) {
    const container = document.getElementById(containerId);
    if (!diasDisponibles || diasDisponibles.length === 0) {
        container.innerHTML = '<p style="padding:12px;font-size:0.8rem;color:#999">Sin registros</p>';
        return;
    }
    container.innerHTML = diasDisponibles.map(d => `
        <div class="day-item ${diaSeleccionado?.prod_date === d.prod_date ? 'active' : ''}" 
             onclick="seleccionarDia('${d.prod_date}')">
            <span class="day-date">${formatDate(d.prod_date)}</span>
            <span class="day-status badge-${d.status}">${labelStatus(d.status)}</span>
        </div>
    `).join('');
}

function labelStatus(status) {
    return { planning: 'Planif.', produced: 'En prod.', closed: 'Cerrado' }[status] || status;
}

function puedeEditar(status) {
    return status === 'planning' || status === 'produced';
}

// ===================== SELECCION DE DIA =====================
async function seleccionarDia(fecha) {
    const r = await fetch(`${API}/production/${fecha}`);
    diaSeleccionado = await r.json();
    
    if (document.getElementById('lista-dias')) {
        renderListaDias('lista-dias');
        renderProduccion();
    }
    if (document.getElementById('lista-dias-reporte')) {
        renderListaDias('lista-dias-reporte');
        renderReporte();
    }
}

async function crearNuevoDia() {
    const fecha = prompt('Ingresa la fecha (YYYY-MM-DD):', hoy());
    if (!fecha) return;
    const r = await fetch(`${API}/production`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prod_date: fecha })
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error); return; }
    await cargarListaDias();
    await seleccionarDia(fecha);
}

// ===================== RENDER PRODUCCION =====================
async function renderProduccion() {
    const container = document.getElementById('panel-dia');
    if (!diaSeleccionado) {
        container.innerHTML = '<div class="card empty-state"><p>Selecciona un dia de la lista</p></div>';
        return;
    }
    
    if (!diaSeleccionado.doughs || diaSeleccionado.doughs.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="row" style="justify-content:space-between;align-items:center">
                    <div>
                        <h2>${formatDate(diaSeleccionado.prod_date)}</h2>
                        <span class="badge badge-${diaSeleccionado.status}">${labelStatus(diaSeleccionado.status)}</span>
                    </div>
                    <button class="btn btn-primary" onclick="inicializarProduccion()">Iniciar produccion</button>
                </div>
            </div>
            <div class="card empty-state"><p>Este dia aun no tiene productos. Haz clic en "Iniciar produccion" para comenzar.</p></div>
        `;
        return;
    }
    
    const [masas, productos] = await Promise.all([
        fetch(`${API}/doughs`).then(r => r.json()),
        fetch(`${API}/products`).then(r => r.json())
    ]);
    productosPorMasa = {};
    masas.forEach(m => { productosPorMasa[m.id] = { masa: m, productos: [] }; });
    productos.forEach(p => { if (productosPorMasa[p.dough_id]) productosPorMasa[p.dough_id].productos.push(p); });
    
    const edit = puedeEditar(diaSeleccionado.status);
    let html = `
        <div class="card">
            <div class="row" style="justify-content:space-between;align-items:center">
                <div>
                    <h2 style="margin-bottom:4px">${formatDate(diaSeleccionado.prod_date)}</h2>
                    <span class="badge badge-${diaSeleccionado.status}">${labelStatus(diaSeleccionado.status)}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    ${diaSeleccionado.status === 'planning' ? 
                        '<button class="btn btn-sm" style="background:#f5d9b8;color:#6b3f1a" onclick="cargarSobrantes()">Cargar sobrantes dia anterior</button>' : ''}
                    ${diaSeleccionado.status === 'closed' ? 
                        '<button class="btn btn-warn" onclick="reabrirDia()">Reabrir para editar</button>' : ''}
                    ${diaSeleccionado.status === 'planning' ? 
                        '<button class="btn btn-info" onclick="marcarProducido()">Marcar como producido</button>' : ''}
                    ${diaSeleccionado.status === 'produced' ? 
                        '<button class="btn btn-success" onclick="cerrarDia()">Cerrar dia</button>' : ''}
                    ${edit ? '<button class="btn btn-primary" onclick="guardarTodo()">Guardar cambios</button>' : ''}
                </div>
            </div>
        </div>
    `;
    
    diaSeleccionado.doughs.forEach(pd => {
        const prods = productosPorMasa[pd.dough_id]?.productos || [];
        if (prods.length === 0) return;
        
        html += `<div class="card"><table>
            <tr class="masa-header"><td colspan="7">${pd.dough_name}</td></tr>
            <tr><th>Producto</th><th>Stock ini.</th><th>Planif.</th><th>Producido</th><th>Masa (g)</th><th>Vendido</th><th>Sobrante</th></tr>`;
        
        prods.forEach(p => {
            const item = pd.items.find(i => i.product_id == p.id) || {};
            const ini  = item.qty_initial || 0;
            const plan = item.qty_planned || '';
            const prod = item.qty_produced ?? '';
            const sold = item.qty_sold ?? '';
            const disp = ini + (parseInt(prod) || 0);
            const sobrante = disp - (parseInt(sold) || 0);
            const rowId = `row-${pd.id}-${p.id}`;
            
            html += `<tr id="${rowId}" data-disp="${disp}">
                <td>${p.name}</td>
                <td>${edit ? `<input type="number" class="qty qty-initial" min="0" value="${ini}" 
                    data-dough-id="${pd.id}" data-product-id="${p.id}" data-field="qty_initial"
                    onchange="actualizarStockInicial('${rowId}', this)" style="background:#fff8e1">` : ini}</td>
                <td>${plan}</td>
                <td>${edit ? `<input type="number" class="qty qty-prod" min="0" value="${prod}" 
                    data-dough-id="${pd.id}" data-product-id="${p.id}" data-field="qty_produced"
                    onchange="actualizarDisponibles('${rowId}', this)">` : prod}</td>
                <td>${edit ? `<input type="number" class="qty" min="0" value="${pd.mass_produced_g || ''}" 
                    data-dough-row-id="${pd.id}" data-field="mass_produced_g" style="width:80px">` : (pd.mass_produced_g || '-')}</td>
                <td>${edit ? `<input type="number" class="qty qty-sold" min="0" value="${sold}"
                    data-dough-id="${pd.id}" data-product-id="${p.id}" data-field="qty_sold"
                    onchange="actualizarSobrante('${rowId}', this)">` : sold}</td>
                <td>${edit ? `<input type="number" class="qty qty-sobrante" min="0" value="${sobrante}"
                    data-dough-id="${pd.id}" data-product-id="${p.id}" data-field="qty_sold"
                    onchange="actualizarVendido('${rowId}', this, ${disp})">` : `<span class="${sobrante < 0 ? 'msg-error' : ''}">${sobrante}</span>`}</td>
            </tr>`;
        });
        html += '</table></div>';
    });
    
    container.innerHTML = html;
}

function actualizarSobrante(rowId, inpVendido) {
    const tr = document.getElementById(rowId);
    const disp = parseInt(tr.dataset.disp) || 0;
    const vendido = parseInt(inpVendido.value) || 0;
    const sobrante = disp - vendido;
    const inpSobrante = tr.querySelector('.qty-sobrante');
    if (inpSobrante) inpSobrante.value = Math.max(0, sobrante);
}

function actualizarVendido(rowId, inpSobrante, disp) {
    const tr = document.getElementById(rowId);
    const sobrante = parseInt(inpSobrante.value) || 0;
    const vendido = disp - sobrante;
    const inpVendido = tr.querySelector('.qty-sold');
    if (inpVendido) inpVendido.value = Math.max(0, vendido);
}

function actualizarDisponibles(rowId, inpProd) {
    const tr = document.getElementById(rowId);
    const ini = parseInt(tr.cells[1].textContent) || 0;
    const prod = parseInt(inpProd.value) || 0;
    const disp = ini + prod;
    tr.dataset.disp = disp;
    const inpSold = tr.querySelector('.qty-sold');
    const inpSobrante = tr.querySelector('.qty-sobrante');
    if (inpSold && inpSobrante) {
        const vendido = parseInt(inpSold.value) || 0;
        const nuevoSobrante = Math.max(0, disp - vendido);
        inpSobrante.value = nuevoSobrante;
    }
}

function actualizarStockInicial(rowId, inp) {
    const tr = document.getElementById(rowId);
    const ini = parseInt(inp.value) || 0;
    const prodInp = tr.querySelector('.qty-prod');
    const prod = parseInt(prodInp?.value) || 0;
    const disp = ini + prod;
    tr.dataset.disp = disp;
    const inpSold = tr.querySelector('.qty-sold');
    const inpSobrante = tr.querySelector('.qty-sobrante');
    if (inpSold && inpSobrante) {
        const vendido = parseInt(inpSold.value) || 0;
        inpSobrante.value = Math.max(0, disp - vendido);
    }
}

async function cargarSobrantes() {
    if (!diaSeleccionado) return;
    const fecha = diaSeleccionado.prod_date;
    const r = await fetch(`${API}/production/${fecha}/leftovers`);
    const data = await r.json();

    if (!data.leftovers || data.leftovers.length === 0) {
        mostrarMsgGlobal('No hay sobrantes del dia anterior');
        return;
    }

    for (const s of data.leftovers) {
        const inp = document.querySelector(`input.qty-initial[data-product-id="${s.product_id}"]`);
        if (inp) {
            inp.value = s.qty_leftover;
            await fetch(`${API}/production/dough/${inp.dataset.doughId}/item`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ product_id: s.product_id, qty_initial: s.qty_leftover })
            });
        }
    }
    mostrarMsgGlobal(`Sobrantes del ${formatDate(data.date)} cargados (${data.leftovers.length} productos)`);
}

async function inicializarProduccion() {
    if (!diaSeleccionado) return;
    const fecha = diaSeleccionado.prod_date;
    
    const [masas, productos] = await Promise.all([
        fetch(`${API}/doughs`).then(r => r.json()),
        fetch(`${API}/products`).then(r => r.json())
    ]);
    
    productosPorMasa = {};
    masas.forEach(m => { productosPorMasa[m.id] = { masa: m, productos: [] }; });
    productos.forEach(p => { if (productosPorMasa[p.dough_id]) productosPorMasa[p.dough_id].productos.push(p); });
    
    for (const [doughId, data] of Object.entries(productosPorMasa)) {
        await fetch(`${API}/production/${fecha}/dough`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ dough_id: doughId, mass_produced_g: 0 })
        });
    }
    
    await seleccionarDia(fecha);
}

async function guardarTodo() {
    const fecha = diaSeleccionado.prod_date;
    let guardados = 0;
    
    for (const inp of document.querySelectorAll('input[data-field="mass_produced_g"]')) {
        await fetch(`${API}/production/${fecha}/dough`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ dough_id: inp.dataset.doughRowId, mass_produced_g: parseInt(inp.value) || 0 })
        });
    }
    
    for (const inp of document.querySelectorAll('input[data-field="qty_produced"]')) {
        await fetch(`${API}/production/dough/${inp.dataset.doughId}/item`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ product_id: inp.dataset.productId, qty_produced: parseInt(inp.value) || 0 })
        });
        guardados++;
    }
    
    for (const inp of document.querySelectorAll('input.qty-initial')) {
        await fetch(`${API}/production/dough/${inp.dataset.doughId}/item`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ product_id: inp.dataset.productId, qty_initial: parseInt(inp.value) || 0 })
        });
        guardados++;
    }
    
    for (const inp of document.querySelectorAll('input.qty-sold')) {
        await fetch(`${API}/production/dough/${inp.dataset.doughId}/item`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ product_id: inp.dataset.productId, qty_sold: parseInt(inp.value) || 0 })
        });
        guardados++;
    }
    
    mostrarMsgGlobal('Cambios guardados (' + guardados + ' items)');
    await seleccionarDia(fecha);
}

async function marcarProducido() {
    if (!diaSeleccionado) return;
    await fetch(`${API}/production/${diaSeleccionado.prod_date}/status`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status: 'produced' })
    });
    await seleccionarDia(diaSeleccionado.prod_date);
}

async function cerrarDia() {
    if (!diaSeleccionado) return;
    await fetch(`${API}/production/${diaSeleccionado.prod_date}/status`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status: 'closed' })
    });
    mostrarMsgGlobal('Dia cerrado correctamente');
    await seleccionarDia(diaSeleccionado.prod_date);
}

async function reabrirDia() {
    if (!diaSeleccionado) return;
    if (!confirm('Reabrir este dia para editar? El estado volvera a "En produccion".')) return;
    await fetch(`${API}/production/${diaSeleccionado.prod_date}/status`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status: 'produced' })
    });
    mostrarMsgGlobal('Dia reabierto para edicion');
    await seleccionarDia(diaSeleccionado.prod_date);
}

function mostrarMsgGlobal(msg) {
    let msgEl = document.getElementById('msg-global');
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = 'msg-global';
        msgEl.style.cssText = 'position:fixed;top:80px;right:20px;padding:12px 20px;background:#4a7c3f;color:white;border-radius:6px;z-index:1000;font-size:0.9rem;box-shadow:0 2px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(msgEl);
    }
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 2500);
}

// ===================== REPORTE =====================
async function renderReporte() {
    const container = document.getElementById('panel-reporte');
    if (!diaSeleccionado) {
        container.innerHTML = '<div class="card empty-state"><p>Selecciona un dia de la lista</p></div>';
        return;
    }
    
    const r = await fetch(`${API}/production/${diaSeleccionado.prod_date}/report`);
    const data = await r.json();
    
    let html = `
        <div class="card">
            <div class="row" style="justify-content:space-between;align-items:center">
                <div>
                    <h2 style="margin-bottom:4px">${formatDate(diaSeleccionado.prod_date)}</h2>
                    <span class="badge badge-${diaSeleccionado.status}">${labelStatus(diaSeleccionado.status)}</span>
                </div>
            </div>
        </div>
    `;
    
    if (!data.rows || data.rows.length === 0) {
        html += '<div class="card empty-state"><p>No hay datos para este dia</p></div>';
        container.innerHTML = html;
        return;
    }
    
    html += `<div class="card"><table>
        <tr><th>Masa</th><th>Producto</th><th>Stock ini.</th><th>Planif.</th>
            <th>Producido</th><th>Disp.</th><th>Vendido</th><th>Sobrante</th><th>Total $</th></tr>`;
    let masaActual = '';
    data.rows.forEach(row => {
        if (row.masa !== masaActual) {
            html += `<tr class="masa-header"><td colspan="9">${row.masa}</td></tr>`;
            masaActual = row.masa;
        }
        html += `<tr><td></td><td>${row.producto}</td>
            <td class="stock-ini">${row.stock_inicial}</td>
            <td>${row.planificado}</td><td>${row.producido}</td>
            <td class="disponible">${row.disponible}</td>
            <td>${row.vendido}</td><td>${row.sobrante}</td>
            <td>$${row.total_usd}</td></tr>`;
    });
    html += '</table></div>';
    html += `<div class="total-box">Total del dia: $${data.total}</div>`;
    
    container.innerHTML = html;
}

// ===================== MAESTROS =====================
async function showMasterPanel(tipo) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    const container = document.getElementById('master-content');
    
    if (tipo === 'masas') {
        const masas = await fetch(`${API}/doughs`).then(r => r.json());
        container.innerHTML = `
            <div class="card"><h3>Masas base</h3>
                <table><tr><th>Codigo</th><th>Nombre</th><th>Peso unit. (g)</th><th>Orden</th></tr>
                    ${masas.map(m => `<tr><td>${m.code}</td><td>${m.name}</td><td>${m.unit_weight_g}</td><td>${m.sort_order}</td></tr>`).join('')}
                </table>
            </div>`;
    }
    
    if (tipo === 'productos') {
        const productos = await fetch(`${API}/products`).then(r => r.json());
        container.innerHTML = `
            <div class="card"><h3>Productos</h3>
                <table><tr><th>Codigo</th><th>Masa</th><th>Nombre</th><th>Peso (g)</th><th>Precio $</th></tr>
                    ${productos.map(p => `<tr><td>${p.code}</td><td>${p.dough_code}</td><td>${p.name}</td><td>${p.weight_g}</td><td>$${p.sale_price}</td></tr>`).join('')}
                </table>
            </div>`;
    }
    
    if (tipo === 'ingredientes') {
        container.innerHTML = '<div class="card"><p>Cargando ingredientes...</p></div>';
        const r = await fetch(`${API}/ingredients`);
        const ingredientes = await r.json();
        container.innerHTML = `
            <div class="card"><h3>Ingredientes</h3>
                <table><tr><th>Codigo</th><th>Nombre</th><th>Unidad</th><th>Precio/Unidad</th><th>Stock</th></tr>
                    ${ingredientes.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.unit}</td><td>$${i.price_per_unit}</td><td>${i.stock}</td></tr>`).join('')}
                </table>
            </div>`;
    }
    
    if (tipo === 'costos') {
        container.innerHTML = '<div class="card"><p>Cargando costos...</p></div>';
        const r = await fetch(`${API}/indirect-costs`);
        const costos = await r.json();
        container.innerHTML = `
            <div class="card"><h3>Costos indirectos</h3>
                <table><tr><th>Nombre</th><th>Monto mensual $</th></tr>
                    ${costos.map(c => `<tr><td>${c.name}</td><td>$${c.monthly_amount}</td></tr>`).join('')}
                </table>
            </div>`;
    }
}

// ===================== INICIALIZAR =====================
document.addEventListener('DOMContentLoaded', () => {
    cargarListaDias();
});

// ===================== ESCANER / OCR =====================
let scanData = null;

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    document.getElementById('upload-preview').classList.remove('hidden');
    document.getElementById('preview-img').src = URL.createObjectURL(file);
    
    document.querySelector('.upload-area p').textContent = 'Procesando...';
    
    try {
        const res = await fetch(`${API}/scan/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            scanData = data.data;
            renderParsedData(data.data);
            document.getElementById('scan-result').classList.remove('hidden');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('Error al procesar: ' + err.message);
    }
    
    document.querySelector('.upload-area p').textContent = '📷 Click para seleccionar imagen';
});

function renderParsedData(data) {
    const html = `
        <div class="card" style="margin-bottom:1rem">
            <p><strong>Fecha detectada:</strong> ${data.date || 'No detectada'}</p>
        </div>
        <div class="card">
            <h4>Productos</h4>
            <table>
                <tr><th>Producto</th><th>Cantidad</th><th>Original</th></tr>
                ${data.products.map(p => `
                    <tr>
                        <td>${p.productName}</td>
                        <td>${p.qtyPlanned}${p.qtySmall > 0 ? ' + ' + p.qtySmall + 'p' : ''}${p.qtyHalf > 0 ? ' + 1/2' : ''}</td>
                        <td class="text-sm">${p.originalText}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
    document.getElementById('parsed-data').innerHTML = html;
}

async function guardarProduccion() {
    if (!scanData || !scanData.date) {
        alert('No hay datos para guardar');
        return;
    }
    
    try {
        const items = scanData.products.map(p => ({
            product_id: p.productId,
            qty_planned: p.qtyPlanned,
            qty_produced: p.qtyProduced,
            qty_initial: 0
        }));
        
        const res = await fetch(`${API}/production/batch-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prod_date: scanData.date,
                items: items
            })
        });
        
        const data = await res.json();
        
        if (data.day_id) {
            alert('Producción guardada correctamente');
            resetScan();
            showPage('produccion');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('Error al guardar: ' + err.message);
    }
}

function resetScan() {
    scanData = null;
    document.getElementById('file-input').value = '';
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('preview-img').src = '';
}
