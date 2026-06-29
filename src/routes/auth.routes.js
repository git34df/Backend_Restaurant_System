const express = require('express');
const router  = express.Router();
const authController                = require('../controllers/auth.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

// Login → público (sin token)
router.post('/login', authController.login);

// Registro → protegido, solo Admin puede crear usuarios
router.post('/register',
  verificarToken,
  soloRoles('Administrador'),
  authController.register
);

module.exports = router;

// Listar roles → solo Admin (para el formulario de crear usuario)
router.get('/roles',
  verificarToken,
  soloRoles('Administrador'),
  (req, res) => {
    const db = require('../config/db');
    db.query('SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol', (err, rows) => {
      if (err) return res.status(500).json({ message: 'Error al obtener roles' });
      res.json(rows);
    });
  }
);