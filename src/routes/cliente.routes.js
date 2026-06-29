const express = require('express');
const r = express.Router();
const c = require('../controllers/cliente.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');
 
r.use(verificarToken);
 
r.get('/buscar', soloRoles('Mozo', 'Cajero', 'Administrador'), c.buscarPorDocumento);
r.post('/',      soloRoles('Mozo', 'Cajero', 'Administrador'), c.crearCliente);
r.get('/',       soloRoles('Administrador'),                   c.listarClientes);
 
module.exports = r;
 