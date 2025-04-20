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

app.get('/categorias-con-productos', (req, res) => {
  const sql = `
    SELECT
      categorias.id AS categoria_id,
      categorias.nombre AS categoria_nombre,
      productos.id AS producto_id,
      productos.nombre AS producto_nombre,
      productos.precio
    FROM categorias
    LEFT JOIN productos ON categorias.id = productos.categoria_id
    ORDER BY categorias.id;
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener los datos' });
    }

    const categoriasMap = new Map();

    results.forEach(row => {
      if (!categoriasMap.has(row.categoria_id)) {
        categoriasMap.set(row.categoria_id, {
          id: row.categoria_id,
          nombre: row.categoria_nombre,
          productos: []
        });
      }

      if (row.producto_id) {
        categoriasMap.get(row.categoria_id).productos.push({
          id: row.producto_id,
          nombre: row.producto_nombre,
          precio: row.precio
        });
      }
    });

    res.json(Array.from(categoriasMap.values()));
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
