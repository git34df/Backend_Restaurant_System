const express = require('express');
const router  = express.Router();
const pedidoController              = require('../controllers/pedido.controller');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

// Todas las rutas requieren token válido
router.use(verificarToken);

// Listar y ver detalle → cualquier empleado autenticado
router.get('/',    pedidoController.listarPedidos);
router.get('/:id', pedidoController.obtenerPedido);

// Crear pedido → Mozo y Admin
router.post('/', soloRoles('Mozo', 'Administrador'), pedidoController.crearPedido);

// Cambiar estado → Mozo, Cocinero, Cajero, Admin
router.patch('/:id/estado',
  soloRoles('Mozo', 'Cocinero', 'Cajero', 'Repartidor', 'Administrador'),
  pedidoController.cambiarEstado
);

// Agregar / quitar ítems → Mozo y Admin
router.post('/:id/items',
  soloRoles('Mozo', 'Administrador'),
  pedidoController.agregarItem
);
router.delete('/:id/items/:idDetalle',
  soloRoles('Mozo', 'Administrador'),
  pedidoController.eliminarItem
);

module.exports = router;