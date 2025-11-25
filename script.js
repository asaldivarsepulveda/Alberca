document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener referencias a todos los elementos clave del DOM
    const poolForm = document.getElementById('pool-form');
    
    // Dimensiones
    const anchoSelect = document.getElementById('ancho');
    const largoSelect = document.getElementById('largo');
    const profundidadSelect = document.getElementById('profundidad');

    // Accesorios
    const acabadosCheckbox = document.getElementById('acabados');
    const muroLloronCheckbox = document.getElementById('muro-lloron');
    const bombeoCheckbox = document.getElementById('bombeo');
    const calefaccionCheckbox = document.getElementById('calefaccion');

    // Elementos de Visualización
    const poolBox = document.getElementById('pool-box');
    const depthBox = document.getElementById('depth-box');
    const muroLloronVisual = document.getElementById('muro-lloron-visual');
    const accessorySummary = document.getElementById('accessory-summary');
    
    // Constantes de escalado (basadas en CSS)
    const SCALE_CONTAINER_HEIGHT_PX = 250; // Altura total del contenedor de escala
    // La altura real disponible para dibujar la profundidad (250px menos 2px de la línea de suelo)
    const DRAWING_HEIGHT_PX = SCALE_CONTAINER_HEIGHT_PX - 2; 

    const PERSON_REF_HEIGHT_PX = 160;
    const MAX_POOL_WIDTH_PX = 400; 
    const MAX_POOL_HEIGHT_PX = 200; 
    const MAX_DEPTH_M = 1.8; // Profundidad máxima en metros
    const MAX_LENGTH_M = 10;
    const MAX_WIDTH_M = 5;

    // 2. Función principal para actualizar la visualización
    function updatePoolPreview() {
        // --- A. DIMENSIONES (VISTA SUPERIOR Y LATERAL) ---
        
        const ancho = parseFloat(anchoSelect.value);
        const largo = parseFloat(largoSelect.value);
        const profundidad = parseFloat(profundidadSelect.value);
        
        // 1. VISTA SUPERIOR (Ancho y Largo)
        const newWidthPx = (ancho / MAX_WIDTH_M) * MAX_POOL_WIDTH_PX;
        const newHeightPx = (largo / MAX_LENGTH_M) * MAX_POOL_HEIGHT_PX; 

        poolBox.style.width = `${newWidthPx}px`;
        poolBox.style.height = `${newHeightPx}px`;

        // 2. VISTA LATERAL (Profundidad) - ¡CORRECCIÓN APLICADA AQUÍ!
        // Mapea la profundidad seleccionada a la altura máxima de dibujo (248px)
        const newDepthHeightPx = (profundidad / MAX_DEPTH_M) * DRAWING_HEIGHT_PX;
        
        depthBox.style.height = `${newDepthHeightPx}px`;

        // --- B. ACCESORIOS Y ACABADOS ---

        // Acabados Premium
        if (acabadosCheckbox.checked) {
            poolBox.classList.add('premium-finish');
        } else {
            poolBox.classList.remove('premium-finish');
        }

        // Muro Llorón
        if (muroLloronCheckbox.checked) {
            muroLloronVisual.classList.remove('hidden');
        } else {
            muroLloronVisual.classList.add('hidden');
        }
        
        // Resumen de Accesorios
        updateAccessorySummary();
    }
    
    // Función para actualizar el resumen de texto de los extras
    function updateAccessorySummary() {
        let summaryHTML = '<p>Extras:</p><ul>';
        
        if (acabadosCheckbox.checked) summaryHTML += '<li>✅ Acabados Premium (Borde)</li>';
        if (muroLloronCheckbox.checked) summaryHTML += '<li>✅ Muro Llorón/Cascada</li>';
        if (bombeoCheckbox.checked) summaryHTML += '<li>✅ Equipo de Bombeo</li>';
        if (calefaccionCheckbox.checked) summaryHTML += '<li>✅ Calefacción</li>';
        
        if (!acabadosCheckbox.checked && !muroLloronCheckbox.checked && !bombeoCheckbox.checked && !calefaccionCheckbox.checked) {
            summaryHTML += '<li>Ningún extra seleccionado.</li>';
        }

        summaryHTML += '</ul>';
        accessorySummary.innerHTML = summaryHTML;
    }


    // 3. Inicializar y Escuchar Cambios del Formulario de la Alberca
    updatePoolPreview(); 
    poolForm.addEventListener('change', updatePoolPreview);


    // 4. Lógica de Solicitud de Cotización (Envío al Backend)
    const contactForm = document.getElementById('contact-form');
    const statusMessage = document.getElementById('message-status');

    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        // 1. Recopilar datos de la alberca
        const poolData = {
            ancho: anchoSelect.value + 'm',
            largo: largoSelect.value + 'm',
            profundidad: profundidadSelect.value + 'm',
            acabados: acabadosCheckbox.checked ? 'Sí (Premium)' : 'No (Estándar)',
            muroLloron: muroLloronCheckbox.checked ? 'Sí' : 'No',
            bombeo: bombeoCheckbox.checked ? 'Sí' : 'No',
            calefaccion: calefaccionCheckbox.checked ? 'Sí' : 'No',
        };
        
        // 2. Recopilar datos de contacto
        const clientData = {
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value, 
        };

        // 3. Combinar datos para el envío
        const requestData = {
            client: clientData,
            pool: poolData
        };

        // 4. Enviar los datos al backend
        statusMessage.textContent = 'Enviando solicitud...';
        statusMessage.className = 'status-message'; 
        
        // ** IMPORTANTE: Esta es la URL de tu API de servidor **
        const SERVER_ENDPOINT = '/api/solicitar-cotizacion'; 

        fetch(SERVER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        })
        .then(response => {
            if (!response.ok) {
                // El servidor no respondió con éxito (ej: 404, 500)
                throw new Error('Error en el servidor al procesar la solicitud.');
            }
            // Asume que el servidor devuelve un JSON
            return response.json(); 
        })
        .then(data => {
            // Éxito: El servidor procesó la solicitud (y envió el correo a tu equipo interno)
            statusMessage.textContent = '✅ ¡Solicitud recibida! Te contactaremos al teléfono ' + clientData.phone + '.';
            statusMessage.className = 'status-message success';
            contactForm.reset(); 
        })
        .catch((error) => {
            // Error de conexión o error de procesamiento capturado
            console.error('Error:', error);
            statusMessage.textContent = '❌ Error al solicitar la cotización. Intenta más tarde.';
            statusMessage.className = 'status-message error';
        });
    });
});