const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

const recalcularSubtotal = (id_pedido) =>
  query(
    `UPDATE pedido
     SET subtotal_general = (
       SELECT COALESCE(SUM(subtotal), 0)
       FROM detalle_pedido
       WHERE id_pedido = ?
     )
     WHERE id_pedido = ?`,
    [id_pedido, id_pedido]
  );

// Listar todos los pedidos
exports.listarPedidos = () =>
  query(`
    SELECT
      p.id_pedido,
      p.fecha_hora,
      p.estado_pedido,
      p.tipo_pedido,
      p.subtotal_general,
      p.igv,
      p.total,
      p.notas_pedido,
      c.nombre_cliente,
      c.documento_identidad,
      c.id_cliente,
      e.nombre_empleado
    FROM pedido p
    JOIN cliente  c ON c.id_cliente  = p.id_cliente
    JOIN empleado e ON e.id_empleado = p.id_empleado
    ORDER BY p.fecha_hora DESC
  `);

// Obtener un pedido con su detalle completo
exports.obtenerPedidoPorId = async (id_pedido) => {
  const [pedido] = await query(`
    SELECT
      p.*,
      c.nombre_cliente, c.documento_identidad, c.tipo_documento, c.id_cliente,
      e.nombre_empleado
    FROM pedido p
    JOIN cliente  c ON c.id_cliente  = p.id_cliente
    JOIN empleado e ON e.id_empleado = p.id_empleado
    WHERE p.id_pedido = ?
  `, [id_pedido]);

  if (!pedido) return null;

  const detalles = await query(`
    SELECT
      dp.id_detalle_pedido,
      dp.cantidad,
      dp.precio_unitario,
      dp.subtotal,
      dp.notas_especiales,
      pr.nombre_producto,
      pr.id_producto
    FROM detalle_pedido dp
    JOIN producto pr ON pr.id_producto = dp.id_producto
    WHERE dp.id_pedido = ?
  `, [id_pedido]);

  return { ...pedido, detalles };
};

// Crear pedido + detalles
exports.crearPedido = async ({ id_cliente, id_empleado, notas_pedido, tipo_pedido, items }) => {
  const result = await query(
    `INSERT INTO pedido (id_cliente, id_empleado, notas_pedido, tipo_pedido, subtotal_general)
     VALUES (?, ?, ?, ?, 0)`,
    [id_cliente, id_empleado, notas_pedido || null, tipo_pedido || 'salon']
  );
  const id_pedido = result.insertId;

  for (const item of items) {
    await query(
      `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, notas_especiales)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pedido, item.id_producto, item.cantidad, item.precio_unitario, item.notas_especiales || null]
    );
  }

  await recalcularSubtotal(id_pedido);
  return exports.obtenerPedidoPorId(id_pedido);
};

// Cambiar estado del pedido
exports.cambiarEstado = async (id_pedido, estado_pedido) => {
  const estados = ['registrado', 'en_preparacion', 'listo', 'entregado', 'anulado'];
  if (!estados.includes(estado_pedido)) throw new Error('Estado inválido');
  await query(
    `UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?`,
    [estado_pedido, id_pedido]
  );
  return exports.obtenerPedidoPorId(id_pedido);
};

// Agregar un item a un pedido existente
exports.agregarItem = async (id_pedido, { id_producto, cantidad, precio_unitario, notas_especiales }) => {
  await query(
    `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, notas_especiales)
     VALUES (?, ?, ?, ?, ?)`,
    [id_pedido, id_producto, cantidad, precio_unitario, notas_especiales || null]
  );
  await recalcularSubtotal(id_pedido);
  return exports.obtenerPedidoPorId(id_pedido);
};

// Eliminar un item del detalle
exports.eliminarItem = async (id_pedido, id_detalle_pedido) => {
  await query(
    `DELETE FROM detalle_pedido WHERE id_detalle_pedido = ? AND id_pedido = ?`,
    [id_detalle_pedido, id_pedido]
  );
  await recalcularSubtotal(id_pedido);
  return exports.obtenerPedidoPorId(id_pedido);
};