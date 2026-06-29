
'use strict';

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../config/db');
const pedidoService = require('../services/pedido.service');

// ─────────────────────────────────────────────────────────────────────────────
//  DATOS DE PRUEBA (fixtures) — representan filas reales de la BD
// ─────────────────────────────────────────────────────────────────────────────
const PEDIDO_MOCK = {
  id_pedido: 1,
  fecha_hora: '2025-04-01 12:00:00',
  estado_pedido: 'registrado',
  tipo_pedido: 'salon',
  subtotal_general: 45.00,
  igv: 8.10,
  total: 53.10,
  notas_pedido: null,
  nombre_cliente: 'Juan Pérez',
  documento_identidad: '12345678',
  id_cliente: 10,
  nombre_empleado: 'María García',
};

const DETALLE_MOCK = [
  {
    id_detalle_pedido: 1,
    cantidad: 2,
    precio_unitario: 15.00,
    subtotal: 30.00,
    notas_especiales: null,
    nombre_producto: 'Lomo Saltado',
    id_producto: 5,
  },
  {
    id_detalle_pedido: 2,
    cantidad: 1,
    precio_unitario: 15.00,
    subtotal: 15.00,
    notas_especiales: 'Sin cebolla',
    nombre_producto: 'Arroz con Leche',
    id_producto: 8,
  },
];

const PEDIDO_COMPLETO_MOCK = { ...PEDIDO_MOCK, detalles: DETALLE_MOCK };

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — configura db.query para responder como MySQL callback
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Hace que db.query llame al callback con (null, resultado) en orden.
 * @param {...any} resultados - respuesta por cada llamada sucesiva
 */
function mockDbSequence(...resultados) {
  let llamada = 0;
  db.query.mockImplementation((_sql, _params, callback) => {
    callback(null, resultados[llamada++] ?? []);
  });
}

function mockDbError(mensaje = 'DB error') {
  db.query.mockImplementation((_sql, _params, callback) => {
    callback(new Error(mensaje));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 1 — listarPedidos
// ─────────────────────────────────────────────────────────────────────────────
describe('listarPedidos()', () => {

  beforeEach(() => jest.clearAllMocks());

  test('✅ devuelve un array de pedidos cuando la BD responde correctamente', async () => {
    // ARRANGE
    mockDbSequence([PEDIDO_MOCK]);

    // ACT
    const result = await pedidoService.listarPedidos();

    // ASSERT
    expect(result).toEqual([PEDIDO_MOCK]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('✅ devuelve array vacío si no hay pedidos', async () => {
    mockDbSequence([]);
    const result = await pedidoService.listarPedidos();
    expect(result).toEqual([]);
  });

  test('❌ lanza error si la BD falla', async () => {
    mockDbError('Connection refused');
    await expect(pedidoService.listarPedidos()).rejects.toThrow('Connection refused');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 2 — obtenerPedidoPorId
// ─────────────────────────────────────────────────────────────────────────────
describe('obtenerPedidoPorId()', () => {

  beforeEach(() => jest.clearAllMocks());

  test('✅ devuelve el pedido con sus detalles cuando existe', async () => {
    // Llamada 1 → row del pedido  |  Llamada 2 → detalles
    mockDbSequence([PEDIDO_MOCK], DETALLE_MOCK);

    const result = await pedidoService.obtenerPedidoPorId(1);

    expect(result).toMatchObject({
      id_pedido: 1,
      nombre_cliente: 'Juan Pérez',
    });
    expect(result.detalles).toHaveLength(2);
    expect(result.detalles[0].nombre_producto).toBe('Lomo Saltado');
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('✅ devuelve null cuando el pedido no existe', async () => {
    // La primera query devuelve array vacío → [0] es undefined
    mockDbSequence([]);
    const result = await pedidoService.obtenerPedidoPorId(999);
    expect(result).toBeNull();
  });

  test('❌ lanza error si la BD falla en la primera query', async () => {
    mockDbError('Timeout');
    await expect(pedidoService.obtenerPedidoPorId(1)).rejects.toThrow('Timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 3 — crearPedido  (caso de uso central del sistema)
// ─────────────────────────────────────────────────────────────────────────────
describe('crearPedido()', () => {

  beforeEach(() => jest.clearAllMocks());

  const inputValido = {
    id_cliente: 10,
    id_empleado: 3,
    notas_pedido: 'Mesa 5',
    tipo_pedido: 'salon',
    items: [
      { id_producto: 5, cantidad: 2, precio_unitario: 15.00, notas_especiales: null },
      { id_producto: 8, cantidad: 1, precio_unitario: 15.00, notas_especiales: 'Sin cebolla' },
    ],
  };

  test('✅ crea el pedido, inserta los detalles y devuelve el pedido completo', async () => {
    // Secuencia de queries que ejecuta crearPedido:
    //  [0] INSERT pedido       → { insertId: 1 }
    //  [1] INSERT detalle #1   → {}
    //  [2] INSERT detalle #2   → {}
    //  [3] UPDATE subtotal     → {}
    //  [4] SELECT pedido       → [PEDIDO_MOCK]   (obtenerPedidoPorId interna)
    //  [5] SELECT detalles     → DETALLE_MOCK
    mockDbSequence(
      { insertId: 1 },  // INSERT pedido
      {},               // INSERT detalle 1
      {},               // INSERT detalle 2
      {},               // recalcularSubtotal UPDATE
      [PEDIDO_MOCK],    // obtenerPedidoPorId – SELECT pedido
      DETALLE_MOCK,     // obtenerPedidoPorId – SELECT detalles
    );

    const result = await pedidoService.crearPedido(inputValido);

    // Verifica estructura del resultado
    expect(result.id_pedido).toBe(1);
    expect(result.detalles).toHaveLength(2);

    // Verifica que se ejecutaron TODAS las queries (1 + 2 items + 1 update + 2 select)
    expect(db.query).toHaveBeenCalledTimes(6);
  });

  test('✅ notas_pedido puede ser null (campo opcional)', async () => {
    const inputSinNotas = { ...inputValido, notas_pedido: undefined };
    mockDbSequence({ insertId: 2 }, {}, {}, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    const result = await pedidoService.crearPedido(inputSinNotas);
    expect(result).toBeDefined();
  });

  test('✅ tipo_pedido por defecto es "salon" cuando no se envía', async () => {
    const inputSinTipo = { ...inputValido, tipo_pedido: undefined };
    mockDbSequence({ insertId: 3 }, {}, {}, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    await pedidoService.crearPedido(inputSinTipo);

    // Verifica que la primera query (INSERT pedido) incluye 'salon'
    const primeraLlamada = db.query.mock.calls[0];
    expect(primeraLlamada[1]).toContain('salon');
  });

  test('❌ lanza error si la BD falla al insertar el pedido principal', async () => {
    mockDbError('Duplicate entry');
    await expect(pedidoService.crearPedido(inputValido)).rejects.toThrow('Duplicate entry');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 4 — cambiarEstado
// ─────────────────────────────────────────────────────────────────────────────
describe('cambiarEstado()', () => {

  beforeEach(() => jest.clearAllMocks());

  const estadosValidos = ['registrado', 'en_preparacion', 'listo', 'entregado', 'anulado'];

  estadosValidos.forEach((estado) => {
    test(`✅ acepta estado válido: "${estado}"`, async () => {
      mockDbSequence({}, [PEDIDO_MOCK], DETALLE_MOCK);
      const result = await pedidoService.cambiarEstado(1, estado);
      expect(result).toBeDefined();
    });
  });

  test('❌ lanza error con estado inválido "preparando"', async () => {
    await expect(
      pedidoService.cambiarEstado(1, 'preparando')
    ).rejects.toThrow('Estado inválido');
  });

  test('❌ lanza error con estado inválido ""', async () => {
    await expect(
      pedidoService.cambiarEstado(1, '')
    ).rejects.toThrow('Estado inválido');
  });

  test('❌ lanza error si la BD falla al actualizar', async () => {
    mockDbError('Lock timeout');
    await expect(
      pedidoService.cambiarEstado(1, 'listo')
    ).rejects.toThrow('Lock timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 5 — agregarItem
// ─────────────────────────────────────────────────────────────────────────────
describe('agregarItem()', () => {

  beforeEach(() => jest.clearAllMocks());

  const item = { id_producto: 5, cantidad: 1, precio_unitario: 20.00, notas_especiales: null };

  test('✅ inserta el item, recalcula subtotal y devuelve pedido actualizado', async () => {
    mockDbSequence({}, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    const result = await pedidoService.agregarItem(1, item);
    expect(result.id_pedido).toBe(1);
    // INSERT detalle + UPDATE subtotal + 2x SELECT
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  test('✅ acepta notas_especiales nulas', async () => {
    mockDbSequence({}, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    const result = await pedidoService.agregarItem(1, { ...item, notas_especiales: undefined });
    expect(result).toBeDefined();

    // notas_especiales debe enviarse como null a la BD
    const primeraLlamada = db.query.mock.calls[0];
    expect(primeraLlamada[1]).toContain(null);
  });

  test('❌ lanza error si la BD falla al insertar el detalle', async () => {
    mockDbError('Foreign key constraint');
    await expect(pedidoService.agregarItem(1, item)).rejects.toThrow('Foreign key constraint');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUITE 6 — eliminarItem
// ─────────────────────────────────────────────────────────────────────────────
describe('eliminarItem()', () => {

  beforeEach(() => jest.clearAllMocks());

  test('✅ elimina el detalle, recalcula subtotal y devuelve pedido actualizado', async () => {
    mockDbSequence({}, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    const result = await pedidoService.eliminarItem(1, 2);
    expect(result.id_pedido).toBe(1);
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  test('✅ eliminar item inexistente no lanza error (MySQL afecta 0 filas)', async () => {
    // MySQL no lanza error en DELETE sin coincidencias, solo affectedRows = 0
    mockDbSequence({ affectedRows: 0 }, {}, [PEDIDO_MOCK], DETALLE_MOCK);
    const result = await pedidoService.eliminarItem(1, 999);
    expect(result).toBeDefined();
  });

  test('❌ lanza error si la BD falla al eliminar', async () => {
    mockDbError('Table locked');
    await expect(pedidoService.eliminarItem(1, 2)).rejects.toThrow('Table locked');
  });
});