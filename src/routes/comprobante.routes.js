const express = require('express');
const r = express.Router();
const c = require('../controllers/comprobante.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');
 
r.use(verificarToken);
 
r.get('/',           soloRoles('Cajero', 'Administrador'),            c.listar);
r.post('/',          soloRoles('Cajero', 'Administrador'),            c.emitir);
r.get('/pedido/:idPedido', soloRoles('Cajero', 'Administrador', 'Supervisor'), c.porPedido);
 
module.exports = r;
 