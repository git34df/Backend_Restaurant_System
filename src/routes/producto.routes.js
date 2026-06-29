const express = require('express');
const r = express.Router();
const c = require('../controllers/producto.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

r.use(verificarToken);

r.get('/disponibles',  c.listarDisponibles);
r.get('/categorias',   c.listarCategorias);
r.get('/',             soloRoles('Administrador'), c.listarProductos);
r.post('/',            soloRoles('Administrador'), c.crearProducto);
r.put('/:id',          soloRoles('Administrador'), c.editarProducto);
r.patch('/:id/estado', soloRoles('Administrador'), c.cambiarEstado);

module.exports = r;