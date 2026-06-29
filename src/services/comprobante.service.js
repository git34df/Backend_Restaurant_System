const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Obtener siguiente correlativo para la serie
const siguienteCorrelativo = async (serie) => {
  const [row] = await query(
    `SELECT COALESCE(MAX(numero_correlativo), 0) + 1 AS siguiente
     FROM comprobante WHERE serie = ?`,
    [serie]
  );
  return row.siguiente;
};

// Emitir comprobante (boleta o factura)
exports.emitirComprobante = async ({ id_pedido, id_cliente, tipo_comprobante, ruc_dni }) => {
  // Verificar que el pedido esté listo o entregado
  const [pedido] = await query(
    `SELECT * FROM pedido WHERE id_pedido = ?`, [id_pedido]
  );
  if (!pedido) throw new Error('Pedido no encontrado');
  if (!['listo', 'entregado'].includes(pedido.estado_pedido))
    throw new Error('El pedido debe estar en estado listo o entregado');

  // Verificar que no tenga ya un comprobante emitido
  const existe = await query(
    `SELECT id_comprobante FROM comprobante WHERE id_pedido = ? AND estado = 'emitido'`,
    [id_pedido]
  );
  if (existe.length > 0) throw new Error('Este pedido ya tiene un comprobante emitido');

  const serie = tipo_comprobante === 'boleta' ? 'B001' : 'F001';
  const numero_correlativo = await siguienteCorrelativo(serie);

  const result = await query(
    `INSERT INTO comprobante
       (id_pedido, id_cliente, tipo_comprobante, serie, numero_correlativo,
        ruc_dni, subtotal, igv, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_pedido, id_cliente, tipo_comprobante,
      serie, numero_correlativo, ruc_dni,
      pedido.subtotal_general, pedido.igv, pedido.total
    ]
  );

  const [comp] = await query(
    `SELECT c.*, cl.nombre_cliente FROM comprobante c
     JOIN cliente cl ON cl.id_cliente = c.id_cliente
     WHERE c.id_comprobante = ?`,
    [result.insertId]
  );
  return comp;
};

// Listar comprobantes
exports.listarComprobantes = () =>
  query(`
    SELECT c.*, cl.nombre_cliente, p.estado_pedido
    FROM comprobante c
    JOIN cliente cl ON cl.id_cliente = c.id_cliente
    JOIN pedido  p  ON p.id_pedido   = c.id_pedido
    ORDER BY c.fecha_emision DESC
  `);

// Obtener comprobante por pedido
exports.obtenerPorPedido = async (id_pedido) => {
  const [comp] = await query(
    `SELECT c.*, cl.nombre_cliente FROM comprobante c
     JOIN cliente cl ON cl.id_cliente = c.id_cliente
     WHERE c.id_pedido = ?`,
    [id_pedido]
  );
  return comp || null;
};