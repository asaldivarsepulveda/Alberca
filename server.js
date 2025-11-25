const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const pdf = require('html-pdf'); // Librería para generar el PDF

const app = express();
const port = 3000;

// Configuración del servidor
app.use(bodyParser.json());
app.use(express.static('public')); // Para servir archivos estáticos si los necesitas

// **********************************************
// ⚠️ CONFIGURACIÓN DE CORREO (MODIFICAR ESTO)
// **********************************************
// Este 'transporter' usa Gmail. Debes usar una "App Password" si tienes 2FA.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu_correo_de_ventas@gmail.com', // ⬅️ TU CORREO PARA RECIBIR LA SOLICITUD
        pass: 'TU_PASSWORD_O_APP_PASSWORD'     // ⬅️ TU CONTRASEÑA O CLAVE DE APP
    }
});

// **********************************************
// 🎯 RUTA PRINCIPAL DE LA API
// **********************************************
app.post('/api/solicitar-cotizacion', async (req, res) => {
    
    const client = req.body.client;
    const pool = req.body.pool;

    // --- 1. FUNCIÓN DE CÁLCULO (MODIFICA ESTA SECCIÓN) ---
    function calcularCosto(datosAlberca) {
        let costoTotal = 0;
        
        // Convertir dimensiones a números para el cálculo
        const ancho = parseFloat(datosAlberca.ancho.replace('m', ''));
        const largo = parseFloat(datosAlberca.largo.replace('m', ''));
        const profundidad = parseFloat(datosAlberca.profundidad.replace('m', ''));

        // =======================================================
        // ➡️ LÓGICA DE CÁLCULO QUE DEBES PERSONALIZAR ⬅️
        // =======================================================
        
        // Caso 1: Costo Base (por volumen en m³)
        const volumen = ancho * largo * profundidad;
        const COSTO_BASE_M3 = 350; 
        costoTotal += volumen * COSTO_BASE_M3;
        
        // Caso 2: Acabados Premium
        if (datosAlberca.acabados.includes('Premium')) {
            costoTotal += 6000; 
        }

        // Caso 3: Muro Llorón
        if (datosAlberca.muroLloron === 'Sí') {
            costoTotal += 2500;
        }

        // Caso 4: Calefacción
        if (datosAlberca.calefaccion === 'Sí') {
            // Un costo basado en el volumen es un buen enfoque para calefacción
            costoTotal += volumen * 150; 
        }
        
        // Caso 5: Equipo de Bombeo (siempre se incluye, pero podemos darle un costo fijo)
        if (datosAlberca.bombeo === 'Sí') {
            costoTotal += 3000;
        }

        // =======================================================
        // ⬅️ FIN DE LA LÓGICA DE CÁLCULO ➡️
        // =======================================================

        // Devolvemos el total redondeado a dos decimales
        return parseFloat(costoTotal.toFixed(2));
    }
    
    // Ejecutar el cálculo
    const costoFinal = calcularCosto(pool);
    // -------------------------------------------------------------------------


    // --- 2. GENERACIÓN DE LA PLANTILLA HTML PARA EL PDF Y CORREO ---
    const htmlContent = `
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { background-color: #0077b6; color: white; padding: 20px; text-align: center; }
                    .details { margin-top: 20px; padding: 15px; border: 1px solid #ccc; }
                    .total { font-size: 1.5em; color: #0077b6; font-weight: bold; margin-top: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Cotización Preliminar de Alberca</h1>
                </div>
                <h2>Datos del Cliente:</h2>
                <p><strong>Nombre:</strong> ${client.name}</p>
                <p><strong>Teléfono:</strong> ${client.phone}</p>

                <h2>Configuración de la Alberca:</h2>
                <table>
                    <tr><th>Dimensión</th><th>Valor</th></tr>
                    <tr><td>Ancho</td><td>${pool.ancho}</td></tr>
                    <tr><td>Largo</td><td>${pool.largo}</td></tr>
                    <tr><td>Profundidad</td><td>${pool.profundidad}</td></tr>
                </table>
                
                <h3>Accesorios y Acabados:</h3>
                <ul>
                    <li>Acabados Premium: <strong>${pool.acabados}</strong></li>
                    <li>Muro Llorón/Cascada: <strong>${pool.muroLloron}</strong></li>
                    <li>Equipo de Bombeo: <strong>${pool.bombeo}</strong></li>
                    <li>Calefacción/Climatización: <strong>${pool.calefaccion}</strong></li>
                </ul>

                <div class="total">
                    Costo Preliminar Total: $${costoFinal.toLocaleString()}
                </div>
                <p style="font-size: 0.8em; color: gray;">*Esta es una cotización preliminar. Los costos finales pueden variar.</p>
            </body>
        </html>
    `;


    // --- 3. GENERACIÓN DEL PDF ---
    pdf.create(htmlContent).toBuffer(async (err, buffer) => {
        if (err) {
            console.error('Error generando PDF:', err);
            return res.status(500).json({ success: false, message: 'Error interno al generar documento.' });
        }
        
        // --- 4. ENVÍO DEL CORREO INTERNO ---
        try {
            await transporter.sendMail({
                from: '"Sistema Web de Cotizaciones" <tu_correo_de_ventas@gmail.com>',
                to: 'tu_correo_de_ventas@gmail.com', // ⬅️ IMPORTANTE: El destinatario eres TÚ.
                subject: `NUEVA COTIZACIÓN WEB de ${client.name} (${client.phone})`,
                html: `
                    <p>Se ha recibido una nueva solicitud de cotización con la siguiente información:</p>
                    ${htmlContent}
                    <p>Por favor, contactar al cliente para finalizar el presupuesto.</p>
                `,
                attachments: [
                    {
                        filename: `Cotizacion_${client.name.replace(/\s/g, '_')}_${Date.now()}.pdf`,
                        content: buffer,
                        contentType: 'application/pdf'
                    }
                ]
            });

            // Respuesta exitosa al frontend
            res.json({ success: true, message: 'Solicitud procesada y correo enviado.' });

        } catch (mailError) {
            console.error('Error enviando correo:', mailError);
            res.status(500).json({ success: false, message: 'Error interno al enviar correo de notificación.' });
        }
    });

});

app.listen(port, () => {
    console.log(`Servidor de cotizaciones escuchando en http://localhost:${port}`);
});
