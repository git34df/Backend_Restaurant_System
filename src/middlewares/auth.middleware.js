const jwt = require('jsonwebtoken');

// id_rol de la tabla `rol` en la BD
const ROLES = {
  Administrador: 1,
  Supervisor:    2,
  Cajero:        3,
  Mozo:          4,
  Cocinero:      5,
  Repartidor:    6,
};

// ─── Verifica que el token JWT sea válido ──────────────────────────────────
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado: token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // { id, rol (id_rol) }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// ─── Fábrica: permite solo los roles indicados ────────────────────────────
// Uso: soloRoles('Administrador', 'Supervisor')
const soloRoles = (...rolesPermitidos) => {
  const idsPermitidos = rolesPermitidos.map(nombre => ROLES[nombre]);
  return (req, res, next) => {
    if (!idsPermitidos.includes(req.usuario?.rol)) {
      return res.status(403).json({
        message: `Acceso denegado: se requiere rol ${rolesPermitidos.join(' o ')}`
      });
    }
    next();
  };
};

module.exports = { verificarToken, soloRoles, ROLES };