const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});

pool.getConnection((err, conn) => {
  if (err) console.error('❌ Error conectando a MySQL:', err);
  else { console.log('✅ MySQL conectado'); conn.release(); }
});

module.exports = pool;