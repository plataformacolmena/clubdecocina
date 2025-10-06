/**
 * ============================================================================
 * CLUB DE COCINA COLMENA - GMAIL API SCRIPT (CORS DEFINITIVO)
 * ============================================================================
 * 
 * SOLUCIÓN DEFINITIVA PARA CORS CON GITHUB PAGES
 * 
 * CONFIGURACIÓN OBLIGATORIA DEL DEPLOYMENT:
 * 1. Ejecutar como: "Yo (tu email)"
 * 2. Acceso: "Cualquier persona" ← CRÍTICO para CORS
 * 3. Nueva implementación en cada actualización
 * 
 * IMPORTANTE: NO usar .setHeaders() - Apps Script lo maneja automáticamente
 * cuando se despliega con "Cualquier persona"
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURACIÓN PRINCIPAL
// ============================================================================

const CONFIG = {
  // Email del administrador
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
// FUNCIONES PRINCIPALES (ENDPOINTS)
// ============================================================================

/**
 * Manejar peticiones POST (endpoint principal)
 * Maneja tanto application/json como text/plain para evitar preflight CORS
 */
function doPost(e) {
  // Log de debugging
  console.log('=== APPS SCRIPT REQUEST ===');
  console.log('Headers:', JSON.stringify(e || {}));
  console.log('PostData:', e?.postData?.contents || 'No postData');
  console.log('Content-Type:', e?.postData?.type || 'No content type');
  
  try {
    // Parsear datos de la petición
    if (!e?.postData?.contents) {
      throw new Error('No se recibieron datos en la petición');
    }
    
    // Parsear JSON independientemente del Content-Type
    // (Funciona tanto para application/json como text/plain)
    const datos = JSON.parse(e.postData.contents);
    const tipoEmail = datos.tipo;
    
    console.log(`Procesando email tipo: ${tipoEmail}`);
    
    let resultado;
    
    // Procesar según el tipo de email
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
        
      case 'admin_test':
        resultado = enviarEmailTest(datos);
        break;
        
      default:
        throw new Error(`Tipo de email no reconocido: ${tipoEmail}`);
    }
    
    console.log('Email procesado exitosamente:', resultado);
    
    // RESPUESTA EXITOSA (CORS automático por deployment)
    const responseData = {
      success: true,
      message: 'Email enviado correctamente',
      tipo: tipoEmail,
      timestamp: new Date().toISOString(),
      resultado: resultado
    };
    
    return createCORSResponse(responseData);
      
  } catch (error) {
    console.error('ERROR en Apps Script:', error.toString());
    
    // RESPUESTA DE ERROR (CORS automático por deployment)
    const errorData = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString(),
      debug: {
        hasPostData: !!(e?.postData?.contents),
        dataLength: e?.postData?.contents?.length || 0
      }
    };
    
    return createCORSResponse(errorData, 500);
  }
}

/**
 * Manejar peticiones OPTIONS (preflight CORS)
 * NOTA: Con text/plain no debería haber preflight, pero mantenemos por seguridad
 */
function doOptions(e) {
  console.log('=== OPTIONS REQUEST (PREFLIGHT) ===');
  console.log('Origin:', e?.parameters?.origin || 'No origin');
  console.log('⚠️ ADVERTENCIA: Si ves esto, significa que sigue habiendo preflight');
  console.log('⚠️ Verifica que estés usando Content-Type: text/plain en el frontend');
  
  // Apps Script maneja CORS automáticamente en Web Apps públicos
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Manejar peticiones GET (para testing y debugging)
 */
function doGet(e) {
  console.log('=== GET REQUEST ===');
  
  try {
    const params = e?.parameter || {};
    const isTest = params.test === 'true';
    const isCorsTest = params.cors === 'true';
    
    const response = {
      status: 'Apps Script funcionando correctamente',
      version: '2.0.0-cors-definitivo',
      timestamp: new Date().toISOString(),
      deployment: 'Público con CORS automático',
      test: isTest,
      cors: isCorsTest,
      endpoints: {
        POST: '/exec - Enviar email',
        GET: '/exec?test=true - Test básico',
        OPTIONS: '/exec - Preflight CORS'
      }
    };
    
    if (isTest) {
      response.testResult = 'Conexión exitosa desde ' + (params.origin || 'origen desconocido');
    }
    
    if (isCorsTest) {
      response.corsInfo = {
        deploymentType: 'Web App público',
        accessLevel: 'Cualquier persona',
        corsHandling: 'Automático por Google Apps Script'
      };
    }
    
    return createCORSResponse(response);
      
  } catch (error) {
    console.error('Error en GET:', error);
    
    return createCORSResponse({
      status: 'Error en Apps Script',
      error: error.toString(),
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// ============================================================================
// FUNCIÓN DE RESPUESTA CON CORS AUTOMÁTICO
// ============================================================================

/**
 * Crear respuesta JSON con CORS automático de Apps Script
 * NO usar .setHeaders() - Apps Script lo maneja automáticamente
 */
function createCORSResponse(data, statusCode = 200) {
  console.log('Creando respuesta CORS:', JSON.stringify(data));
  
  // Apps Script maneja CORS automáticamente cuando:
  // 1. Se despliega como Web App
  // 2. Con acceso "Cualquier persona"
  // 3. NO se usan .setHeaders() manuales
  
  const output = ContentService.createTextOutput(JSON.stringify(data, null, 2));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // NO agregar headers manuales - Apps Script los maneja automáticamente
  return output;
}

// ============================================================================
// FUNCIONES DE ENVÍO DE EMAILS
// ============================================================================

/**
 * Notificación de nueva inscripción al administrador
 */
function notificarNuevaInscripcion(datos) {
  console.log('Enviando notificación de nueva inscripción');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.nuevaInscripcion, datos);
  
  const alumnoInfo = [
    { label: 'Nombre', value: datos.alumno?.nombre || 'No especificado' },
    { label: 'Email', value: datos.alumno?.email || 'No especificado' },
    { label: 'Telefono', value: datos.alumno?.telefono || 'No proporcionado' }
  ];

  const cursoInfo = [
    { label: 'Fecha', value: formatearFecha(datos.curso?.fecha) },
    { label: 'Horario', value: datos.curso?.horario || 'Por confirmar' },
    { label: 'Precio', value: `$${datos.curso?.precio || 0}` }
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Nueva Inscripcion', 'Se ha registrado una nueva inscripcion en el sistema')}
    
    ${createContentSection(`
      ${createInfoCard('Datos del Alumno', alumnoInfo)}
      
      <h2 style="margin: 30px 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso?.nombre || 'Curso'}</h2>
      ${createInfoCard('Detalles del Curso', cursoInfo)}
      
      ${createHighlight(`Estado del Pago: ${datos.pago?.estado || 'Pendiente'}${datos.pago?.metodo ? ` - Método: ${datos.pago.metodo}` : ''}`)}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">Revisa los detalles completos en el panel de administración</p>
        ${createButton('Ir al Panel', `${CONFIG.emailConfig.websiteUrl}/admin`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Notificación admin enviada:', resultado);
  return resultado;
}

/**
 * Confirmación de inscripción al alumno
 */
function enviarConfirmacionInscripcion(datos) {
  console.log('Enviando confirmación de inscripción al alumno');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.confirmacionInscripcion, datos);
  
  const cursoItems = [
    { label: 'Fecha', value: formatearFecha(datos.curso?.fecha) },
    { label: 'Horario', value: datos.curso?.horario || 'Por confirmar' },
    { label: 'Lugar', value: datos.sede?.direccion || 'Por confirmar' },
    { label: 'Instructor', value: datos.curso?.instructor || 'Por confirmar' },
    { label: 'Precio', value: `$${datos.curso?.precio || 0}` }
  ];

  const infoItems = [
    'Te enviaremos un recordatorio 24 horas antes del curso',
    'Llega 15 minutos antes para el check-in',
    'Todos los materiales están incluidos',
    'Si tienes alguna alergia, comunícala al instructor'
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Inscripción Confirmada!', `Hola ${datos.alumno?.nombre || 'Estimado/a'}, tu inscripción ha sido procesada exitosamente`)}
    
    ${createContentSection(`
      <h2 style="margin: 0 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso?.nombre || 'Tu Curso'}</h2>
      ${createInfoCard('Detalles de tu Curso', cursoItems)}
      
      <h2 style="margin: 30px 0 15px 0; color: #333; font-size: 18px;">Qué necesitas saber:</h2>
      ${createList(infoItems)}
      
      <div style="text-align: center; margin-top: 40px;">
        <p style="margin: 0 0 20px 0; color: #666;">¿Tienes alguna pregunta? Contáctanos</p>
        ${createButton('Enviar Email', `mailto:${CONFIG.emailConfig.noreplyEmail}`, 'secondary')}
        ${createButton('Ver Más Cursos', CONFIG.emailConfig.websiteUrl, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.alumno?.email || 'test@example.com',
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Confirmación alumno enviada:', resultado);
  return resultado;
}

/**
 * Recordatorio de curso (24 horas antes)
 */
function enviarRecordatorioCurso(datos) {
  console.log('Enviando recordatorio de curso');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.recordatorioCurso, datos);
  
  const detalles = [
    { label: 'Mañana', value: formatearFecha(datos.curso?.fecha) },
    { label: 'Horario', value: datos.curso?.horario || 'Por confirmar' },
    { label: 'Dirección', value: datos.sede?.direccion || 'Por confirmar' }
  ];

  const checklist = [
    'Llegar 15 minutos antes',
    'Traer delantal (opcional)',
    'Venir con ganas de cocinar',
    'Informar alergias al instructor'
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('¡Tu curso es mañana!', `Hola ${datos.alumno?.nombre || 'Estimado/a'}, te recordamos tu curso programado`)}
    
    ${createContentSection(`
      ${createHighlight('Tu curso comienza en: 24 horas')}
      
      <h2 style="margin: 20px 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.curso?.nombre || 'Tu Curso'}</h2>
      ${createInfoCard('', detalles)}
      
      <h2 style="margin: 30px 0 15px 0; color: #333; font-size: 18px;">Lista de verificación:</h2>
      ${createList(checklist, '✓ ')}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">¿Necesitas reprogramar o cancelar?</p>
        ${createButton('Contactar Soporte', `mailto:${CONFIG.emailConfig.noreplyEmail}`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.alumno?.email || 'test@example.com',
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Recordatorio enviado:', resultado);
  return resultado;
}

/**
 * Confirmación de pago
 */
function enviarConfirmacionPago(datos) {
  console.log('Enviando confirmación de pago');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.confirmacionPago, datos);
  
  const htmlBody = `
    ${getHeaderHTML()}
    <div class="container">
      <div class="header-section">
        <h1>Pago Confirmado</h1>
        <p class="subtitle">Hola ${datos.alumno?.nombre || 'Estimado/a'}, hemos recibido tu pago</p>
      </div>
      
      <div class="payment-card">
        <div class="payment-status">
          <div class="status-icon">✅</div>
          <div class="status-text">Pago Procesado Exitosamente</div>
        </div>
        
        <div class="payment-details">
          <h2>Detalles de la transacción</h2>
          <div class="payment-grid">
            <div class="payment-item">
              <strong>Curso:</strong> ${datos.curso?.nombre || 'Curso'}
            </div>
            <div class="payment-item">
              <strong>Monto:</strong> $${datos.pago?.monto || datos.curso?.precio || 0}
            </div>
            <div class="payment-item">
              <strong>Método:</strong> ${datos.pago?.metodo || 'No especificado'}
            </div>
            <div class="payment-item">
              <strong>Fecha:</strong> ${formatearFecha(datos.pago?.fecha || new Date())}
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${CONFIG.emailConfig.websiteUrl}" style="background-color: ${CONFIG.emailConfig.colorPrimario}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Más Cursos</a>
      </div>
    </div>
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.alumno?.email || 'test@example.com',
    cc: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Confirmación de pago enviada:', resultado);
  return resultado;
}

/**
 * Notificación de cancelación de curso
 */
function enviarCancelacionCurso(datos) {
  console.log('Enviando notificación de cancelación');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.cancelacionCurso, datos);
  
  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Curso Cancelado', `Hola ${datos.alumno?.nombre || 'Estimado/a'}, lamentamos informarte sobre la cancelación`)}
    
    ${createContentSection(`
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #856404;">Información de la cancelación</h2>
        <p><strong>Curso:</strong> ${datos.curso?.nombre || 'Curso'}</p>
        <p><strong>Fecha original:</strong> ${formatearFecha(datos.curso?.fecha)}</p>
        <p><strong>Motivo:</strong> ${datos.cancelacion?.motivo || 'Razones operativas'}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">Contáctanos para procesar tu reembolso o reprogramación</p>
        ${createButton('Contactar Soporte', `mailto:${CONFIG.emailConfig.noreplyEmail}`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.alumno?.email || 'test@example.com',
    cc: CONFIG.adminEmail,
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Cancelación enviada:', resultado);
  return resultado;
}

/**
 * Envío de nueva receta
 */
function enviarNuevaReceta(datos) {
  console.log('Enviando nueva receta');
  
  const asunto = reemplazarPlantilla(CONFIG.asuntos.nuevaReceta, datos);
  
  const recetaInfo = [
    { label: 'Tiempo', value: `${datos.receta?.tiempoPreparacion || 30} minutos` },
    { label: 'Porciones', value: `${datos.receta?.porciones || 4} porciones` },
    { label: 'Dificultad', value: datos.receta?.dificultad || 'Intermedio' }
  ];

  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('Nueva Receta Disponible', `Hola ${datos.alumno?.nombre || 'Estimado/a'}, tenemos una nueva receta para ti`)}
    
    ${createContentSection(`
      <h2 style="margin: 0 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario}; font-size: 20px; text-align: center;">${datos.receta?.nombre || 'Receta Especial'}</h2>
      
      <p style="margin: 0 0 20px 0; color: #666; text-align: center; font-style: italic;">${datos.receta?.descripcion || 'Una deliciosa receta para compartir'}</p>
      
      ${createInfoCard('', recetaInfo)}
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin: 0 0 20px 0; color: #666;">¡Accede a la receta completa con pasos detallados!</p>
        ${createButton('Ver Receta Completa', `${CONFIG.emailConfig.websiteUrl}/recetas/${datos.receta?.id || 'nueva'}`, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.alumno?.email || 'test@example.com',
    subject: asunto,
    htmlBody: htmlBody
  });
  
  console.log('Nueva receta enviada:', resultado);
  return resultado;
}

/**
 * Email personalizado
 */
function enviarEmailPersonalizado(datos) {
  console.log('Enviando email personalizado');
  
  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader(datos.titulo || 'Mensaje de Club de Cocina', datos.subtitulo || '')}
    
    ${createContentSection(`
      <div style="margin: 20px 0; color: #333; line-height: 1.6;">
        ${datos.contenido || datos.mensaje || 'Mensaje personalizado del Club de Cocina Colmena'}
      </div>
      
      ${datos.boton ? `
      <div style="text-align: center; margin-top: 30px;">
        ${createButton(datos.boton.texto, datos.boton.url, 'primary')}
      </div>
      ` : ''}
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.destinatario || datos.alumno?.email || 'test@example.com',
    subject: datos.asunto || 'Mensaje del Club de Cocina',
    htmlBody: htmlBody
  });
  
  console.log('Email personalizado enviado:', resultado);
  return resultado;
}

/**
 * Email de prueba para testing
 */
function enviarEmailTest(datos) {
  console.log('Enviando email de prueba');
  
  const htmlBody = `
    ${getHeaderHTML()}
    ${createHeader('✅ Prueba de Sistema de Emails', 'Email de prueba desde el sistema')}
    
    ${createContentSection(`
      <div style="margin: 20px 0; color: #333; line-height: 1.6;">
        <p><strong>✅ ¡El sistema de emails está funcionando correctamente!</strong></p>
        <p>Este es un email de prueba enviado desde el sistema de configuraciones.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: ${CONFIG.emailConfig.colorPrimario};">Detalles de la prueba:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Timestamp:</strong> ${datos.timestamp || new Date().toISOString()}</li>
            <li><strong>Mensaje:</strong> ${datos.testMessage || 'Prueba del sistema'}</li>
            <li><strong>Apps Script:</strong> Funcionando correctamente</li>
            <li><strong>CORS:</strong> Configurado automáticamente</li>
            <li><strong>Deployment:</strong> Acceso público configurado</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>✅ Nota:</strong> Si recibes este email, significa que la integración con Gmail está configurada correctamente y el sistema puede enviar notificaciones automáticas sin problemas de CORS.
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        ${createButton('Volver al Panel', CONFIG.emailConfig.websiteUrl, 'primary')}
      </div>
    `)}
    
    ${getFooterHTML()}
  `;
  
  const resultado = enviarEmail({
    to: datos.destinatario || CONFIG.adminEmail,
    subject: '✅ Prueba de Sistema CORS - Club de Cocina',
    htmlBody: htmlBody
  });
  
  console.log('Email de prueba enviado:', resultado);
  return resultado;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Función principal para enviar emails usando GmailApp
 */
function enviarEmail(opciones) {
  try {
    const { to, cc, bcc, subject, htmlBody, attachments } = opciones;
    
    console.log(`📧 Enviando email a: ${to}`);
    console.log(`📝 Asunto: ${subject}`);
    
    // Validar destinatario
    if (!to || to === 'test@example.com') {
      console.warn('⚠️ Email de prueba - no se envía realmente');
      return { 
        success: true, 
        message: 'Email de prueba procesado (no enviado)',
        destinatario: to 
      };
    }
    
    // Construir opciones para GmailApp
    const mailOptions = {
      htmlBody: htmlBody,
      name: CONFIG.emailConfig.remitente
    };
    
    // Agregar destinatarios adicionales
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;
    if (attachments && attachments.length > 0) mailOptions.attachments = attachments;
    
    // Enviar email
    GmailApp.sendEmail(to, subject, '', mailOptions);
    
    console.log('✅ Email enviado exitosamente');
    return { 
      success: true, 
      message: 'Email enviado correctamente',
      destinatario: to,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.toString());
    throw new Error(`Error enviando email: ${error.toString()}`);
  }
}

/**
 * Reemplazar variables en plantillas
 */
function reemplazarPlantilla(plantilla, datos) {
  let resultado = plantilla;
  
  const reemplazos = {
    '{{nombreCurso}}': datos.curso?.nombre || 'Curso',
    '{{nombreAlumno}}': datos.alumno?.nombre || 'Estimado/a',
    '{{nombreReceta}}': datos.receta?.nombre || 'Receta',
    '{{fecha}}': formatearFecha(datos.curso?.fecha || new Date()),
    '{{precio}}': datos.curso?.precio || '0'
  };
  
  Object.entries(reemplazos).forEach(([variable, valor]) => {
    resultado = resultado.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
  });
  
  return resultado;
}

/**
 * Formatear fecha en español
 */
function formatearFecha(fecha) {
  if (!fecha) return 'Fecha por confirmar';
  
  try {
    let fechaObj;
    
    // Manejar diferentes formatos de fecha
    if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    } else if (fecha.seconds) {
      // Timestamp de Firebase
      fechaObj = new Date(fecha.seconds * 1000);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      fechaObj = new Date(fecha);
    }
    
    // Validar fecha
    if (isNaN(fechaObj.getTime())) {
      return 'Fecha por confirmar';
    }
    
    const opciones = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return fechaObj.toLocaleDateString('es-AR', opciones);
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha por confirmar';
  }
}

// ============================================================================
// COMPONENTES DE EMAIL (COMPATIBLES CON WEBMAILS)
// ============================================================================

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

function createContentSection(contenido) {
  return `
    <tr>
      <td style="padding: 30px;">
        ${contenido}
      </td>
    </tr>
  `;
}

function createInfoCard(titulo, items) {
  let itemsHtml = '';
  if (items && items.length > 0) {
    items.forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 12px 20px; background-color: #f8f9fa; border-left: 4px solid ${CONFIG.emailConfig.colorPrimario}; margin-bottom: 10px;">
            <strong>${item.label}:</strong> ${item.value}
          </td>
        </tr>
      `;
    });
  }

  return `
    ${titulo ? `<h2 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">${titulo}</h2>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
      ${itemsHtml}
    </table>
  `;
}

function createButton(texto, url, tipo = 'primary') {
  const bgColor = tipo === 'primary' ? CONFIG.emailConfig.colorPrimario : '#6c757d';
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto;">
      <tr>
        <td style="background-color: ${bgColor}; padding: 15px 30px; text-align: center; border-radius: 5px;">
          <a href="${url}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: block;">${texto}</a>
        </td>
      </tr>
    </table>
  `;
}

function createList(items, prefix = '• ') {
  let listHtml = '';
  if (items && items.length > 0) {
    items.forEach((item) => {
      listHtml += `
        <tr>
          <td style="padding: 8px 0;">
            ${prefix}${item}
          </td>
        </tr>
      `;
    });
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${listHtml}
    </table>
  `;
}

function createHighlight(contenido, color = CONFIG.emailConfig.colorPrimario) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #f8f9fa; border: 2px solid ${color}; padding: 20px; text-align: center; border-radius: 8px;">
          <strong>${contenido}</strong>
        </td>
      </tr>
    </table>
  `;
}

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

function getFooterHTML() {
  return `
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
// FUNCIÓN DE TESTING MANUAL
// ============================================================================

/**
 * Función para testing manual (ejecutar desde Apps Script)
 */
function testEmailManual() {
  console.log('=== INICIANDO TEST MANUAL ===');
  
  const datosTest = {
    tipo: 'admin_test',
    destinatario: CONFIG.adminEmail,
    timestamp: new Date().toISOString(),
    testMessage: 'Prueba manual desde Apps Script - CORS definitivo',
    alumno: { nombre: 'Test Usuario' }
  };
  
  try {
    const resultado = enviarEmailTest(datosTest);
    console.log('✅ Test manual completado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Error en test manual:', error);
    return { success: false, error: error.toString() };
  }
}