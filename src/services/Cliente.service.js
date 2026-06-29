const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Listar todos los clientes
exports.listarClientes = () =>
  query(`SELECT * FROM cliente ORDER BY nombre_cliente ASC`);

// Buscar por documento (para autocompletar en formulario)
exports.buscarPorDocumento = (documento) =>
  query(
    `SELECT * FROM cliente WHERE documento_identidad LIKE ?`,
    [`%${documento}%`]
  );

// Crear cliente
exports.crearCliente = async ({ nombre_cliente, telefono_cliente, email_cliente, tipo_documento, documento_identidad }) => {
  const result = await query(
    `INSERT INTO cliente (nombre_cliente, telefono_cliente, email_cliente, tipo_documento, documento_identidad)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre_cliente, telefono_cliente || null, email_cliente || null, tipo_documento || 'DNI', documento_identidad]
  );
  const [cliente] = await query(`SELECT * FROM cliente WHERE id_cliente = ?`, [result.insertId]);
  return cliente;
};