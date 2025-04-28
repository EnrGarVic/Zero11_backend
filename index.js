require("dotenv").config();

//importacion de dependencias
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(cors());

app.use(express.json());

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "zero11",
});

// Verificamos que la conexión se haya realizado correctamente
connection.connect((err) => {
  if (err) {
    console.error("Error al conectar con la base de datos:", err);
    return;
  }
  console.log("Conexión a la base de datos MySQL establecida correctamente.");
});

//endpoint para obtener todos los productos
app.get("/productos", (req, res) => {
  connection.query("SELECT * FROM productos", (err, results) => {
    if (err) {
      res.status(500).json({ error: "Error al obtener productos" });
    } else {
      res.json(results);
    }
  });
});

// endpoint para obtener productos por categoría
app.get('/categorias-con-productos', (req, res) => {
  const sqlCategorias = 'SELECT * FROM categorias';
  const sqlProductos = 'SELECT * FROM productos';

  connection.query(sqlCategorias, (errCategorias, categorias) => {
    if (errCategorias) {
      return res.status(500).json({ success: false, message: 'Error al obtener categorias' });
    }

    connection.query(sqlProductos, (errProductos, productos) => {
      if (errProductos) {
        return res.status(500).json({ success: false, message: 'Error al obtener productos' });
      }

      // Agrupar productos dentro de su categoría
      const categoriasConProductos = categorias.map((categoria) => {
        return {
          id: categoria.id,
          nombre: categoria.nombre,
          productos: productos
            .filter((producto) => producto.categoria_id === categoria.id)
            .map((producto) => ({
              id: producto.id,
              nombre: producto.nombre,
              precio: producto.precio,
              categoria_id: producto.categoria_id
            })),
        };
      });

      res.json(categoriasConProductos);
    });
  });
});

//endpoint login de admin
app.post("/login-admin", (req, res) => {
  const { usuario, password } = req.body;

  const sql = "SELECT * FROM admin WHERE usuario = ?";
  connection.query(sql, [usuario], (err, results) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (results.length === 0)
      return res.status(401).json({ error: "Usuario no encontrado" });

    const admin = results[0];
    //libreria para encriptar la contraseña
    bcrypt.compare(password, admin.password, (err, isMatch) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Error al verificar la contraseña" });

      if (isMatch) {
        const token = jwt.sign(
          { id: admin.id, usuario: admin.usuario }, 
          process.env.JWT_SECRET, 
          { expiresIn: "1h" } 
        );
        res.json({ success: true, token: token });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Contraseña incorrecta" });
      }
    });
  });
});

// Endpoint para añadir un nuevo producto a la bd
app.post("/productos", (req, res) => {
  const { nombre, precio, categoria_id } = req.body;

  const sql =
    "INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)";
  const values = [nombre, precio, categoria_id];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error al insertar producto:", err);
      res
        .status(500)
        .json({ success: false, message: "Error al insertar producto" });
    } else {
      res
        .status(201)
        .json({
          success: true,
          message: "Producto añadido correctamente",
          productoId: result.insertId,
        });
    }
  });
});

//endpoint obtener todas las categorias(para desplegable)
app.get("/categorias", (req, res) => {
  connection.query("SELECT * FROM categorias", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error al obtener categorías" });
    }
    res.json(results);
  });
});

// Eliminar producto por ID
app.delete("/productos/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM productos WHERE id = ?";

  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar producto:", err);
      res
        .status(500)
        .json({ success: false, message: "Error al eliminar producto" });
    } else {
      res
        .status(200)
        .json({ success: true, message: "Producto eliminado correctamente" });
    }
  });
});

// Editar producto
app.put("/productos/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, precio, categoria_id } = req.body;

  const sql = `
    UPDATE productos
    SET nombre = ?, precio = ?, categoria_id = ?
    WHERE id = ?
  `;

  const values = [nombre, precio, categoria_id, id];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error al actualizar producto:", err);
      return res.status(500).json({ success: false, message: "Error al actualizar producto" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.status(200).json({ success: true, message: "Producto actualizado correctamente" });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
