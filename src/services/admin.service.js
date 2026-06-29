const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// KPIs del día
exports.kpisHoy = async () => {
  const hoy = new Date().toISOString().slice(0, 10);

  const [[ventas]]    = await Promise.all([
    query(`SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(total),0) AS ingresos_brutos, COALESCE(SUM(igv),0) AS igv_total
           FROM pedido WHERE DATE(fecha_hora) = ? AND estado_pedido != 'anulado'`, [hoy])
  ]);

  const [[anulados]]  = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM pedido WHERE DATE(fecha_hora) = ? AND estado_pedido = 'anulado'`, [hoy])
  ]);

  const [[reclamos]]  = await Promise.all([
    query(`SELECT COUNT(*) AS pendientes FROM reclamo WHERE estado_reclamo IN ('solicitado','en_revision')`)
  ]);

  const topProductos  = await query(`
    SELECT pr.nombre_producto, SUM(dp.cantidad) AS unidades, SUM(dp.subtotal) AS ingresos
    FROM detalle_pedido dp
    JOIN producto pr ON pr.id_producto = dp.id_producto
    JOIN pedido   p  ON p.id_pedido   = dp.id_pedido
    WHERE DATE(p.fecha_hora) = ? AND p.estado_pedido != 'anulado'
    GROUP BY pr.id_producto ORDER BY unidades DESC LIMIT 5
  `, [hoy]);

  return {
    hoy,
    total_pedidos:   ventas.total_pedidos,
    ingresos_brutos: ventas.ingresos_brutos,
    igv_total:       ventas.igv_total,
    pedidos_anulados: anulados.total,
    reclamos_pendientes: reclamos.pendientes,
    top_productos: topProductos,
  };
};

// Ventas de los últimos 7 días
exports.ventasSemanales = () =>
  query(`
    SELECT DATE(fecha_hora) AS fecha,
           COUNT(*) AS pedidos,
           COALESCE(SUM(total),0) AS total
    FROM pedido
    WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND estado_pedido != 'anulado'
    GROUP BY DATE(fecha_hora)
    ORDER BY fecha ASC
  `);

// Listar usuarios con empleado y rol
exports.listarUsuarios = () =>
  query(`
    SELECT u.id_usuario, u.username, u.activo, u.ultimo_acceso,
           e.nombre_empleado, e.cargo_empleado, e.email,
           r.nombre_rol
    FROM usuario u
    JOIN empleado e ON e.id_empleado = u.id_empleado
    JOIN rol      r ON r.id_rol      = u.id_rol
    ORDER BY u.id_usuario DESC
  `);

// Activar / desactivar usuario
exports.toggleUsuario = async (id_usuario, activo) => {
  await query(`UPDATE usuario SET activo = ? WHERE id_usuario = ?`, [activo, id_usuario]);
  const [u] = await query(`SELECT * FROM usuario WHERE id_usuario = ?`, [id_usuario]);
  return u;
};

// Listar todos los productos con categoría y estado
exports.listarProductosAdmin = () =>
  query(`
    SELECT p.*, c.nombre_categoria
    FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY c.nombre_categoria, p.nombre_producto
  `);