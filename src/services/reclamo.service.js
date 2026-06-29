const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Listar todos los reclamos
exports.listarReclamos = () =>
  query(`
    SELECT
      r.*,
      c.nombre_cliente,
      e.nombre_empleado  AS solicitado_por,
      s.nombre_empleado  AS aprobado_por
    FROM reclamo r
    JOIN cliente  c ON c.id_cliente  = r.id_cliente
    JOIN empleado e ON e.id_empleado = r.id_empleado_solicitante
    LEFT JOIN empleado s ON s.id_empleado = r.id_supervisor_aprobador
    ORDER BY r.fecha_solicitud DESC
  `);

// Listar pendientes (vista de supervisor)
exports.listarPendientes = () =>
  query(`
    SELECT
      r.*,
      c.nombre_cliente,
      e.nombre_empleado AS solicitado_por
    FROM reclamo r
    JOIN cliente  c ON c.id_cliente  = r.id_cliente
    JOIN empleado e ON e.id_empleado = r.id_empleado_solicitante
    WHERE r.estado_reclamo IN ('solicitado','en_revision')
    ORDER BY r.fecha_solicitud ASC
  `);

// Crear reclamo
exports.crearReclamo = async ({ id_pedido, id_cliente, id_empleado_solicitante, motivo, producto_afectado, monto_seleccionado }) => {
  const result = await query(
    `INSERT INTO reclamo
       (id_pedido, id_cliente, id_empleado_solicitante, motivo, producto_afectado, monto_seleccionado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_pedido, id_cliente, id_empleado_solicitante, motivo, producto_afectado || null, monto_seleccionado || 0]
  );
  const [reclamo] = await query(`SELECT * FROM reclamo WHERE id_reclamo = ?`, [result.insertId]);
  return reclamo;
};

// Cambiar estado del reclamo (supervisor)
exports.resolverReclamo = async ({ id_reclamo, id_supervisor, estado_reclamo, comentario_resolucion, metodo_devolucion }) => {
  const estadosValidos = ['en_revision', 'aprobado', 'rechazado', 'reembolsado'];
  if (!estadosValidos.includes(estado_reclamo)) throw new Error('Estado inválido');
  if (!comentario_resolucion) throw new Error('El comentario de resolución es obligatorio');

  await query(
    `UPDATE reclamo SET
       estado_reclamo         = ?,
       id_supervisor_aprobador = ?,
       comentario_resolucion  = ?,
       metodo_devolucion      = ?,
       fecha_resolucion       = NOW()
     WHERE id_reclamo = ?`,
    [estado_reclamo, id_supervisor, comentario_resolucion, metodo_devolucion || null, id_reclamo]
  );

  const [reclamo] = await query(`SELECT * FROM reclamo WHERE id_reclamo = ?`, [id_reclamo]);
  return reclamo;
};