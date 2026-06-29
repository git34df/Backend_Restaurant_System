const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (data) => {
  const {
    nombre,
    cargo,
    telefono,
    email,
    username,
    password,
    rol_id
  } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  return new Promise((resolve, reject) => {

    // 🔹 1. Insertar empleado
    db.query(
      `INSERT INTO empleado 
      (nombre_empleado, cargo_empleado, telefono, email, fecha_ingreso)
      VALUES (?, ?, ?, ?, NOW())`,
      [nombre, cargo, telefono, email],
      (err, resultEmpleado) => {

        if (err) return reject(err);

        const id_empleado = resultEmpleado.insertId;

        // 🔹 2. Insertar usuario
        db.query(
          `INSERT INTO usuario 
          (id_empleado, id_rol, username, password_hash)
          VALUES (?, ?, ?, ?)`,
          [id_empleado, rol_id, username, hashedPassword],
          (err, resultUsuario) => {

            if (err) return reject(err);

            resolve({
              message: 'Usuario creado correctamente',
              empleado_id: id_empleado,
              usuario_id: resultUsuario.insertId
            });
          }
        );
      }
    );
  });
};

exports.login = async (username, password) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM usuario WHERE username = ?`,
      [username],
      async (err, result) => {
        if (err) return reject(err);

        if (result.length === 0) {
          return resolve(false);
        }

        const user = result[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
          return resolve(false);
        }

        // 🔐 GENERAR TOKEN
        const token = jwt.sign(
          {
            id: user.id_usuario, // 👈 usa el nombre correcto
            rol: user.id_rol
          },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        resolve({
          message: 'Login exitoso',
          token: token, // 👈 ESTO TE FALTABA
          user: {
            id: user.id_usuario, // 👈 corregido
            username: user.username,
            id_empleado: user.id_empleado,
            id_rol: user.id_rol
          }
        });
      }
    );
  });
};