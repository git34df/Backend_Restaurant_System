const productoService = require('../services/producto.service');

exports.listarProductos = async (req, res) => {
  try {
    const productos = await productoService.listarProductos();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar productos' });
  }
};

exports.listarDisponibles = async (req, res) => {
  try {
    const productos = await productoService.listarDisponibles();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar productos disponibles' });
  }
};

exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await productoService.listarCategorias();
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar categorías' });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const { id_categoria, nombre_producto, precio_producto } = req.body;
    if (!id_categoria || !nombre_producto || precio_producto === undefined) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const producto = await productoService.crearProducto(req.body);
    res.status(201).json(producto);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear producto' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const producto = await productoService.cambiarEstado(req.params.id, req.body.estado_producto);
    res.json(producto);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al cambiar estado' });
  }
};

exports.editarProducto = async (req, res) => {
  try {
    const producto = await productoService.editarProducto(req.params.id, req.body);
    res.json(producto);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al editar producto' });
  }
};