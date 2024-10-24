const express = require('express');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

// Configuración de SQL Server
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Configuración de Nodemailer para enviar correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Ruta para generar y enviar automáticamente el token
router.post('/enviar-token', async (req, res) => {
    const { dpi } = req.body;

    try {
        // Conectar a la base de datos y buscar al empleado
        const pool = await sql.connect(sqlConfig);
        const result = await pool
            .request()
            .input('DPI', sql.NVarChar, dpi)
            .query('SELECT * FROM Empleados WHERE DPI = @DPI AND Activo = 1');

        if (result.recordset.length === 0) {
            return res.status(404).send('Empleado no encontrado o no activo.');
        }

        const empleado = result.recordset[0];

        // Generar el token JWT con expiración de 10 minutos
        const token = jwt.sign({ dpi: empleado.DPI }, process.env.JWT_SECRET, { expiresIn: '10m' });

        // Enviar el token al correo del empleado
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: empleado.Correo,
            subject: 'Tu Token de Acceso',
            text: `Hola ${empleado.Nombre}, tu token de acceso es: ${token}. Este token es válido por 10 minutos.`,
        });

        res.status(200).send('Token generado y enviado al correo.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al generar o enviar el token.');
    }
});

// Ruta para validar el token e información del usuario
router.get('/saldo', async (req, res) => {
    const { dpi, token } = req.query;

    try {
        // Verificar el token JWT
        jwt.verify(token, process.env.JWT_SECRET);

        // Conectar a la base de datos y consultar el saldo del empleado
        const pool = await sql.connect(sqlConfig);
        const result = await pool
            .request()
            .input('DPI', sql.NVarChar, dpi)
            .execute('ConsultarSaldo');

        if (result.recordset.length === 0) {
            return res.status(404).send('Empleado no encontrado o no activo.');
        }

        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error(error);
        res.status(401).send('Token inválido o expirado.');
    }
});


function verificarRolAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extraer el token

    console.log('Token recibido:', token); // Log para verificar el token recibido

    if (!token) return res.status(401).send('Acceso denegado. Falta el token.');

    try {
        const usuario = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Usuario autenticado:', usuario); // Log del usuario decodificado
        if (usuario.rol !== 'admin') {
            return res.status(403).send('No tienes permisos para esta acción.');
        }
        next(); // Continuar si todo está bien
    } catch (error) {
        console.error('Error de autenticación:', error); // Log del error
        res.status(401).send('Token inválido o expirado.');
    }
}



router.post('/crear-empleado', verificarRolAdmin, async (req, res) => {
    console.log('Solicitud recibida para crear empleado:', req.body);
    console.log('Headers recibidos:', req.headers);

    const { nombre, dpi, correo, limiteCredito, saldo } = req.body;

    console.log('limiteCredito', limiteCredito);
    console.log('limiteCredito', saldo);

    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request()
            .input('Nombre', sql.NVarChar, nombre)
            .input('DPI', sql.NVarChar, dpi)
            .input('Correo', sql.NVarChar, correo)
            .input('LimiteCredito', sql.Decimal(10, 2), limiteCredito)
            .input('Saldo', sql.Decimal(10, 2), saldo)
            .input('Activo', sql.Bit, 1)
            
            .query(`INSERT INTO Empleados (Nombre, DPI, Correo, LimiteCredito, Saldo, Activo) 
                    VALUES (@Nombre, @DPI, @Correo, @LimiteCredito, @Saldo, @Activo)`);

        console.log('Empleado creado:', result);
        res.status(201).send('Empleado creado exitosamente.');
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).send('Error al crear empleado.');
    }
});


router.put('/editar-empleado/:id', verificarRolAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, limiteCredito, saldo } = req.body;

    try {
        const pool = await sql.connect(sqlConfig);
        await pool.request()
            .input('ID', sql.Int, id)
            .input('Nombre', sql.NVarChar, nombre)
            .input('Correo', sql.NVarChar, correo)
            .input('LimiteCredito', sql.Decimal, limiteCredito)
            .input('Saldo', sql.Decimal, saldo)
            .query(`UPDATE Empleados 
                    SET Nombre = @Nombre, Correo = @Correo, 
                        LimiteCredito = @LimiteCredito, Saldo = @Saldo 
                    WHERE ID = @ID`);

        res.status(200).send('Empleado actualizado exitosamente.');
    } catch (error) {
        res.status(500).send('Error al actualizar empleado.');
    }
});


router.put('/deshabilitar-empleado/:id', verificarRolAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await sql.connect(sqlConfig);
        await pool.request()
            .input('ID', sql.Int, id)
            .query(`UPDATE Empleados SET Activo = 0 WHERE ID = @ID`);

        res.status(200).send('Empleado deshabilitado exitosamente.');
    } catch (error) {
        res.status(500).send('Error al deshabilitar empleado.');
    }
});

router.post('/login', async (req, res) => {
    const { correo, contraseña } = req.body;

    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool
            .request()
            .input('Correo', sql.NVarChar, correo)
            .query('SELECT * FROM Usuarios WHERE Correo = @Correo');

        if (result.recordset.length === 0) {
            return res.status(404).send('Usuario no encontrado.');
        }

        const usuario = result.recordset[0];

        if (usuario.Contraseña !== contraseña) {
            return res.status(401).send('Contraseña incorrecta.');
        }

        // Generar el token JWT
        const token = jwt.sign(
            { id: usuario.ID, rol: usuario.Rol },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        console.log('Token generado:', token); // Verificar si se genera el token
        res.status(200).json({ token }); // Enviar el token como respuesta JSON
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).send('Error al iniciar sesión.');
    }
});



router.delete('/:id', verificarRolAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await sql.connect(sqlConfig);
        await pool.request()
            .input('ID', sql.Int, id)
            .query('DELETE FROM Empleados WHERE ID = @ID');

        res.status(200).send('Empleado eliminado exitosamente.');
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).send('Error al eliminar empleado.');
    }
});


module.exports = router;
