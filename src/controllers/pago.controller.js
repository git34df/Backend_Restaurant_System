const pagoService = require('../services/pago.service');

exports.registrar = async (req, res) => {
  try {
    const { id_comprobante, metodos } = req.body;
    if (!id_comprobante || !metodos || metodos.length === 0)
      return res.status(400).json({ message: 'id_comprobante y metodos son obligatorios' });
    const result = await pagoService.registrarPago({ id_comprobante, metodos });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.porComprobante = async (req, res) => {
  try {
    const pago = await pagoService.obtenerPagoPorComprobante(req.params.idComprobante);
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado' });
    res.json(pago);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener pago' });
  }
};