require('dotenv').config();
require('./src/config/db'); // 👈 IMPORTANTE

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});