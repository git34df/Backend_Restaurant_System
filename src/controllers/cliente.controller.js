const clienteService = require('../services/cliente.service');

exports.listarClientes = async (req, res) => {
  try {
    const clientes = await clienteService.listarClientes();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar clientes' });
  }
};

exports.buscarPorDocumento = async (req, res) => {
  try {
    const clientes = await clienteService.buscarPorDocumento(req.query.documento);
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ message: 'Error en búsqueda' });
  }
};

exports.crearCliente = async (req, res) => {
  try {
    const { nombre_cliente, documento_identidad } = req.body;
    if (!nombre_cliente || !documento_identidad) {
      return res.status(400).json({ message: 'Nombre y documento son obligatorios' });
    }
    const cliente = await clienteService.crearCliente(req.body);
    res.status(201).json(cliente);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un cliente con ese documento' });
    }
    res.status(500).json({ message: 'Error al crear cliente' });
  }
};