const dotenvPath =
  process.env.NODE_ENV === "production" ? ".env" : ".env.local";
require("dotenv").config({ path: dotenvPath });
console.log(` Cargando variables desde: ${dotenvPath}`);

//importacion de dependencias
const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const app = express();
const PORT = process.env.PORT || 3000;
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(cors());

app.use(express.json());

// Conexión a la base de datos MySQL usando pool (Railway/producción y local)
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
console.log("Pool de conexiones MySQL configurado correctamente.");

cloudinary.config({
  cloud_name: "dgrbuffr8",
  api_key: "572925214642911",
  api_secret: "oi7jRU7yVlSKmPrjNi-bA55KZnk",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Zero11",
    allowed_formats: ["jpg", "png", "jpeg", "avif", "webp"],
  },
});

const upload = multer({ storage: storage });

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
app.get("/categorias-con-productos", (req, res) => {
  const sqlCategorias = "SELECT * FROM categorias";
  const sqlProductos = "SELECT * FROM productos";

  connection.query(sqlCategorias, (errCategorias, categorias) => {
    if (errCategorias) {
      return res
        .status(500)
        .json({ success: false, message: "Error al obtener categorias" });
    }

    connection.query(sqlProductos, (errProductos, productos) => {
      if (errProductos) {
        return res
          .status(500)
          .json({ success: false, message: "Error al obtener productos" });
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
              categoria_id: producto.categoria_id,
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
      res.status(201).json({
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
      return res
        .status(500)
        .json({ success: false, message: "Error al actualizar producto" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    res
      .status(200)
      .json({ success: true, message: "Producto actualizado correctamente" });
  });
});

//endpoint para obtener todos los locales
app.get("/locales", (req, res) => {
  const sql = "SELECT * FROM locales ORDER BY id";
  connection.query(sql, (err, resultados) => {
    if (err) {
      console.error("Error al obtener locales:", err);
      return res.status(500).json({ error: "Error al obtener locales" });
    }
    res.json(resultados);
  });
});
//claudinay endpoint para subir imagenes
app.post("/upload-imagen-evento", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se ha subido ninguna imagen" });
  }
  res.json({ url: req.file.path });
});

//endpoint para obtener todos los eventos
app.post("/eventos", (req, res) => {
  const { titulo, descripcion, fecha, hora, local_id, imagen, es_proximo } =
    req.body;

  if (es_proximo) {
    // Desmarcar el evento anterior marcado como próximo
    const desmarcar =
      "UPDATE eventos SET es_proximo = false WHERE es_proximo = true";
    connection.query(desmarcar, (err) => {
      if (err) {
        console.error("Error al desmarcar eventos anteriores:", err);
        return res
          .status(500)
          .json({ error: "Error al actualizar eventos anteriores" });
      }
      insertarEvento();
    });
  } else {
    insertarEvento();
  }

  function insertarEvento() {
    const sql = `
      INSERT INTO eventos (titulo, descripcion, fecha, hora, local_id, imagen, es_proximo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [
      titulo,
      descripcion,
      fecha,
      hora,
      local_id,
      imagen,
      es_proximo,
    ];

    connection.query(sql, valores, (err, result) => {
      if (err) {
        console.error("Error al insertar evento:", err);
        return res.status(500).json({ error: "Error al guardar el evento" });
      }
      res
        .status(201)
        .json({ success: true, message: "Evento guardado correctamente" });
    });
  }
});
// Obtener todos los eventos (ordenados por fecha descendente)
app.get("/eventos", (req, res) => {
  const sql = "SELECT * FROM eventos ORDER BY fecha ASC";
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener eventos" });
    res.json(results);
  });
});

// Obtener el próximo evento (solo el que tenga es_proximo = true)
app.get("/eventos/proximo", (req, res) => {
  const sql = "SELECT * FROM eventos WHERE es_proximo = true LIMIT 1";
  connection.query(sql, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Error al obtener el próximo evento" });
    res.json(results[0]);
  });
});
//eliminar eventos
app.delete("/eventos/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM eventos WHERE id = ?";

  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar evento:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error al eliminar evento" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    res
      .status(200)
      .json({ success: true, message: "Evento eliminado correctamente" });
  });
});
//endpoint para las fotos de la galeria
app.get("/galeria", (req, res) => {
  const sql = "SELECT * FROM galeria ORDER BY fecha_subida DESC";

  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error al obtener galería:", err);
      return res.status(500).json({ error: "Error al obtener imágenes" });
    }

    res.json(results);
  });
});
//endpoint para subir imagenes a la galeria
app.post("/upload-imagen-galeria", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se ha subido ninguna imagen" });
  }

  const url = req.file.path;

  const sql = "INSERT INTO galeria (url) VALUES (?)";
  connection.query(sql, [url], (err, result) => {
    if (err) {
      console.error("Error al guardar URL en la galería:", err);
      return res.status(500).json({ error: "Error al guardar la imagen" });
    }

    res
      .status(201)
      .json({ success: true, message: "Imagen subida correctamente", url });
  });
});

// Eliminar una imagen de la galería por ID
app.delete("/galeria/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM galeria WHERE id = ?";

  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar imagen de galería:", err);
      return res.status(500).json({ error: "Error al eliminar imagen" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    res
      .status(200)
      .json({ success: true, message: "Imagen eliminada correctamente" });
  });
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
