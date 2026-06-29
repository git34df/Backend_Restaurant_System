const express = require('express');
const r = express.Router();
const c = require('../controllers/admin.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

r.use(verificarToken);
r.use(soloRoles('Administrador')); // Todo admin requiere rol Admin

r.get('/kpis',                  c.kpisHoy);
r.get('/ventas-semanales',      c.ventasSemanales);
r.get('/usuarios',              c.listarUsuarios);
r.patch('/usuarios/:id/toggle', c.toggleUsuario);
r.get('/productos',             c.listarProductosAdmin);

module.exports = r;