
require('dotenv').config();

//importacion de dependencias
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');


app.use(cors());

app.use(express.json());

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'zero11'
});

// Verificamos que la conexión se haya realizado correctamente
connection.connect(err => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión a la base de datos MySQL establecida correctamente.');
});

//ebdpoint para obtener todos los productos
app.get('/productos', (req, res) => {
  connection.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Error al obtener productos' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint para obtener productos por categoría
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
    ORDER BY categorias.id, productos.id DESC;
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

//endpoint login de admin
app.post('/login-admin', (req, res) => {
  const { usuario, password } = req.body;

  const sql = 'SELECT * FROM admin WHERE usuario = ?';
  connection.query(sql, [usuario], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const admin = results[0];
    //libreria para encriptar la contraseña
    bcrypt.compare(password, admin.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Error al verificar la contraseña' });

      if (isMatch) {
        res.json({ success: true, message: 'Login correcto' });
      } else {
        res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      }
    });
  });
});

// Endpoint para añadir un nuevo producto a la bd
app.post('/productos', (req, res) => {
  const { nombre, precio, categoria_id } = req.body;

  const sql = 'INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)';
  const values = [nombre, precio, categoria_id];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al insertar producto:', err);
      res.status(500).json({ success: false, message: 'Error al insertar producto' });
    } else {
      res.status(201).json({ success: true, message: 'Producto añadido correctamente', productoId: result.insertId });
    }
  });
});

//endpoint obtener todas las categorias(para desplegable)
app.get('/categorias', (req, res) => {
  connection.query('SELECT * FROM categorias', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener categorías' });
    }
    res.json(results);
  });
});

// endpoint para eliminar producto por ID
app.delete('/productos/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'DELETE FROM productos WHERE id = ?';

  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      res.status(500).json({ success: false, message: 'Error al eliminar producto' });
    } else {
      res.status(200).json({ success: true, message: 'Producto eliminado correctamente' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
