/**
 * ============================================================================
 * SERVICIO DE EMAILS - INTEGRACIÓN CON APPS SCRIPT
 * ============================================================================
 * 
 * Módulo para integrar el sistema de emails con Google Apps Script
 * Maneja todos los tipos de notificaciones automáticas del sistema
 */

// Importar Firebase siguiendo el patrón establecido en el sistema
import { db } from './firebase-config.js';
import {
    doc,
    getDoc,
    collection,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class EmailService {
    constructor() {
        this.scriptConfig = null;
        this.envioConfig = null;
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

            // Verificar que tenemos las configuraciones necesarias
            if (!this.scriptConfig?.url || !this.scriptConfig?.activo) {
                throw new Error('Apps Script no configurado o desactivado');
            }

        } catch (error) {
            console.error('Error cargando configuraciones de email:', error);
            throw error;
        }
    }

    /**
     * Verificar si un tipo de notificación está habilitado
     */
    isNotificationEnabled(type, recipient = 'alumno') {
        if (!this.envioConfig) return false;
        
        const notificaciones = recipient === 'admin' 
            ? this.envioConfig.notificacionesAdmin 
            : this.envioConfig.notificacionesAlumno;
            
        return notificaciones?.[type] === true;
    }

    /**
     * Enviar email usando Apps Script
     */
    async sendEmail(tipo, datos) {
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

            // Preparar datos para el Apps Script
            const payload = {
                tipo: tipo,
                ...datos,
                timestamp: new Date().toISOString()
            };

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
     * Notificar nueva inscripción al admin
     */
    async notificarNuevaInscripcion(inscripcion, curso, sede = null) {
        if (!this.isNotificationEnabled('nuevaInscripcion', 'admin')) {
            console.log('📧 Notificación de nueva inscripción deshabilitada');
            return { success: false, reason: 'Notificación deshabilitada' };
        }

        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail,
                telefono: inscripcion.telefono || null
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora,
                horario: curso.horario || 'Por confirmar',
                precio: inscripcion.costo
            },
            pago: {
                estado: inscripcion.estado,
                metodo: inscripcion.metodoPago
            },
            sede: sede
        };

        return await this.sendEmail('nueva_inscripcion', datos);
    }

    /**
     * Confirmación de inscripción al alumno
     */
    async enviarConfirmacionInscripcion(inscripcion, curso, sede = null) {
        if (!this.isNotificationEnabled('confirmacionInscripcion', 'alumno')) {
            console.log('📧 Confirmación de inscripción deshabilitada');
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
                horario: curso.horario || 'Por confirmar',
                precio: inscripcion.costo,
                instructor: curso.instructor || 'Por confirmar'
            },
            sede: sede
        };

        return await this.sendEmail('confirmacion_inscripcion', datos);
    }

    /**
     * Notificar pago recibido al admin
     */
    async notificarPagoRecibido(inscripcion, curso) {
        if (!this.isNotificationEnabled('pagoRecibido', 'admin')) {
            console.log('📧 Notificación de pago recibido deshabilitada');
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
                estado: 'pagado',
                metodo: inscripcion.metodoPago,
                fecha: new Date(),
                monto: inscripcion.costo
            }
        };

        return await this.sendEmail('nueva_inscripcion', datos);
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

        return await this.sendEmail('confirmacion_pago', datos);
    }

    /**
     * Notificar cancelación por admin al alumno
     */
    async enviarCancelacionAdmin(inscripcion, curso, motivo = null) {
        if (!this.isNotificationEnabled('cancelacionAdmin', 'alumno')) {
            console.log('📧 Notificación de cancelación deshabilitada');
            return { success: false, reason: 'Notificación deshabilitada' };
        }

        const datos = {
            alumno: {
                nombre: inscripcion.usuarioNombre,
                email: inscripcion.usuarioEmail
            },
            curso: {
                nombre: curso.nombre,
                fecha: curso.fechaHora
            },
            cancelacion: {
                motivo: motivo || 'Cancelación administrativa'
            }
        };

        return await this.sendEmail('cancelacion_curso', datos);
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

        return await this.sendEmail('recordatorio_curso', datos);
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
                    return await this.notificarNuevaInscripcion(inscripcion, curso, sede);

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