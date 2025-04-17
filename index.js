require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require('mysql2');
const cors = require('cors');

app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'zero11'
});

connection.connect(err => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión a la base de datos MySQL establecida correctamente.');
});

app.get('/productos', (req, res) => {
  connection.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Error al obtener productos' });
    } else {
      res.json(results);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
