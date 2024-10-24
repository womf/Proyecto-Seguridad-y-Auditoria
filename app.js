const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const empleadosRouter = require('.//routes/empleados'); // Importar las rutas de empleados

const app = express();

app.use(bodyParser.json()); // Parsear JSON
app.use('/api/empleados', empleadosRouter); // Registrar las rutas para empleados
app.use(express.static('public')); // Servir archivos estáticos desde public

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
