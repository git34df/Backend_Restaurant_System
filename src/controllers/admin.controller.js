const adminService = require('../services/admin.service');

exports.kpisHoy = async (req, res) => {
  try { res.json(await adminService.kpisHoy()); }
  catch (err) { res.status(500).json({ message: 'Error en KPIs' }); }
};

exports.ventasSemanales = async (req, res) => {
  try { res.json(await adminService.ventasSemanales()); }
  catch (err) { res.status(500).json({ message: 'Error en ventas semanales' }); }
};

exports.listarUsuarios = async (req, res) => {
  try { res.json(await adminService.listarUsuarios()); }
  catch (err) { res.status(500).json({ message: 'Error al listar usuarios' }); }
};

exports.toggleUsuario = async (req, res) => {
  try {
    const { activo } = req.body;
    const u = await adminService.toggleUsuario(req.params.id, activo);
    res.json(u);
  } catch (err) { res.status(500).json({ message: 'Error al actualizar usuario' }); }
};

exports.listarProductosAdmin = async (req, res) => {
  try { res.json(await adminService.listarProductosAdmin()); }
  catch (err) { res.status(500).json({ message: 'Error al listar productos' }); }
};