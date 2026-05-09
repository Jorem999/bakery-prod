// server.js - Servidor principal Bakery App
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/db/database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/doughs',          require('./src/routes/doughs'));
app.use('/api/products',        require('./src/routes/products'));
app.use('/api/production',     require('./src/routes/production'));
app.use('/api/ingredients',     require('./src/routes/ingredients'));
app.use('/api/indirect-costs',  require('./src/routes/indirect-costs'));
app.use('/api/scan',            require('./src/routes/scan'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Esperar a que la BD este lista antes de abrir el servidor
db.ready.then(() => {
    app.listen(PORT, () => {
        console.log('');
        console.log('  Bakery App corriendo en: http://localhost:' + PORT);
        console.log('');
    });
}).catch(err => {
    console.error('Error iniciando la base de datos:', err);
    process.exit(1);
});