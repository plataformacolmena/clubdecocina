/**
 * ============================================================================
 * CLUB DE COCINA COLMENA - GMAIL API UNIVERSAL SCRIPT
 * ============================================================================
 * 
 * Script único para todas las funciones de Gmail API:
 * - Notificaciones de inscripción
 * - Recordatorios de cursos
 * - Confirmaciones de pago
 * - Cancelaciones y cambios
 * - Envío de recetas
 * 
 * Configuración:
 * 1. Crea un nuevo proyecto en Google Apps Script
 * 2. Pega este código
 * 3. Habilita Gmail API en la consola de Google Cloud
 * 4. Despliega como Web App con permisos públicos
 * 5. Copia la URL del deployment al sistema de configuraciones
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURACIÓN PRINCIPAL
// ============================================================================

const CONFIG = {
  // Email del administrador (recibirá notificaciones)
  adminEmail: 'admin@clubcolmena.com.ar',
  
  // Configuración de emails
  emailConfig: {
    remitente: 'Club de Cocina Colmena',
    noreplyEmail: 'noreply@clubcolmena.com.ar',
    logoUrl: 'https://clubcolmena.com.ar/logo.png',
    websiteUrl: 'https://clubcolmena.com.ar',
    colorPrimario: '#ff6b35',
    colorSecundario: '#2c5f2d'
  },
  
  // Plantillas de asuntos
  asuntos: {
    nuevaInscripcion: 'Nueva inscripcion - Club de Cocina',
    confirmacionInscripcion: 'Inscripcion confirmada - {{nombreCurso}}',
    recordatorioCurso: 'Recordatorio: Tu curso es manana - {{nombreCurso}}',
    confirmacionPago: 'Pago confirmado - {{nombreCurso}}',
    cancelacionCurso: 'Curso cancelado - {{nombreCurso}}',
    nuevaReceta: 'Nueva receta disponible - {{nombreReceta}}'
  }
};

// ============================================================================
// FUNCIONES AUXILIARES PARA RESPUESTAS
// ============================================================================

/**
 * Crear respuesta JSON con headers CORS
 */
function createJSONResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Configurar headers CORS uno por uno
  const response = HtmlService.createHtmlOutput('');
  return output;
}

/**
 * Configurar headers CORS en respuesta
 */
function setCORSHeaders(output) {
  // En Apps Script, los headers CORS se manejan diferente
  // No se pueden encadenar múltiples setHeader después de setMimeType
  return output;
}

// ============================================================================
// FUNCIÓN PRINCIPAL (ENDPOINT)
// ============================================================================

function doPost(e) {
  try {
    console.log('Gmail API Script - Solicitud recibida');
    
    // Parsear datos de la solicitud
    const datos = JSON.parse(e.postData.contents);
    const tipoEmail = datos.tipo;
    
    console.log(`Tipo de email: ${tipoEmail}`);
    console.log('Datos:', JSON.stringify(datos, null, 2));
    
    let resultado;
    
    switch (tipoEmail) {
      case 'nueva_inscripcion':
        resultado = notificarNuevaInscripcion(datos);
        break;
        
      case 'confirmacion_inscripcion':
        resultado = enviarConfirmacionInscripcion(datos);
        break;
        
      case 'recordatorio_curso':
        resultado = enviarRecordatorioCurso(datos);
        break;
        
      case 'confirmacion_pago':
        resultado = enviarConfirmacionPago(datos);
        break;
        
      case 'cancelacion_curso':
        resultado = enviarCancelacionCurso(datos);
        break;
        
      case 'nueva_receta':
        resultado = enviarNuevaReceta(datos);
        break;
        
      case 'email_personalizado':
        resultado = enviarEmailPersonalizado(datos);
        break;
        
      default:
        throw new Error(`Tipo de email no reconocido: ${tipoEmail}`);
    }
    
    console.log('Email enviado exitosamente');
    
    // Crear respuesta exitosa
    const responseData = {
      success: true,
      message: 'Email enviado correctamente',
      tipo: tipoEmail,
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error en Gmail API Script:', error);
    
    // Crear respuesta de error
    const errorData = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorData))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Manejar peticiones OPTIONS (preflight CORS)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Manejar peticiones GET (para testing)
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const isTest = params.test === 'true';
    
    const response = {
      status: 'Gmail API Script funcionando correctamente',
      version: '1.0.1',
      timestamp: new Date().toISOString(),
      test: isTest,
      endpoints: [
        'POST /exec - Enviar email',
        'GET /exec?test=true - Test de conexión'
      ]
    };
    
    if (isTest) {
      response.message = 'Test de conexión exitoso';
      response.cors = 'Configurado correctamente';
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error en doGet:', error);
    
    const errorData = {
      status: 'Error en Gmail API Script',
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorData))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// FUNCIONES DE ENVÍO DE EMAILS
// ============================================================================

/**
 * Notificación de nueva inscripción al administrador
 */
function notificarNuevaInscripcion(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.nuevaInscripcion, datos);
  
  // Datos del alumno
  const alumnoInfo = [
    { label: 'Nombre', value: datos.alumno.nombre },
    { label: 'Email', value: datos.alumno.email },
    { label: 'Telefono', value: datos.alumno.telefono || 'No proporcionado' }
  ];

  // Detalles del curso
  const cursoInfo = [
    { label: 'Fecha', value: formatearFecha(datos.curso.fecha) },
    { label: 'Horario', value: datos.curso.horario },
    { label: 'Precio', value: `$${datos.curso.precio}` }
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Nueva Inscripcion', 'Se ha registrado una nueva inscripcion en el sistema')}
    
    ${createContentSection(`
      ${createInfoCard('Datos del Alumno', alumnoInfo)}
      
      <h2 style="margin: 30px 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso.nombre}</h2>
      ${createInfoCard('Detalles del Curso', cursoInfo)}
      
      ${createHighlight(`Estado del Pago: ${datos.pago?.estado || 'Pendiente'}${datos.pago?.metodo ? ` - Metodo: ${datos.pago.metodo}` : ''}`)}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">Revisa los detalles completos en el panel de administracion</p>
        ${createButton('Ir al Panel', `${CONFIG.emailConfig.websiteUrl}/admin`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Confirmación de inscripción al alumno
 */
function enviarConfirmacionInscripcion(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.confirmacionInscripcion, datos);
  
  // Datos del curso
  const cursoItems = [
    { label: 'Fecha', value: formatearFecha(datos.curso.fecha) },
    { label: 'Horario', value: datos.curso.horario },
    { label: 'Lugar', value: datos.sede?.direccion || 'Por confirmar' },
    { label: 'Instructor', value: datos.curso.instructor || 'Por confirmar' },
    { label: 'Precio', value: `$${datos.curso.precio}` }
  ];

  // Lista de información importante
  const infoItems = [
    'Te enviaremos un recordatorio 24 horas antes del curso',
    'Llega 15 minutos antes para el check-in',
    'Todos los materiales están incluidos',
    'Si tienes alguna alergia, comunícala al instructor'
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Inscripcion Confirmada!', `Hola ${datos.alumno.nombre}, tu inscripcion ha sido procesada exitosamente`)}
    
    ${createContentSection(`
      <h2 style="margin: 0 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso.nombre}</h2>
      ${createInfoCard('Detalles de tu Curso', cursoItems)}
      
      <h2 style="margin: 30px 0 15px 0; color: #333; font-size: 18px;">Que necesitas saber:</h2>
      ${createList(infoItems)}
      
      <div style="text-align: center; margin-top: 40px;">
        <p style="margin: 0 0 20px 0; color: #666;">Tienes alguna pregunta? Contactanos</p>
        ${createButton('Enviar Email', `mailto:${CONFIG.emailConfig.noreplyEmail}`, 'secondary')}
        ${createButton('Ver Mas Cursos', CONFIG.emailConfig.websiteUrl, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.alumno.email,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Recordatorio de curso (24 horas antes)
 */
function enviarRecordatorioCurso(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.recordatorioCurso, datos);
  
  // Detalles del curso
  const detalles = [
    { label: 'Manana', value: formatearFecha(datos.curso.fecha) },
    { label: 'Horario', value: datos.curso.horario },
    { label: 'Direccion', value: datos.sede?.direccion }
  ];

  // Lista de verificación
  const checklist = [
    'Llegar 15 minutos antes',
    'Traer delantal (opcional)',
    'Venir con ganas de cocinar',
    'Informar alergias al instructor'
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Tu curso es manana!', `Hola ${datos.alumno.nombre}, te recordamos tu curso programado`)}
    
    ${createContentSection(`
      ${createHighlight('Tu curso comienza en: 24 horas')}
      
      <h2 style="margin: 20px 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso.nombre}</h2>
      ${createInfoCard('', detalles)}
      
      <h2 style="margin: 30px 0 15px 0; color: #333; font-size: 18px;">Lista de verificacion:</h2>
      ${createList(checklist, '- ')}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">Necesitas reprogramar o cancelar?</p>
        ${createButton('Contactar Soporte', `mailto:${CONFIG.emailConfig.noreplyEmail}`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.alumno.email,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Confirmación de pago
 */
function enviarConfirmacionPago(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.confirmacionPago, datos);
  
  const htmlBody = `
    ${getHeaderHTML()}
    <div class="container">
      <div class="header-section">
        <h1>Pago Confirmado</h1>
        <p class="subtitle">Hola ${datos.alumno.nombre}, hemos recibido tu pago</p>
      </div>
      
      <div class="payment-card">
        <div class="payment-status">
          <div class="status-icon">OK</div>
          <div class="status-text">Pago Procesado Exitosamente</div>
        </div>
        
        <div class="payment-details">
          <h2>Detalles de la transaccion</h2>
          <div class="payment-grid">
            <div class="payment-item">
              <strong>Curso:</strong> ${datos.curso.nombre}
            </div>
            <div class="payment-item">
              <strong>Monto:</strong> $${datos.pago.monto}
            </div>
            <div class="payment-item">
              <strong>Método:</strong> ${datos.pago.metodo}
            </div>
            <div class="payment-item">
              <strong>Fecha:</strong> ${formatearFecha(datos.pago.fecha)}
            </div>
            ${datos.pago.referencia ? `
            <div class="payment-item">
              <strong>Referencia:</strong> ${datos.pago.referencia}
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h2>Proximos pasos:</h2>
        <ol>
          <li>Tu lugar en el curso está confirmado</li>
          <li>Recibirás un recordatorio 24 horas antes</li>
          <li>Guarda este email como comprobante</li>
        </ol>
      </div>
      
      <div class="action-section">
        <a href="${CONFIG.emailConfig.websiteUrl}" class="btn-primary">Ver Más Cursos</a>
      </div>
    </div>
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.alumno.email,
    cc: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Notificación de cancelación de curso
 */
function enviarCancelacionCurso(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.cancelacionCurso, datos);
  
  const htmlBody = `
    ${getHeaderHTML()}
    <div class="container">
      <div class="header-section">
        <h1>Curso Cancelado</h1>
        <p class="subtitle">Hola ${datos.alumno.nombre}, lamentamos informarte sobre la cancelacion</p>
      </div>
      
      <div class="cancellation-card">
        <div class="cancellation-reason">
          <h2>Informacion de la cancelacion</h2>
          <div class="reason-text">
            <strong>Curso:</strong> ${datos.curso.nombre}<br>
            <strong>Fecha original:</strong> ${formatearFecha(datos.curso.fecha)}<br>
            <strong>Motivo:</strong> ${datos.cancelacion.motivo || 'Razones operativas'}
          </div>
        </div>
        
        ${datos.cancelacion.nuevaFecha ? `
        <div class="reprogramacion">
          <h2>Nueva fecha disponible</h2>
          <div class="new-date">
            <strong>Nueva fecha:</strong> ${formatearFecha(datos.cancelacion.nuevaFecha)}<br>
            <strong>Horario:</strong> ${datos.cancelacion.nuevoHorario}
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="options-section">
        <h2>Tus opciones:</h2>
        <div class="options-grid">
          ${datos.cancelacion.nuevaFecha ? `
          <div class="option-card">
            <h3>Reprogramar</h3>
            <p>Cambiar a la nueva fecha disponible</p>
          </div>
          ` : ''}
          <div class="option-card">
            <h3>Reembolso</h3>
            <p>Solicitar devolucion completa del pago</p>
          </div>
          <div class="option-card">
            <h3>Credito</h3>
            <p>Usar el monto para otro curso</p>
          </div>
        </div>
      </div>
      
      <div class="action-section">
        <p>Contactanos para procesar tu opcion preferida</p>
        <a href="mailto:${CONFIG.emailConfig.noreplyEmail}" class="btn-primary">Contactar Soporte</a>
      </div>
    </div>
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.alumno.email,
    cc: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Envío de nueva receta
 */
function enviarNuevaReceta(datos) {
  const asunto = reemplazarPlantilla(CONFIG.asuntos.nuevaReceta, datos);
  
  // Meta informacion de la receta
  const recetaInfo = [
    { label: 'Tiempo', value: `${datos.receta.tiempoPreparacion} minutos` },
    { label: 'Porciones', value: `${datos.receta.porciones} porciones` },
    { label: 'Dificultad', value: datos.receta.dificultad }
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Nueva Receta Disponible', `Hola ${datos.alumno.nombre}, tenemos una nueva receta para ti`)}
    
    ${createContentSection(`
      ${datos.receta.imagen ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${datos.receta.imagen}" alt="${datos.receta.nombre}" style="width: 100%; max-width: 400px; border-radius: 8px; display: block; margin: 0 auto;">
      </div>` : ''}
      
      <h2 style="margin: 0 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.receta.nombre}</h2>
      
      <p style="margin: 0 0 20px 0; color: #666; text-align: center; font-style: italic;">${datos.receta.descripcion}</p>
      
      ${createInfoCard('', recetaInfo)}
      
      <h3 style="margin: 20px 0 10px 0; color: #333; font-size: 16px;">Ingredientes:</h3>
      ${createList(datos.receta.ingredientes || ['Ver en la plataforma'])}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">Accede a la receta completa con pasos detallados!</p>
        ${createButton('Ver Receta Completa', `${CONFIG.emailConfig.websiteUrl}/recetas/${datos.receta.id}`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.alumno.email,
    subject: asunto,
    htmlBody: htmlBody
  });
}

/**
 * Email personalizado (uso general)
 */
function enviarEmailPersonalizado(datos) {
  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader(datos.titulo || 'Mensaje de Club de Cocina', datos.subtitulo || '')}
    
    ${createContentSection(`
      <div style="margin: 20px 0; color: #333; line-height: 1.6;">
        ${datos.contenido || datos.mensaje}
      </div>
      
      ${datos.boton ? `
      <div style="text-align: center; margin-top: 30px;">
        ${createButton(datos.boton.texto, datos.boton.url, 'primary')}
      </div>
      ` : ''}
    `)}
    
    ${getFooterHTML()}
  `;
  
  return enviarEmail({
    to: datos.destinatario || datos.alumno?.email,
    subject: datos.asunto,
    htmlBody: htmlBody
  });
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Función principal para enviar emails
 */
function enviarEmail(opciones) {
  try {
    const { to, cc, bcc, subject, htmlBody, attachments } = opciones;
    
    console.log(`Enviando email a: ${to}`);
    console.log(`Asunto: ${subject}`);
    
    // Construir opciones para GmailApp
    const mailOptions = {
      htmlBody: htmlBody,
      name: CONFIG.emailConfig.remitente
    };
    
    // Agregar CC si existe
    if (cc) {
      mailOptions.cc = cc;
    }
    
    // Agregar BCC si existe
    if (bcc) {
      mailOptions.bcc = bcc;
    }
    
    // Agregar adjuntos si existen
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    // Enviar email usando la sintaxis correcta de GmailApp
    GmailApp.sendEmail(to, subject, '', mailOptions);
    
    return { success: true, message: 'Email enviado correctamente' };
    
  } catch (error) {
    console.error('Error enviando email:', error);
    console.error('Detalles del error:', error.toString());
    throw error;
  }
}

/**
 * Reemplazar variables en plantillas
 */
function reemplazarPlantilla(plantilla, datos) {
  let resultado = plantilla;
  
  // Reemplazos comunes
  const reemplazos = {
    '{{nombreCurso}}': datos.curso?.nombre || 'Curso',
    '{{nombreAlumno}}': datos.alumno?.nombre || 'Estimado/a',
    '{{nombreReceta}}': datos.receta?.nombre || 'Receta',
    '{{fecha}}': formatearFecha(datos.curso?.fecha || new Date()),
    '{{precio}}': datos.curso?.precio || '0'
  };
  
  Object.entries(reemplazos).forEach(([variable, valor]) => {
    resultado = resultado.replace(new RegExp(variable, 'g'), valor);
  });
  
  return resultado;
}

/**
 * Formatear fecha en español
 */
function formatearFecha(fecha) {
  if (!fecha) return 'Fecha por confirmar';
  
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return fechaObj.toLocaleDateString('es-AR', opciones);
}

/**
 * Crear adjunto desde base64
 */
function crearAdjuntoBase64(base64Data) {
  try {
    // Extraer tipo de archivo y datos
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)[1];
    
    // Decodificar base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data),
      mimeType,
      'comprobante-pago.pdf'
    );
    
    return blob;
    
  } catch (error) {
    console.error('Error creando adjunto:', error);
    return null;
  }
}

// ============================================================================
// COMPONENTES DE EMAIL SIMPLES (COMPATIBLE CON WEBMAILS)
// ============================================================================

/**
 * Header principal del email
 */
function createHeader(titulo, subtitulo) {
  return `
    <tr>
      <td style="background-color: ${CONFIG.emailConfig.colorPrimario}; color: #ffffff; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold;">${titulo}</h1>
        ${subtitulo ? `<p style="margin: 0; font-size: 16px; color: #ffffff;">${subtitulo}</p>` : ''}
      </td>
    </tr>
  `;
}

/**
 * Sección de contenido
 */
function createContentSection(contenido) {
  return `
    <tr>
      <td style="padding: 30px;">
        ${contenido}
      </td>
    </tr>
  `;
}

/**
 * Tarjeta de información
 */
function createInfoCard(titulo, items) {
  let itemsHtml = '';
  items.forEach(item => {
    itemsHtml += `
      <tr>
        <td style="padding: 12px 20px; background-color: #f8f9fa; border-left: 4px solid ${CONFIG.emailConfig.colorPrimario}; margin-bottom: 10px;">
          <strong>${item.label}:</strong> ${item.value}
        </td>
      </tr>
    `;
  });

  return `
    ${titulo ? `<h2 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">${titulo}</h2>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
      ${itemsHtml}
    </table>
  `;
}

/**
 * Botón principal
 */
function createButton(texto, url, tipo = 'primary') {
  const bgColor = tipo === 'primary' ? CONFIG.emailConfig.colorPrimario : '#6c757d';
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto;">
      <tr>
        <td style="background-color: ${bgColor}; padding: 15px 30px; text-align: center;">
          <a href="${url}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: block;">${texto}</a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Lista simple
 */
function createList(items, prefix = '- ') {
  let listHtml = '';
  items.forEach((item, index) => {
    listHtml += `
      <tr>
        <td style="padding: 8px 0;">
          ${prefix}${item}
        </td>
      </tr>
    `;
  });

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${listHtml}
    </table>
  `;
}

/**
 * Destacado / Alert
 */
function createHighlight(contenido, color = CONFIG.emailConfig.colorPrimario) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #f8f9fa; border: 2px solid ${color}; padding: 20px; text-align: center;">
          ${contenido}
        </td>
      </tr>
    </table>
  `;
}

// ============================================================================
// PLANTILLAS HTML
// ============================================================================

/**
 * Header HTML común - Diseño simple compatible con webmails
 */
function getHeaderHTML() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333333; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px;">
  `;
}

/**
 * Footer HTML común - Diseño simple compatible con webmails
 */
function getFooterHTML() {
  return `
              <!-- Footer -->
              <tr>
                <td style="background-color: #2c5f2d; color: #ffffff; padding: 30px; text-align: center;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px;">Club de Cocina Colmena</h3>
                        <p style="margin: 0; color: #ffffff; font-size: 14px;">Donde la pasión por la cocina se encuentra</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #4a7c59; padding-top: 20px;">
                        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 12px;">
                          Email: ${CONFIG.emailConfig.noreplyEmail} | Web: ${CONFIG.emailConfig.websiteUrl}
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 11px;">
                          Si no deseas recibir estos emails, puedes 
                          <a href="mailto:${CONFIG.emailConfig.noreplyEmail}?subject=Dar de baja" style="color: #ff6b35; text-decoration: underline;">darte de baja aquí</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================================================
// FUNCIÓN DE TESTING (OPCIONAL)
// ============================================================================

/**
 * Función para testing - No eliminar
 */
function testEmail() {
  const datosTest = {
    tipo: 'confirmacion_inscripcion',
    alumno: {
      nombre: 'Maria Gonzalez',
      email: 'test@gmail.com'
    },
    curso: {
      nombre: 'Cocina Italiana Basica',
      fecha: new Date(),
      horario: '18:00 - 20:00',
      precio: 3500,
      instructor: 'Chef Roberto'
    },
    sede: {
      direccion: 'Av. Corrientes 1234, CABA'
    }
  };
  
  console.log('Ejecutando test...');
  const resultado = enviarConfirmacionInscripcion(datosTest);
  console.log('Test completado:', resultado);
}