const pedidoService = require('../services/pedido.service');

exports.listarPedidos = async (req, res) => {
  try {
    const pedidos = await pedidoService.listarPedidos();
    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar pedidos' });
  }
};

exports.obtenerPedido = async (req, res) => {
  try {
    const pedido = await pedidoService.obtenerPedidoPorId(req.params.id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener pedido' });
  }
};

exports.crearPedido = async (req, res) => {
  try {
    const { id_cliente, id_empleado, notas_pedido, tipo_pedido, items } = req.body;

    if (!id_cliente || !id_empleado || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (id_cliente, id_empleado, items)' });
    }

    const pedido = await pedidoService.crearPedido({ id_cliente, id_empleado, notas_pedido, tipo_pedido, items });
    res.status(201).json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear pedido' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { estado_pedido } = req.body;
    if (!estado_pedido) return res.status(400).json({ message: 'Estado requerido' });

    const pedido = await pedidoService.cambiarEstado(req.params.id, estado_pedido);
    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Error al cambiar estado' });
  }
};

exports.agregarItem = async (req, res) => {
  try {
    const { id_producto, cantidad, precio_unitario, notas_especiales } = req.body;
    if (!id_producto || !cantidad || !precio_unitario) {
      return res.status(400).json({ message: 'Faltan campos del item' });
    }
    const pedido = await pedidoService.agregarItem(req.params.id, { id_producto, cantidad, precio_unitario, notas_especiales });
    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al agregar item' });
  }
};

exports.eliminarItem = async (req, res) => {
  try {
    const pedido = await pedidoService.eliminarItem(req.params.id, req.params.idDetalle);
    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar item' });
  }
};