// Sistema Centralizado de Logging
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class SystemLogger {
    constructor() {
        this.sessionId = this.getSessionId();
        console.log('📋 SystemLogger inicializado');
    }

    // Generar o recuperar ID de sesión
    getSessionId() {
        let sessionId = sessionStorage.getItem('system_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('system_session_id', sessionId);
        }
        return sessionId;
    }

    // Determinar tipo de usuario
    async getUserType(userEmail) {
        try {
            if (!userEmail) return 'anonymous';
            
            // Verificar si es admin usando el sistema existente
            if (window.authManager?.adminManager?.isUserAdmin) {
                const isAdmin = await window.authManager.adminManager.isUserAdmin(userEmail);
                return isAdmin ? 'admin' : 'alumno';
            }
            
            // Fallback: asumir alumno si no se puede verificar
            return 'alumno';
        } catch (error) {
            console.error('Error determinando tipo de usuario:', error);
            return 'alumno';
        }
    }

    // Función principal de logging
    async logActivity(action, details = {}, options = {}) {
        try {
            const user = auth.currentUser;
            const userEmail = user?.email || 'sistema';
            const userType = await this.getUserType(userEmail);

            const logEntry = {
                action: action,
                details: details,
                timestamp: serverTimestamp(),
                userEmail: userEmail,
                userType: userType,
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
                url: window.location.href,
                
                // Campos adicionales opcionales
                module: options.module || 'general',
                priority: options.priority || 'normal', // low, normal, high, critical
                category: options.category || 'user_action'
            };

            // Usar colección unificada 'system_logs'
            await addDoc(collection(db, 'system_logs'), logEntry);
            
            console.log(`📝 [${action}] ${userEmail} (${userType})`, details);

        } catch (error) {
            console.error('Error en SystemLogger:', error);
            // No mostrar error al usuario, es logging interno
        }
    }

    // Métodos específicos para tipos comunes de acciones
    async logAuth(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'auth', 
            category: 'authentication',
            priority: 'high' 
        });
    }

    async logInscription(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'inscripciones', 
            category: 'enrollment' 
        });
    }

    async logCourse(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'cursos', 
            category: 'course_management' 
        });
    }

    async logRecipe(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'recetas', 
            category: 'recipe_management' 
        });
    }

    async logAdmin(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'admin', 
            category: 'admin_action',
            priority: 'high' 
        });
    }

    async logNotes(action, details = {}) {
        return this.logActivity(action, details, { 
            module: 'notas', 
            category: 'notes_management' 
        });
    }

    // Método para compatibilidad con sistema existente de notas
    async logNotesCompatibility(message) {
        return this.logNotes('note_action', { 
            message: message,
            legacy: true 
        });
    }
}

// Crear instancia global
const systemLogger = new SystemLogger();

// Exportar tanto la clase como la instancia
export { SystemLogger, systemLogger };

// También hacer disponible globalmente para compatibilidad
window.systemLogger = systemLogger;