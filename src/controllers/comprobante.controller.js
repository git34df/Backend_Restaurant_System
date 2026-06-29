const comprobanteService = require('../services/comprobante.service');

exports.emitir = async (req, res) => {
  try {
    const { id_pedido, id_cliente, tipo_comprobante, ruc_dni } = req.body;
    if (!id_pedido || !id_cliente || !tipo_comprobante || !ruc_dni)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    const comp = await comprobanteService.emitirComprobante(req.body);
    res.status(201).json(comp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const lista = await comprobanteService.listarComprobantes();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar comprobantes' });
  }
};

exports.porPedido = async (req, res) => {
  try {
    const comp = await comprobanteService.obtenerPorPedido(req.params.idPedido);
    if (!comp) return res.status(404).json({ message: 'Sin comprobante' });
    res.json(comp);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener comprobante' });
  }
};