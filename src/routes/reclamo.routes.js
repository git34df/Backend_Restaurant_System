const express = require('express');
const r = express.Router();
const c = require('../controllers/reclamo.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

r.use(verificarToken);

// Ver reclamos → Supervisor y Admin
r.get('/',           soloRoles('Supervisor', 'Administrador'), c.listar);
r.get('/pendientes', soloRoles('Supervisor', 'Administrador'), c.listarPendientes);

// Crear reclamo → Mozo, Cajero y Admin
r.post('/', soloRoles('Mozo', 'Cajero', 'Administrador'), c.crear);

// Resolver reclamo → solo Supervisor y Admin
r.patch('/:id/resolver', soloRoles('Supervisor', 'Administrador'), c.resolver);

module.exports = r;