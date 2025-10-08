/**
 * ============================================================================
 * SERVICIO DE EMAILS - INTEGRACIÓN CON APPS SCRIPT
 * ============================================================================
 * 
 * Módulo para integrar el sistema de emails con Google Apps Script
 * Maneja todos los tipos de notificaciones automáticas del sistema
 */

// Importar Firebase siguiendo el patrón establecido en el sistema
import { db, APP_CONFIG } from './firebase-config.js';
import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class EmailService {
    constructor() {
        this.scriptConfig = null;
        this.envioConfig = null;
        this.adminEmail = null;
        this.initialized = false;
    }

    /**
     * Inicializar el servicio cargando configuraciones
     */
    async initialize() {
        try {
            await this.loadConfigurations();
            this.initialized = true;
            console.log('✅ EmailService inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando EmailService:', error);
            this.initialized = false;
        }
    }

    /**
     * Cargar configuraciones desde Firestore
     */
    async loadConfigurations() {
        try {
            // Cargar configuración de Apps Script
            const scriptDoc = await getDoc(doc(db, 'configuraciones', 'apps_script'));
            if (scriptDoc.exists()) {
                this.scriptConfig = scriptDoc.data();
            }

            // Cargar configuración de envío
            const envioDoc = await getDoc(doc(db, 'configuraciones', 'envio'));
            if (envioDoc.exists()) {
                this.envioConfig = envioDoc.data();
            }

            // Cargar email del admin principal
            this.adminEmail = await this.getAdminPrincipalEmail();

            // Verificar que tenemos las configuraciones necesarias
            if (!this.scriptConfig?.url || !this.scriptConfig?.activo) {
                throw new Error('Apps Script no configurado o desactivado');
            }

            if (!this.adminEmail) {
                console.warn('⚠️ No se encontró email del admin principal');
            }

        } catch (error) {
            console.error('Error cargando configuraciones de email:', error);
            throw error;
        }
    }

    /**
     * Obtener email del admin principal desde Firestore
     */
    async getAdminPrincipalEmail() {
        try {
            const adminsRef = collection(db, APP_CONFIG.adminSystem.collection);
            const q = query(
                adminsRef,
                where('activo', '==', true)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                // Obtener todos los admins activos y ordenar en JavaScript (sin índice)
                const adminsActivos = snapshot.docs.map(doc => ({
                    email: doc.data().email,
                    fechaCreacion: doc.data().fechaCreacion || doc.data().created || new Date(0)
                }));
                
                // Ordenar por fecha de creación (más antiguo primero)
                adminsActivos.sort((a, b) => {
                    const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
                    const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
                    return fechaA - fechaB;
                });
                
                const adminPrincipal = adminsActivos[0];
                console.log(`📧 Admin principal encontrado: ${adminPrincipal.email}`);
                return adminPrincipal.email;
            }
            
            console.warn('⚠️ No se encontró ningún admin activo');
            return null;
        } catch (error) {
            console.error('Error obteniendo admin principal:', error);
            return null;
        }
    }

    /**
     * Verificar si un tipo de evento está habilitado
     */
    isNotificationEnabled(type) {
        if (!this.envioConfig) return false;
        return this.envioConfig.eventosNotificacion?.[type] === true;
    }

    /**
     * Buscar plantilla personalizada por tipo
     */
    async getPlantillaByTipo(tipo) {
        try {
            const plantillasRef = collection(db, 'plantillas_email');
            const q = query(
                plantillasRef, 
                where('tipo', '==', tipo),
                where('activa', '==', true)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const plantilla = snapshot.docs[0].data();
                console.log(`📧 Plantilla personalizada encontrada para tipo: ${tipo}`);
                return plantilla;
            }
            
            return null;
        } catch (error) {
            console.error('Error buscando plantilla:', error);
            return null;
        }
    }

    /**
     * Reemplazar variables en texto
     */
    reemplazarVariables(texto, datos) {
        if (!texto || !datos) return texto;

        let resultado = texto;
        
        // Variables disponibles
        const variables = {
            nombreAlumno: datos.alumno?.nombre || datos.usuarioNombre || 'Estimado/a',
            emailAlumno: datos.alumno?.email || datos.usuarioEmail || '',
            nombreCurso: datos.curso?.nombre || '',
            fechaCurso: datos.curso?.fecha ? 
                (typeof datos.curso.fecha === 'string' ? datos.curso.fecha : new Date(datos.curso.fecha).toLocaleDateString('es-ES')) : '',
            horarioCurso: datos.curso?.horario || '',
            precioCurso: datos.curso?.precio ? `$${datos.curso.precio}` : '',
            direccionSede: datos.sede?.direccion || ''
        };

        // Reemplazar cada variable
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            resultado = resultado.replace(regex, variables[key]);
        });

        return resultado;
    }

    /**
     * Enviar email usando Apps Script
     */
    async sendEmail(tipo, datos, emailDestino = null) {
        try {
            // Verificar inicialización
            if (!this.initialized) {
                await this.initialize();
            }

            // Verificar configuración
            if (!this.scriptConfig?.url || !this.scriptConfig?.activo) {
                console.log('📧 Apps Script desactivado, email no enviado');
                return { success: false, reason: 'Apps Script desactivado' };
            }

            // Buscar plantilla obligatoria
            const plantilla = await this.getPlantillaByTipo(tipo);
            
            if (!plantilla) {
                console.log(`❌ Plantilla no generada para tipo: ${tipo}`);
                return { success: false, reason: 'Plantilla no generada' };
            }
            
            // Procesar plantilla con variables
            const asuntoFinal = this.reemplazarVariables(plantilla.asunto, datos);
            const contenidoFinal = this.reemplazarVariables(plantilla.plantilla, datos);
            
            const payload = {
                tipo: 'email_personalizado', // Tipo fijo para Apps Script
                asunto: asuntoFinal,
                contenido: contenidoFinal,
                destinatario: emailDestino || datos.alumno?.email || datos.usuarioEmail || datos.destinatario,
                timestamp: new Date().toISOString()
            };
            
            console.log(`📧 Enviando email con plantilla: ${tipo}`);

            console.log(`📧 Enviando email tipo: ${tipo}`);
            console.log('📋 Datos del email:', JSON.stringify(payload, null, 2));

            // Realizar petición al Apps Script (evitando preflight CORS)
            // Usar text/plain para que sea "simple request" sin preflight
            const response = await fetch(this.scriptConfig.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Email enviado exitosamente:', result);
                return { success: true, data: result };
            } else {
                throw new Error(result.error || 'Error desconocido en Apps Script');
            }

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return { 
                success: false, 
                error: error.message,
                reason: 'Error de conexión o Apps Script'
            };
        }
    }

    /**
     * NOTIFICACIONES ESPECÍFICAS DEL SISTEMA
     */

    /**
     * Enviar email unificado (mismo email a admin y alumno)
     */
    async enviarEmailUnificado(tipoEvento, datos, emailAlumno) {
        // Verificar si el evento está habilitado
        if (!this.isNotificationEnabled(tipoEvento)) {
            console.log(`📧 Evento ${tipoEvento} deshabilitado en configuración`);
            return { success: false, reason: 'Evento deshabilitado' };
        }

        const results = [];

        // Enviar al alumno
        console.log(`📧 Enviando ${tipoEvento} al alumno: ${emailAlumno}`);
        const alumnoResult = await this.sendEmail(tipoEvento, datos, emailAlumno);
        results.push({ destinatario: 'alumno', email: emailAlumno, ...alumnoResult });

        // Enviar al admin principal (si existe)
        if (this.adminEmail) {
            console.log(`📧 Enviando ${tipoEvento} al admin: ${this.adminEmail}`);
            const adminResult = await this.sendEmail(tipoEvento, datos, this.adminEmail);
            results.push({ destinatario: 'admin', email: this.adminEmail, ...adminResult });
        } else {
            console.warn('⚠️ No se pudo enviar al admin: email no configurado');
            results.push({ destinatario: 'admin', email: null, success: false, reason: 'Admin email no configurado' });
        }

        return {
            success: results.some(r => r.success),
            tipoEvento: tipoEvento,
            results: results
        };
    }

    /**
     * Email de nueva inscripción (admin y alumno)
     */
    async enviarEmailInscripcion(inscripcion, curso, sede = null) {
        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail,
                telefono: inscripcion.telefono || 'No proporcionado'
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                horario: curso.horario || 'Por confirmar',
                precio: curso.precio
            },
            sede: sede,
            estado: inscripcion.estado,
            metodoPago: inscripcion.metodoPago || 'No especificado'
        };

        return await this.enviarEmailUnificado('nuevaInscripcion', datos, inscripcion.usuarioEmail);
    }

    /**
     * Confirmación de inscripción (admin y alumno)
     */
    async enviarConfirmacionInscripcion(inscripcion, curso, sede = null) {
        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail,
                telefono: inscripcion.telefono || 'No proporcionado'
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                horario: curso.horario || 'Por confirmar',
                precio: curso.precio
            },
            sede: sede,
            estado: inscripcion.estado
        };

        return await this.enviarEmailUnificado('confirmacionInscripcion', datos, inscripcion.usuarioEmail);
    }

    /**
     * Notificar pago recibido (admin y alumno)
     */
    async notificarPagoRecibido(inscripcion, curso) {
        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail,
                telefono: inscripcion.telefono || 'No proporcionado'
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                precio: inscripcion.costo
            },
            pago: {
                estado: 'pagado',
                metodo: inscripcion.metodoPago,
                fecha: new Date().toLocaleDateString('es-ES'),
                monto: inscripcion.costo
            }
        };

        return await this.enviarEmailUnificado('pagoRecibido', datos, inscripcion.usuarioEmail);
    }

    /**
     * Confirmación de pago al alumno
     */
    async enviarConfirmacionPago(inscripcion, curso) {
        if (!this.isNotificationEnabled('confirmacionPago', 'alumno')) {
            console.log('📧 Confirmación de pago deshabilitada');
            return { success: false, reason: 'Notificación deshabilitada' };
        }

        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                precio: inscripcion.costo
            },
            pago: {
                monto: inscripcion.costo,
                metodo: inscripcion.metodoPago,
                fecha: new Date()
            }
        };

        return await this.sendEmail('pago', datos);
    }

    /**
     * Notificar cancelación de curso (admin y alumno)
     */
    async notificarCancelacionCurso(inscripcion, curso, motivo = null, canceladoPor = 'admin') {
        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail,
                telefono: inscripcion.telefono || 'No proporcionado'
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                horario: curso.horario || 'Por confirmar',
                precio: curso.precio
            },
            cancelacion: {
                motivo: motivo || 'Cancelación de curso',
                canceladoPor: canceladoPor,
                fecha: new Date().toLocaleDateString('es-ES')
            }
        };

        // Para cancelaciones, enviamos a ambos independientemente de quién canceló
        // La plantilla puede personalizar el mensaje según la variable {{canceladoPor}}
        return await this.enviarEmailUnificado('cancelacionCurso', datos, inscripcion.usuarioEmail);
    }

    /**
     * Enviar recordatorio de curso
     */
    async enviarRecordatorio(inscripcion, curso, sede = null) {
        if (!this.isNotificationEnabled('recordatorioCurso', 'alumno')) {
            console.log('📧 Recordatorio de curso deshabilitado');
            return { success: false, reason: 'Notificación deshabilitada' };
        }

        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                horario: curso.horario || 'Por confirmar'
            },
            sede: sede
        };

        return await this.sendEmail('recordatorio', datos);
    }

    /**
     * FUNCIONES DE UTILIDAD
     */

    /**
     * Obtener datos del curso desde Firestore
     */
    async getCursoData(cursoId) {
        try {
            const cursoDoc = await getDoc(doc(db, 'cursos', cursoId));
            return cursoDoc.exists() ? { id: cursoId, ...cursoDoc.data() } : null;
        } catch (error) {
            console.error('Error obteniendo datos del curso:', error);
            return null;
        }
    }

    /**
     * Obtener datos de la sede desde Firestore
     */
    async getSedeData() {
        try {
            const sedeDoc = await getDoc(doc(db, 'configuraciones', 'sede'));
            return sedeDoc.exists() ? sedeDoc.data() : null;
        } catch (error) {
            console.error('Error obteniendo datos de la sede:', error);
            return null;
        }
    }

    /**
     * Procesar inscripción completa con envío de emails
     */
    async procesarInscripcion(inscripcionId, accion, motivo = null) {
        try {
            // Obtener datos de la inscripción
            const inscripcionDoc = await getDoc(doc(db, 'inscripciones', inscripcionId));
            if (!inscripcionDoc.exists()) {
                throw new Error('Inscripción no encontrada');
            }

            const inscripcion = { id: inscripcionId, ...inscripcionDoc.data() };

            // Obtener datos del curso
            const curso = await this.getCursoData(inscripcion.cursoId);
            if (!curso) {
                throw new Error('Curso no encontrado');
            }

            // Obtener datos de la sede
            const sede = await this.getSedeData();

            // Procesar según la acción
            switch (accion) {
                case 'confirmar':
                    return await this.enviarConfirmacionInscripcion(inscripcion, curso, sede);

                case 'pago_recibido':
                    return await this.notificarPagoRecibido(inscripcion, curso);

                case 'cancelar':
                    return await this.enviarCancelacionAdmin(inscripcion, curso, motivo);

                case 'nueva':
                    // Usar una sola plantilla 'inscripcion' para todos
                    return await this.enviarEmailInscripcion(inscripcion, curso, sede);

                default:
                    throw new Error(`Acción no reconocida: ${accion}`);
            }

        } catch (error) {
            console.error('Error procesando inscripción:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test de conexión con Apps Script
     */
    async testConnection() {
        try {
            if (!this.scriptConfig?.url) {
                throw new Error('URL de Apps Script no configurada');
            }

            const response = await fetch(`${this.scriptConfig.url}?test=true`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Test de conexión exitoso:', result);
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error en test de conexión:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global del servicio
window.emailService = new EmailService();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}