const authService = require('../services/auth.service');

// 🔐 REGISTRO
exports.register = async (req, res) => {
  try {
    const {
      nombre,
      cargo,
      username,
      password,
      rol_id
    } = req.body;

    if (!nombre || !cargo || !username || !password || !rol_id) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios'
      });
    }

    const result = await authService.register(req.body);

    res.json(result);

  } catch (error) {
    res.status(500).json(error);
  }
};


// 🔐 LOGIN (LO QUE TE FALTABA)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 🔎 Validación básica
    if (!username || !password) {
      return res.status(400).json({
        message: 'Username y password son obligatorios'
      });
    }

    const result = await authService.login(username, password);

    // ❌ Credenciales incorrectas
    if (!result) {
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    // ✅ Login exitoso
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error en el servidor'
    });
  }
};