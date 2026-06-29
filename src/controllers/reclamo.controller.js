const reclamoService = require('../services/reclamo.service');

exports.listar = async (req, res) => {
  try {
    const lista = await reclamoService.listarReclamos();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar reclamos' });
  }
};

exports.listarPendientes = async (req, res) => {
  try {
    const lista = await reclamoService.listarPendientes();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar reclamos pendientes' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { id_pedido, id_cliente, id_empleado_solicitante, motivo } = req.body;
    if (!id_pedido || !id_cliente || !id_empleado_solicitante || !motivo)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    const reclamo = await reclamoService.crearReclamo(req.body);
    res.status(201).json(reclamo);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear reclamo' });
  }
};

exports.resolver = async (req, res) => {
  try {
    const { id_supervisor, estado_reclamo, comentario_resolucion, metodo_devolucion } = req.body;
    if (!id_supervisor || !estado_reclamo || !comentario_resolucion)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    const reclamo = await reclamoService.resolverReclamo({
      id_reclamo: req.params.id,
      id_supervisor,
      estado_reclamo,
      comentario_resolucion,
      metodo_devolucion
    });
    res.json(reclamo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};