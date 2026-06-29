const express = require('express');
const cors    = require('cors');
const db      = require('./config/db');

const authRoutes        = require('./routes/auth.routes');
const pedidoRoutes      = require('./routes/pedido.routes');
const clienteRoutes     = require('./routes/cliente.routes');
const productoRoutes    = require('./routes/producto.routes');
const comprobanteRoutes = require('./routes/comprobante.routes');
const pagoRoutes        = require('./routes/pago.routes');
const reclamoRoutes     = require('./routes/reclamo.routes');
const adminRoutes       = require('./routes/admin.routes');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
    ].filter(Boolean);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth',         authRoutes);
app.use('/api/pedidos',      pedidoRoutes);
app.use('/api/clientes',     clienteRoutes);
app.use('/api/productos',    productoRoutes);
app.use('/api/comprobantes', comprobanteRoutes);
app.use('/api/pagos',        pagoRoutes);
app.use('/api/reclamos',     reclamoRoutes);
app.use('/api/admin',        adminRoutes);

app.get('/', (req, res) => res.send("API D'Alicias 🍽️"));

app.get('/api/db-test', (req, res) => {
  db.query('SELECT DATABASE() AS db', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

module.exports = app;
