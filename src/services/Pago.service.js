const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Registrar pago completo (crea cabecera + detalles)
exports.registrarPago = async ({ id_comprobante, metodos }) => {
  // metodos: [{ metodo_pago, monto, referencia_voucher }]

  // Obtener total del comprobante
  const [comp] = await query(
    `SELECT * FROM comprobante WHERE id_comprobante = ? AND estado = 'emitido'`,
    [id_comprobante]
  );
  if (!comp) throw new Error('Comprobante no encontrado o anulado');

  const totalPagado = metodos.reduce((acc, m) => acc + Number(m.monto), 0);
  if (totalPagado < Number(comp.total))
    throw new Error(`Monto insuficiente. Total requerido: S/ ${comp.total}`);

  const vuelto = (totalPagado - Number(comp.total)).toFixed(2);

  // Verificar si ya existe un pago para este comprobante
  const existePago = await query(
    `SELECT id_pago FROM pago WHERE id_comprobante = ?`, [id_comprobante]
  );
  if (existePago.length > 0) throw new Error('Este comprobante ya fue pagado');

  // Crear cabecera de pago
  const result = await query(
    `INSERT INTO pago (id_comprobante, monto_total, estado) VALUES (?, ?, 'pagado')`,
    [id_comprobante, comp.total]
  );
  const id_pago = result.insertId;

  // Insertar detalles por método
  for (const m of metodos) {
    await query(
      `INSERT INTO pago_detalle
         (id_pago, metodo_pago, monto, referencia_voucher, validado_cajero)
       VALUES (?, ?, ?, ?, 1)`,
      [id_pago, m.metodo_pago, m.monto, m.referencia_voucher || null]
    );
  }

  // Marcar pedido como entregado
  await query(
    `UPDATE pedido SET estado_pedido = 'entregado' WHERE id_pedido = ?`,
    [comp.id_pedido]
  );

  const [pago] = await query(
    `SELECT pd.*, p.estado, p.monto_total FROM pago p
     JOIN pago_detalle pd ON pd.id_pago = p.id_pago
     WHERE p.id_pago = ?`,
    [id_pago]
  );

  return { id_pago, total_cobrado: comp.total, total_pagado: totalPagado, vuelto };
};

// Obtener pago por comprobante
exports.obtenerPagoPorComprobante = async (id_comprobante) => {
  const [pago] = await query(
    `SELECT p.* FROM pago p WHERE p.id_comprobante = ?`, [id_comprobante]
  );
  if (!pago) return null;

  const detalles = await query(
    `SELECT * FROM pago_detalle WHERE id_pago = ?`, [pago.id_pago]
  );
  return { ...pago, detalles };
};