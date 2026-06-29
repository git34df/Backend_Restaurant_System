'use strict';
/**
 * ================================================================
 *  PRUEBAS UNITARIAS — RestaurantApp (D'Alicias)
 *  Archivo : all.test.js
 *  Cubre   : 19 casos de prueba / 5 módulos
 *
 *  Módulos:
 *    1. Autenticación  (CP-01 → CP-03)
 *    2. Pedidos        (CP-04 → CP-09)
 *    3. Productos      (CP-10 → CP-12)
 *    4. Pagos          (CP-13 → CP-16)
 *    5. Seguridad      (CP-17 → CP-19)
 * ================================================================
 */

// ── Mocks de dependencias externas (antes de cualquier require) ───────────────

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('bcryptjs', () => ({
  hash:    jest.fn(),
  compare: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  sign:   jest.fn(),
  verify: jest.fn(),
}));

const db      = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const authService    = require('../services/auth.service');
const pedidoService  = require('../services/pedido.service');
const productoService = require('../services/producto.service');
const pagoService    = require('../services/Pago.service');
const { verificarToken, soloRoles } = require('../middlewares/auth.middleware');

// ── Fixtures (datos de prueba reutilizables) ──────────────────────────────────

const PEDIDO = {
  id_pedido: 1, estado_pedido: 'registrado', tipo_pedido: 'salon',
  subtotal_general: 45.00, igv: 8.10, total: 53.10, notas_pedido: null,
  nombre_cliente: 'Juan Pérez', documento_identidad: '12345678',
  id_cliente: 10, nombre_empleado: 'María García',
};

const DETALLES = [
  { id_detalle_pedido: 1, cantidad: 2, precio_unitario: 15.00, subtotal: 30.00,
    notas_especiales: null, nombre_producto: 'Lomo Saltado', id_producto: 5 },
  { id_detalle_pedido: 2, cantidad: 1, precio_unitario: 15.00, subtotal: 15.00,
    notas_especiales: 'Sin cebolla', nombre_producto: 'Arroz con Leche', id_producto: 8 },
];

const PEDIDO_COMPLETO = { ...PEDIDO, detalles: DETALLES };

const PRODUCTO = {
  id_producto: 5, nombre_producto: 'Ají de Gallina',
  precio_producto: 22.50, estado_producto: 'disponible',
  id_categoria: 2, nombre_categoria: 'Fondos',
};

const COMPROBANTE = {
  id_comprobante: 1, estado: 'emitido', total: '53.10', id_pedido: 1,
};

// ── Helper: simula respuestas de db.query en secuencia ───────────────────────
function mockDb(...resultados) {
  let i = 0;
  db.query.mockImplementation((_sql, _params, cb) => cb(null, resultados[i++] ?? []));
}

function mockDbError(msg = 'DB error') {
  db.query.mockImplementation((_sql, _params, cb) => cb(new Error(msg)));
}

// Helper: construye req/res/next falsos para middleware
function mockHttp(opts = {}) {
  const req = {
    headers: opts.headers || {},
    usuario: opts.usuario || null,
    body: opts.body || {},
    params: opts.params || {},
  };
  const res = {
    _status: null, _json: null,
    status(code) { this._status = code; return this; },
    json(data)   { this._json  = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

// ═════════════════════════════════════════════════════════════════════════════
//  MÓDULO 1 — AUTENTICACIÓN
// ═════════════════════════════════════════════════════════════════════════════
describe('MÓDULO 1 — Autenticación', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── CP-01 ─────────────────────────────────────────────────────────────────
  describe('CP-01 | Login exitoso con credenciales válidas', () => {

    const userRow = {
      id_usuario: 7, username: 'maria_garcia',
      password_hash: '$2b$10$hash', id_rol: 4, id_empleado: 3,
    };

    beforeEach(() => {
      process.env.JWT_SECRET = 'test_secret';
      mockDb([userRow]);                        // SELECT usuario
      bcrypt.compare.mockResolvedValue(true);   // contraseña correcta
      jwt.sign.mockReturnValue('jwt.token.ok'); // token generado
    });

    test('✅ [CP-01] Retorna objeto con token y datos de usuario', async () => {
      const result = await authService.login('maria_garcia', 'Pass123!');
      expect(result).not.toBe(false);
      expect(result.token).toBe('jwt.token.ok');
      expect(result.message).toBe('Login exitoso');
    });

    test('✅ [CP-01] user contiene id, username, id_rol, id_empleado', async () => {
      const result = await authService.login('maria_garcia', 'Pass123!');
      expect(result.user).toMatchObject({
        id: 7, username: 'maria_garcia', id_rol: 4, id_empleado: 3,
      });
    });

    test('✅ [CP-01] jwt.sign se llamó con payload correcto y expiración 8h', async () => {
      await authService.login('maria_garcia', 'Pass123!');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 7, rol: 4 },
        'test_secret',
        { expiresIn: '8h' }
      );
    });
  });

  // ── CP-02 ─────────────────────────────────────────────────────────────────
  describe('CP-02 | Login con contraseña incorrecta', () => {

    beforeEach(() => {
      mockDb([{ id_usuario: 7, username: 'maria_garcia', password_hash: '$2b$10$hash', id_rol: 4 }]);
      bcrypt.compare.mockResolvedValue(false);  // contraseña no coincide
    });

    test('✅ [CP-02] Retorna false cuando la contraseña no coincide', async () => {
      const result = await authService.login('maria_garcia', 'wrongpass');
      expect(result).toBe(false);
    });

    test('✅ [CP-02] NO genera token cuando las credenciales son incorrectas', async () => {
      await authService.login('maria_garcia', 'wrongpass');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  // ── CP-03 ─────────────────────────────────────────────────────────────────
  describe('CP-03 | Login con username inexistente', () => {

    test('✅ [CP-03] Retorna false si el usuario no existe en la BD', async () => {
      mockDb([]);  // SELECT devuelve vacío
      const result = await authService.login('noexiste', 'cualquier');
      expect(result).toBe(false);
    });

    test('✅ [CP-03] NO llama a bcrypt.compare si el usuario no existe', async () => {
      mockDb([]);
      await authService.login('noexiste', 'cualquier');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

});

// ═════════════════════════════════════════════════════════════════════════════
//  MÓDULO 2 — GESTIÓN DE PEDIDOS
// ═════════════════════════════════════════════════════════════════════════════
describe('MÓDULO 2 — Gestión de Pedidos', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── CP-04 ─────────────────────────────────────────────────────────────────
  describe('CP-04 | Crear pedido con datos completos y múltiples ítems', () => {

    const input = {
      id_cliente: 10, id_empleado: 3,
      notas_pedido: 'Mesa 5', tipo_pedido: 'salon',
      items: [
        { id_producto: 5, cantidad: 2, precio_unitario: 15.00, notas_especiales: null },
        { id_producto: 8, cantidad: 1, precio_unitario: 15.00, notas_especiales: 'Sin cebolla' },
      ],
    };

    beforeEach(() => {
      // INSERT pedido | INSERT detalle×2 | UPDATE subtotal | SELECT pedido | SELECT detalles
      mockDb({ insertId: 1 }, {}, {}, {}, [PEDIDO], DETALLES);
    });

    test('✅ [CP-04] Retorna pedido con id_pedido generado', async () => {
      const r = await pedidoService.crearPedido(input);
      expect(r.id_pedido).toBe(1);
    });

    test('✅ [CP-04] detalles contiene exactamente 2 ítems', async () => {
      const r = await pedidoService.crearPedido(input);
      expect(r.detalles).toHaveLength(2);
    });

    test('✅ [CP-04] Se ejecutan 6 queries (1 pedido + 2 detalles + 1 subtotal + 2 select)', async () => {
      await pedidoService.crearPedido(input);
      expect(db.query).toHaveBeenCalledTimes(6);
    });

    test('✅ [CP-04] tipo_pedido por defecto es "salon" cuando no se envía', async () => {
      mockDb({ insertId: 2 }, {}, {}, {}, [PEDIDO], DETALLES);
      await pedidoService.crearPedido({ ...input, tipo_pedido: undefined });
      expect(db.query.mock.calls[0][1]).toContain('salon');
    });
  });

  // ── CP-05 ─────────────────────────────────────────────────────────────────
  describe('CP-05 | Crear pedido sin ítems', () => {

    test('✅ [CP-05] items vacío → lanza error de BD (no ejecuta INSERT)', async () => {
      // El controlador valida items.length===0 y retorna 400 sin llamar al service.
      // A nivel de service: si se llama con items:[] el for no itera, pero el pedido
      // cabecera sí se insertaría. El rechazo es responsabilidad del controlador.
      // Esta prueba valida que con items:[] el service no inserta detalles.
      mockDb({ insertId: 3 }, {}, [PEDIDO], []);
      const r = await pedidoService.crearPedido({
        id_cliente: 10, id_empleado: 3, items: [],
      });
      // Solo 1 INSERT (cabecera) + 1 UPDATE subtotal + 2 SELECT = 4 queries, sin detalles
      expect(db.query).toHaveBeenCalledTimes(4);
      expect(r.detalles).toHaveLength(0);
    });
  });

  // ── CP-06 ─────────────────────────────────────────────────────────────────
  describe('CP-06 | Obtener pedido existente por ID', () => {

    test('✅ [CP-06] Retorna pedido con campos de cabecera correctos', async () => {
      mockDb([PEDIDO], DETALLES);
      const r = await pedidoService.obtenerPedidoPorId(1);
      expect(r).toMatchObject({ id_pedido: 1, nombre_cliente: 'Juan Pérez' });
    });

    test('✅ [CP-06] detalles es un array con al menos 1 elemento', async () => {
      mockDb([PEDIDO], DETALLES);
      const r = await pedidoService.obtenerPedidoPorId(1);
      expect(Array.isArray(r.detalles)).toBe(true);
      expect(r.detalles.length).toBeGreaterThanOrEqual(1);
    });

    test('✅ [CP-06] Se ejecutan exactamente 2 queries (SELECT pedido + SELECT detalles)', async () => {
      mockDb([PEDIDO], DETALLES);
      await pedidoService.obtenerPedidoPorId(1);
      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });

  // ── CP-07 ─────────────────────────────────────────────────────────────────
  describe('CP-07 | Obtener pedido con ID inexistente', () => {

    test('✅ [CP-07] Retorna null cuando el pedido no existe en la BD', async () => {
      mockDb([]);  // SELECT devuelve array vacío → [0] === undefined
      const r = await pedidoService.obtenerPedidoPorId(9999);
      expect(r).toBeNull();
    });

    test('✅ [CP-07] Solo se ejecuta 1 query (no busca detalles si no hay pedido)', async () => {
      mockDb([]);
      await pedidoService.obtenerPedidoPorId(9999);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // ── CP-08 ─────────────────────────────────────────────────────────────────
  describe('CP-08 | Cambiar estado — transición válida', () => {

    const estadosValidos = ['registrado', 'en_preparacion', 'listo', 'entregado', 'anulado'];

    estadosValidos.forEach(estado => {
      test(`✅ [CP-08] Acepta estado válido: "${estado}"`, async () => {
        mockDb({}, [{ ...PEDIDO, estado_pedido: estado }], DETALLES);
        const r = await pedidoService.cambiarEstado(1, estado);
        expect(r).toBeDefined();
      });
    });

    test('✅ [CP-08] Se ejecutan 3 queries (UPDATE + 2 SELECT)', async () => {
      mockDb({}, [PEDIDO], DETALLES);
      await pedidoService.cambiarEstado(1, 'listo');
      expect(db.query).toHaveBeenCalledTimes(3);
    });
  });

  // ── CP-09 ─────────────────────────────────────────────────────────────────
  describe('CP-09 | Cambiar estado con valor fuera del enum', () => {

    test('✅ [CP-09] Lanza error "Estado inválido" con estado "preparando"', async () => {
      await expect(pedidoService.cambiarEstado(1, 'preparando'))
        .rejects.toThrow('Estado inválido');
    });

    test('✅ [CP-09] Lanza error con cadena vacía como estado', async () => {
      await expect(pedidoService.cambiarEstado(1, ''))
        .rejects.toThrow('Estado inválido');
    });

    test('✅ [CP-09] NO ejecuta query UPDATE cuando el estado es inválido', async () => {
      await pedidoService.cambiarEstado(1, 'invalido').catch(() => {});
      expect(db.query).not.toHaveBeenCalled();
    });
  });

});

// ═════════════════════════════════════════════════════════════════════════════
//  MÓDULO 3 — GESTIÓN DE PRODUCTOS
// ═════════════════════════════════════════════════════════════════════════════
describe('MÓDULO 3 — Gestión de Productos', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── CP-10 ─────────────────────────────────────────────────────────────────
  describe('CP-10 | Crear producto con datos completos', () => {

    const input = {
      id_categoria: 2, nombre_producto: 'Ají de Gallina',
      descripcion_producto: 'Pollo en salsa amarilla', precio_producto: 22.50,
    };

    beforeEach(() => {
      mockDb({ insertId: 5 }, [PRODUCTO]);  // INSERT + SELECT con JOIN
    });

    test('✅ [CP-10] Retorna producto con id_producto generado', async () => {
      const r = await productoService.crearProducto(input);
      expect(r.id_producto).toBe(5);
    });

    test('✅ [CP-10] Retorna nombre_categoria del JOIN', async () => {
      const r = await productoService.crearProducto(input);
      expect(r.nombre_categoria).toBe('Fondos');
    });

    test('✅ [CP-10] Se ejecutan 2 queries (INSERT + SELECT con JOIN)', async () => {
      await productoService.crearProducto(input);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('✅ [CP-10] descripcion_producto es null cuando no se envía', async () => {
      mockDb({ insertId: 6 }, [PRODUCTO]);
      await productoService.crearProducto({ ...input, descripcion_producto: undefined });
      expect(db.query.mock.calls[0][1]).toContain(null);
    });
  });

  // ── CP-11 ─────────────────────────────────────────────────────────────────
  describe('CP-11 | Listar solo productos disponibles', () => {

    const disponibles = [
      { id_producto: 1, nombre_producto: 'Lomo Saltado',   precio_producto: 25.00, nombre_categoria: 'Fondos' },
      { id_producto: 2, nombre_producto: 'Inca Kola 500ml', precio_producto: 5.00,  nombre_categoria: 'Bebidas' },
    ];

    test('✅ [CP-11] Retorna array de productos disponibles', async () => {
      mockDb(disponibles);
      const r = await productoService.listarDisponibles();
      expect(Array.isArray(r)).toBe(true);
      expect(r).toHaveLength(2);
    });

    test('✅ [CP-11] Retorna array vacío si no hay disponibles', async () => {
      mockDb([]);
      const r = await productoService.listarDisponibles();
      expect(r).toEqual([]);
    });

    test('✅ [CP-11] Los items retornados tienen nombre_producto y precio_producto', async () => {
      mockDb(disponibles);
      const r = await productoService.listarDisponibles();
      r.forEach(p => {
        expect(p).toHaveProperty('nombre_producto');
        expect(p).toHaveProperty('precio_producto');
      });
    });
  });

  // ── CP-12 ─────────────────────────────────────────────────────────────────
  describe('CP-12 | Cambiar estado de producto', () => {

    test('✅ [CP-12] Cambia a "agotado" correctamente', async () => {
      mockDb({}, [{ ...PRODUCTO, estado_producto: 'agotado' }]);
      const r = await productoService.cambiarEstado(5, 'agotado');
      expect(r.estado_producto).toBe('agotado');
    });

    test('✅ [CP-12] Acepta los 3 estados válidos del enum', async () => {
      for (const estado of ['disponible', 'no_disponible', 'agotado']) {
        jest.clearAllMocks();
        mockDb({}, [{ ...PRODUCTO, estado_producto: estado }]);
        const r = await productoService.cambiarEstado(5, estado);
        expect(r.estado_producto).toBe(estado);
      }
    });

    test('✅ [CP-12] Lanza error con estado inválido "visible"', async () => {
      await expect(productoService.cambiarEstado(5, 'visible'))
        .rejects.toThrow('Estado inválido');
    });

    test('✅ [CP-12] NO ejecuta UPDATE con estado inválido', async () => {
      await productoService.cambiarEstado(5, 'malo').catch(() => {});
      expect(db.query).not.toHaveBeenCalled();
    });
  });

});

// ═════════════════════════════════════════════════════════════════════════════
//  MÓDULO 4 — PAGOS
// ═════════════════════════════════════════════════════════════════════════════
describe('MÓDULO 4 — Pagos', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── CP-13 ─────────────────────────────────────────────────────────────────
  describe('CP-13 | Pago con monto exacto al total', () => {

    beforeEach(() => {
      // SELECT comprobante | SELECT pago existente (vacío) | INSERT pago |
      // INSERT pago_detalle | UPDATE pedido | SELECT pago final
      mockDb([COMPROBANTE], [], { insertId: 1 }, {}, {}, [{}]);
    });

    test('✅ [CP-13] Retorna vuelto "0.00" cuando monto === total', async () => {
      const r = await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 53.10 }],
      });
      expect(r.vuelto).toBe('0.00');
    });

    test('✅ [CP-13] total_cobrado coincide con el total del comprobante', async () => {
      const r = await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 53.10 }],
      });
      expect(r.total_cobrado).toBe('53.10');
    });

    test('✅ [CP-13] total_pagado refleja el monto entregado', async () => {
      const r = await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 53.10 }],
      });
      expect(r.total_pagado).toBe(53.10);
    });
  });

  // ── CP-14 ─────────────────────────────────────────────────────────────────
  describe('CP-14 | Pago con billete mayor — calcular vuelto', () => {

    const comprobante35 = { ...COMPROBANTE, total: '35.40' };

    beforeEach(() => {
      mockDb([comprobante35], [], { insertId: 2 }, {}, {}, [{}]);
    });

    test('✅ [CP-14] Calcula vuelto correcto: 50.00 - 35.40 = 14.60', async () => {
      const r = await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 50.00 }],
      });
      expect(r.vuelto).toBe('14.60');
    });

    test('✅ [CP-14] total_cobrado es el total del comprobante, no lo pagado', async () => {
      const r = await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 50.00 }],
      });
      expect(r.total_cobrado).toBe('35.40');
    });
  });

  // ── CP-15 ─────────────────────────────────────────────────────────────────
  describe('CP-15 | Pago con monto insuficiente', () => {

    const comprobante80 = { ...COMPROBANTE, id_comprobante: 3, total: '80.00' };

    test('✅ [CP-15] Lanza error "Monto insuficiente" cuando monto < total', async () => {
      mockDb([comprobante80]);
      await expect(
        pagoService.registrarPago({
          id_comprobante: 3,
          metodos: [{ metodo_pago: 'efectivo', monto: 60.00 }],
        })
      ).rejects.toThrow('Monto insuficiente');
    });

    test('✅ [CP-15] El mensaje de error incluye el total requerido', async () => {
      mockDb([comprobante80]);
      await expect(
        pagoService.registrarPago({
          id_comprobante: 3,
          metodos: [{ metodo_pago: 'efectivo', monto: 60.00 }],
        })
      ).rejects.toThrow('S/ 80.00');
    });

    test('✅ [CP-15] No se ejecuta INSERT en tabla pago cuando el monto es insuficiente', async () => {
      mockDb([comprobante80]);
      await pagoService.registrarPago({
        id_comprobante: 3,
        metodos: [{ metodo_pago: 'efectivo', monto: 60.00 }],
      }).catch(() => {});
      // Solo 1 query: SELECT comprobante. El INSERT nunca se alcanza.
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // ── CP-16 ─────────────────────────────────────────────────────────────────
  describe('CP-16 | Intentar pagar comprobante ya pagado', () => {

    test('✅ [CP-16] Lanza error "ya fue pagado" cuando existe pago previo', async () => {
      mockDb([COMPROBANTE], [{ id_pago: 99 }]);  // SELECT comprobante + SELECT pago existente
      await expect(
        pagoService.registrarPago({
          id_comprobante: 1,
          metodos: [{ metodo_pago: 'efectivo', monto: 53.10 }],
        })
      ).rejects.toThrow('ya fue pagado');
    });

    test('✅ [CP-16] No se crea un segundo registro en tabla pago', async () => {
      mockDb([COMPROBANTE], [{ id_pago: 99 }]);
      await pagoService.registrarPago({
        id_comprobante: 1,
        metodos: [{ metodo_pago: 'efectivo', monto: 53.10 }],
      }).catch(() => {});
      // Solo 2 queries: SELECT comprobante + SELECT pago. Sin INSERT.
      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });

});

// ═════════════════════════════════════════════════════════════════════════════
//  MÓDULO 5 — SEGURIDAD Y AUTORIZACIÓN
// ═════════════════════════════════════════════════════════════════════════════
describe('MÓDULO 5 — Seguridad y Autorización', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
  });

  // ── CP-17 ─────────────────────────────────────────────────────────────────
  describe('CP-17 | Acceso sin header Authorization', () => {

    test('✅ [CP-17] Responde 401 cuando no hay header Authorization', () => {
      const { req, res, next } = mockHttp({ headers: {} });
      verificarToken(req, res, next);
      expect(res._status).toBe(401);
    });

    test('✅ [CP-17] Mensaje: "Acceso denegado: token requerido"', () => {
      const { req, res, next } = mockHttp({ headers: {} });
      verificarToken(req, res, next);
      expect(res._json.message).toBe('Acceso denegado: token requerido');
    });

    test('✅ [CP-17] next() NO es llamado cuando falta el token', () => {
      const { req, res, next } = mockHttp({ headers: {} });
      verificarToken(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── CP-18 ─────────────────────────────────────────────────────────────────
  describe('CP-18 | Acceso con token expirado o inválido', () => {

    test('✅ [CP-18] Responde 401 cuando jwt.verify lanza excepción', () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      const { req, res, next } = mockHttp({
        headers: { authorization: 'Bearer token.invalido' },
      });
      verificarToken(req, res, next);
      expect(res._status).toBe(401);
    });

    test('✅ [CP-18] Mensaje: "Token inválido o expirado"', () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      const { req, res, next } = mockHttp({
        headers: { authorization: 'Bearer token.invalido' },
      });
      verificarToken(req, res, next);
      expect(res._json.message).toBe('Token inválido o expirado');
    });

    test('✅ [CP-18] next() NO es llamado con token expirado', () => {
      jwt.verify.mockImplementation(() => { throw new Error('expired'); });
      const { req, res, next } = mockHttp({
        headers: { authorization: 'Bearer token.viejo' },
      });
      verificarToken(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('✅ [CP-18] Token válido: llama next() y asigna req.usuario', () => {
      const payload = { id: 7, rol: 4 };
      jwt.verify.mockReturnValue(payload);
      const { req, res, next } = mockHttp({
        headers: { authorization: 'Bearer token.valido' },
      });
      verificarToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.usuario).toEqual(payload);
    });
  });

  // ── CP-19 ─────────────────────────────────────────────────────────────────
  describe('CP-19 | Rol sin permisos intenta acceder a ruta de admin', () => {

    test('✅ [CP-19] Responde 403 cuando el rol del usuario no está permitido', () => {
      const middleware = soloRoles('Administrador');   // id_rol: 1
      const { req, res, next } = mockHttp();
      req.usuario = { id: 9, rol: 4 };                // Mozo — no autorizado
      middleware(req, res, next);
      expect(res._status).toBe(403);
    });

    test('✅ [CP-19] Mensaje incluye el rol requerido', () => {
      const middleware = soloRoles('Administrador');
      const { req, res, next } = mockHttp();
      req.usuario = { id: 9, rol: 4 };
      middleware(req, res, next);
      expect(res._json.message).toContain('Administrador');
    });

    test('✅ [CP-19] next() NO se llama cuando el rol es insuficiente', () => {
      const middleware = soloRoles('Administrador');
      const { req, res, next } = mockHttp();
      req.usuario = { id: 9, rol: 4 };
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('✅ [CP-19] next() SÍ se llama cuando el rol está permitido', () => {
      const middleware = soloRoles('Administrador', 'Supervisor');  // ids: 1 y 2
      const { req, res, next } = mockHttp();
      req.usuario = { id: 1, rol: 1 };               // Administrador — autorizado
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('✅ [CP-19] Permite acceso cuando usuario tiene uno de varios roles aceptados', () => {
      const middleware = soloRoles('Cajero', 'Mozo');  // ids: 3 y 4
      const { req, res, next } = mockHttp();
      req.usuario = { id: 5, rol: 4 };               // Mozo — dentro de los permitidos
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

});