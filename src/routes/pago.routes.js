const express = require('express');
const r = express.Router();
const c = require('../controllers/pago.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');
 
r.use(verificarToken);
 
r.post('/',                    soloRoles('Cajero', 'Administrador'),            c.registrar);
r.get('/comprobante/:idComprobante', soloRoles('Cajero', 'Administrador', 'Supervisor'), c.porComprobante);
 
module.exports = r;