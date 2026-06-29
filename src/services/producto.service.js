const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Listar productos disponibles con categoría
exports.listarProductos = () =>
  query(`
    SELECT
      p.id_producto,
      p.nombre_producto,
      p.descripcion_producto,
      p.precio_producto,
      p.estado_producto,
      c.id_categoria,
      c.nombre_categoria
    FROM producto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY c.nombre_categoria, p.nombre_producto
  `);

// Listar solo disponibles (para que el mozo solo vea lo que puede pedir)
exports.listarDisponibles = () =>
  query(`
    SELECT
      p.id_producto,
      p.nombre_producto,
      p.descripcion_producto,
      p.precio_producto,
      c.nombre_categoria
    FROM producto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.estado_producto = 'disponible'
    ORDER BY c.nombre_categoria, p.nombre_producto
  `);

// Listar categorías
exports.listarCategorias = () =>
  query(`SELECT * FROM categoria WHERE activo = 1 ORDER BY nombre_categoria`);

// Crear producto
exports.crearProducto = async ({ id_categoria, nombre_producto, descripcion_producto, precio_producto }) => {
  const result = await query(
    `INSERT INTO producto (id_categoria, nombre_producto, descripcion_producto, precio_producto)
     VALUES (?, ?, ?, ?)`,
    [id_categoria, nombre_producto, descripcion_producto || null, precio_producto]
  );
  const [producto] = await query(`
    SELECT p.*, c.nombre_categoria FROM producto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.id_producto = ?
  `, [result.insertId]);
  return producto;
};

// Cambiar estado del producto (disponible / no_disponible / agotado)
exports.cambiarEstado = async (id_producto, estado_producto) => {
  const estados = ['disponible', 'no_disponible', 'agotado'];
  if (!estados.includes(estado_producto)) throw new Error('Estado inválido');

  await query(
    `UPDATE producto SET estado_producto = ? WHERE id_producto = ?`,
    [estado_producto, id_producto]
  );
  const [producto] = await query(`SELECT * FROM producto WHERE id_producto = ?`, [id_producto]);
  return producto;
};

exports.editarProducto = async (id_producto, { id_categoria, nombre_producto, descripcion_producto, precio_producto }) => {
  await query(
    `UPDATE producto SET
       id_categoria         = COALESCE(?, id_categoria),
       nombre_producto      = COALESCE(?, nombre_producto),
       descripcion_producto = COALESCE(?, descripcion_producto),
       precio_producto      = COALESCE(?, precio_producto)
     WHERE id_producto = ?`,
    [id_categoria || null, nombre_producto || null, descripcion_producto || null, precio_producto ?? null, id_producto]
  );
  const [producto] = await query(`
    SELECT p.*, c.nombre_categoria FROM producto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.id_producto = ?
  `, [id_producto]);
  return producto;
};