/**
 * ============================================================================
 * DIAGNÓSTICO DE CONFIGURACIONES EMAIL - TIEMPO REAL
 * ============================================================================
 * 
 * Script para diagnosticar el estado actual de las configuraciones
 * sin hacer cambios, solo consultas de solo lectura.
 */

// Importar Firebase - usar window.db si está disponible, sino importar
let db;
try {
    // Intentar usar la instancia global primero
    if (window.db) {
        db = window.db;
    } else {
        // Fallback a importación directa
        const firebaseConfig = await import('./firebase-config.js');
        db = firebaseConfig.db;
    }
} catch (error) {
    console.warn('⚠️ Error importando Firebase, se usará window.db:', error.message);
}

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class EmailConfigDiagnostic {
    constructor() {
        this.results = {
            appsScript: null,
            envioConfig: null,
            emailService: null,
            problems: [],
            recommendations: []
        };
    }

    async runDiagnostic() {
        console.log('🔍 INICIANDO DIAGNÓSTICO DE CONFIGURACIONES EMAIL...');
        console.log('===============================================');

        // Reinicializar arrays de resultados
        this.results = {
            appsScript: null,
            envioConfig: null,
            emailService: null,
            problems: [],
            recommendations: []
        };
        this.problems = [];
        this.recommendations = [];

        try {
            // Si window.db no está disponible pero EmailService sí está inicializado,
            // podemos usar las configuraciones que ya cargó EmailService
            const canUseFirestore = window.db || (window.emailService && window.emailService.initialized);
            
            if (!canUseFirestore) {
                throw new Error('Firebase no está disponible y EmailService no está inicializado');
            }

            // 1. Verificar configuración Apps Script
            await this.checkAppsScriptConfig();
            
            // 2. Verificar configuración de envío
            await this.checkEnvioConfig();
            
            // 3. Verificar estado del EmailService
            await this.checkEmailServiceState();
            
            // 4. Generar reporte
            this.generateReport();

        } catch (error) {
            console.error('❌ Error durante el diagnóstico:', error);
            
            // Mostrar información de debugging
            console.log('🔍 Estado del sistema:');
            console.log('   Firebase (db):', !!window.db);
            console.log('   AuthManager:', !!window.authManager);
            console.log('   EmailService:', !!window.emailService);
            console.log('   Usuario admin:', window.authManager?.isCurrentUserAdmin() || false);
        }
    }

    async checkAppsScriptConfig() {
        console.log('📧 Verificando configuración Apps Script...');
        
        try {
            // Estrategia 1: Si EmailService ya tiene la configuración, usarla
            if (window.emailService && window.emailService.scriptConfig) {
                console.log('✅ Usando configuración Apps Script desde EmailService');
                const config = window.emailService.scriptConfig;
                this.results.appsScript = config;

                console.log('✅ Configuración Apps Script encontrada:');
                console.log('   📝 Nombre:', config.nombre || 'No definido');
                console.log('   🔗 URL:', config.url || 'No definida');
                console.log('   ✅ Activo:', config.activo || false);

                // Validar configuración
                if (!config.url || config.url.includes('TU_SCRIPT_ID_AQUI')) {
                    this.problems.push('❌ URL de Apps Script no configurada (contiene placeholder)');
                    this.recommendations.push('🔧 Configurar URL real del deployment en panel admin');
                }

                if (!config.activo) {
                    this.problems.push('❌ Apps Script está DESACTIVADO');
                    this.recommendations.push('🔧 Activar Apps Script desde panel de admin');
                }
                
                return;
            }
            
            // Estrategia 2: Acceso directo a Firestore si está disponible
            const dbInstance = window.db || db;
            if (!dbInstance) {
                this.problems.push('❌ No se puede acceder a configuración Apps Script');
                this.recommendations.push('🔧 Verificar inicialización de Firebase y EmailService');
                return;
            }
            
            const scriptDoc = await getDoc(doc(dbInstance, 'configuraciones', 'apps_script'));
            
            if (!scriptDoc.exists()) {
                this.problems.push('❌ NO EXISTE configuración apps_script en Firestore');
                this.recommendations.push('🔧 Crear configuración desde panel de admin');
                return;
            }

            const config = scriptDoc.data();
            this.results.appsScript = config;

            console.log('✅ Configuración Apps Script encontrada:');
            console.log('   📝 Nombre:', config.nombre || 'No definido');
            console.log('   🔗 URL:', config.url || 'No definida');
            console.log('   ✅ Activo:', config.activo || false);

            // Validar configuración
            if (!config.url || config.url.includes('TU_SCRIPT_ID_AQUI')) {
                this.problems.push('❌ URL de Apps Script no configurada (contiene placeholder)');
                this.recommendations.push('🔧 Configurar URL real del deployment en panel admin');
            }

            if (!config.activo) {
                this.problems.push('❌ Apps Script está DESACTIVADO');
                this.recommendations.push('🔧 Activar Apps Script desde panel de admin');
            }

        } catch (error) {
            this.problems.push(`❌ Error accediendo apps_script: ${error.message}`);
        }
    }

    async checkEnvioConfig() {
        console.log('📮 Verificando configuración de envío...');
        
        try {
            // Estrategia 1: Si EmailService ya tiene la configuración, usarla
            if (window.emailService && window.emailService.envioConfig) {
                console.log('✅ Usando configuración de envío desde EmailService');
                const config = window.emailService.envioConfig;
                this.results.envioConfig = config;

                console.log('✅ Configuración de Envío encontrada:');
                
                // Admin notifications
                const adminNotif = config.notificacionesAdmin || {};
                console.log('👤 Notificaciones Admin:');
                console.log('   📧 Nueva inscripción:', adminNotif.nuevaInscripcion ? '✅' : '❌');
                console.log('   💰 Pago recibido:', adminNotif.pagoRecibido ? '✅' : '❌');
                console.log('   ❌ Cancelación curso:', adminNotif.cancelacionCurso ? '✅' : '❌');
                console.log('   ⏰ Recordatorio curso:', adminNotif.recordatorioCurso ? '✅' : '❌');

                // Student notifications  
                const alumnoNotif = config.notificacionesAlumno || {};
                console.log('🎓 Notificaciones Alumno:');
                console.log('   ✅ Confirmación inscripción:', alumnoNotif.confirmacionInscripcion ? '✅' : '❌');
                console.log('   💰 Confirmación pago:', alumnoNotif.confirmacionPago ? '✅' : '❌');
                console.log('   ⏰ Recordatorio curso:', alumnoNotif.recordatorioCurso ? '✅' : '❌');
                console.log('   ❌ Cancelación admin:', alumnoNotif.cancelacionAdmin ? '✅' : '❌');

                // Verificar configuraciones críticas
                if (!adminNotif.nuevaInscripcion) {
                    this.problems.push('⚠️ Notificación "nueva inscripción" deshabilitada para admin');
                    this.recommendations.push('🔧 Activar desde "Configuración de Envío"');
                }
                
                return;
            }
            
            // Estrategia 2: Acceso directo a Firestore si está disponible
            const dbInstance = window.db || db;
            if (!dbInstance) {
                this.problems.push('❌ No se puede acceder a configuración de envío');
                this.recommendations.push('🔧 Verificar inicialización de Firebase y EmailService');
                return;
            }
            
            const envioDoc = await getDoc(doc(dbInstance, 'configuraciones', 'envio'));
            
            if (!envioDoc.exists()) {
                this.problems.push('❌ NO EXISTE configuración envio en Firestore');
                this.recommendations.push('🔧 Las configuraciones se crean automáticamente al acceder como admin');
                return;
            }

            const config = envioDoc.data();
            this.results.envioConfig = config;

            console.log('✅ Configuración de Envío encontrada:');
            
            // Admin notifications
            const adminNotif = config.notificacionesAdmin || {};
            console.log('👤 Notificaciones Admin:');
            console.log('   📧 Nueva inscripción:', adminNotif.nuevaInscripcion ? '✅' : '❌');
            console.log('   💰 Pago recibido:', adminNotif.pagoRecibido ? '✅' : '❌');
            console.log('   ❌ Cancelación curso:', adminNotif.cancelacionCurso ? '✅' : '❌');
            console.log('   ⏰ Recordatorio curso:', adminNotif.recordatorioCurso ? '✅' : '❌');

            // Student notifications  
            const alumnoNotif = config.notificacionesAlumno || {};
            console.log('🎓 Notificaciones Alumno:');
            console.log('   ✅ Confirmación inscripción:', alumnoNotif.confirmacionInscripcion ? '✅' : '❌');
            console.log('   💰 Confirmación pago:', alumnoNotif.confirmacionPago ? '✅' : '❌');
            console.log('   ⏰ Recordatorio curso:', alumnoNotif.recordatorioCurso ? '✅' : '❌');
            console.log('   ❌ Cancelación admin:', alumnoNotif.cancelacionAdmin ? '✅' : '❌');

            // Verificar configuraciones críticas
            if (!adminNotif.nuevaInscripcion) {
                this.problems.push('⚠️ Notificación "nueva inscripción" deshabilitada para admin');
                this.recommendations.push('🔧 Activar desde "Configuración de Envío"');
            }

        } catch (error) {
            this.problems.push(`❌ Error accediendo envio: ${error.message}`);
        }
    }

    async checkEmailServiceState() {
        console.log('⚙️ Verificando estado del EmailService...');

        if (!window.emailService) {
            this.problems.push('❌ window.emailService NO EXISTE');
            this.recommendations.push('🔧 Verificar carga de email-service.js');
            return;
        }

        const service = window.emailService;
        this.results.emailService = {
            initialized: service.initialized,
            hasScriptConfig: !!service.scriptConfig,
            hasEnvioConfig: !!service.envioConfig
        };

        console.log('✅ EmailService encontrado:');
        console.log('   🔧 Inicializado:', service.initialized ? '✅' : '❌');
        console.log('   📧 Configuración Apps Script cargada:', service.scriptConfig ? '✅' : '❌');
        console.log('   📮 Configuración Envío cargada:', service.envioConfig ? '✅' : '❌');

        if (!service.initialized) {
            this.problems.push('❌ EmailService NO inicializado');
            this.recommendations.push('🔧 Verificar inicialización en app.js');
        }

        // Test de configuraciones específicas
        if (service.envioConfig) {
            const nuevaInscripcionEnabled = service.isNotificationEnabled('nuevaInscripcion', 'admin');
            console.log('   📧 Nueva inscripción habilitada:', nuevaInscripcionEnabled ? '✅' : '❌');
            
            const confirmacionEnabled = service.isNotificationEnabled('confirmacionInscripcion', 'alumno');
            console.log('   ✅ Confirmación habilitada:', confirmacionEnabled ? '✅' : '❌');
        }
    }

    generateReport() {
        console.log('\n');
        console.log('📋 REPORTE DE DIAGNÓSTICO');
        console.log('========================');
        
        // Asegurar que problems está inicializado
        if (!this.problems || !Array.isArray(this.problems)) {
            this.problems = [];
        }
        if (!this.recommendations || !Array.isArray(this.recommendations)) {
            this.recommendations = [];
        }
        
        if (this.problems.length === 0) {
            console.log('🎉 ¡TODAS las configuraciones están correctas!');
            console.log('✅ El sistema debería estar enviando emails automáticamente');
        } else {
            console.log(`❌ Se encontraron ${this.problems.length} problema(s):`);
            this.problems.forEach((problem, index) => {
                console.log(`${index + 1}. ${problem}`);
            });
        }

        if (this.recommendations.length > 0) {
            console.log('\n🔧 RECOMENDACIONES:');
            this.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }

        console.log('\n💡 PRÓXIMOS PASOS:');
        console.log('1. Accede al panel de admin del sistema');
        console.log('2. Ve a "Configuraciones"');
        console.log('3. Configura "Gmail API - Apps Script" con URL real');
        console.log('4. Activa el servicio');
        console.log('5. Verifica "Configuración de Envío"');
        console.log('6. Realiza una inscripción de prueba');

        return this.results;
    }

    // Método para ejecutar desde consola del navegador
    async testEmailFlow() {
        console.log('\n🧪 PROBANDO FLUJO DE EMAIL...');
        
        if (!window.emailService) {
            console.log('❌ EmailService no disponible');
            return { success: false, error: 'EmailService no disponible' };
        }

        try {
            // Verificar si EmailService está inicializado
            if (!window.emailService.initialized) {
                console.log('⚠️ EmailService no inicializado, intentando inicializar...');
                await window.emailService.initialize();
            }
            
            // Verificar configuraciones
            if (!window.emailService.scriptConfig) {
                console.log('❌ No hay configuración de Apps Script');
                return { success: false, error: 'Apps Script no configurado' };
            }
            
            if (!window.emailService.scriptConfig.activo) {
                console.log('❌ Apps Script está desactivado');
                return { success: false, error: 'Apps Script desactivado' };
            }

            // Simular datos de inscripción
            const testData = {
                tipo: 'admin_test',
                destinatario: 'test@example.com', // Email de prueba que no se envía realmente
                alumno: { 
                    nombre: 'Usuario Test Diagnóstico',
                    email: 'test@example.com'
                },
                curso: {
                    nombre: 'Curso de Prueba - Diagnóstico',
                    fecha: new Date(),
                    precio: 1000
                },
                timestamp: new Date().toISOString(),
                testMessage: 'Prueba de conectividad desde sistema de diagnóstico'
            };

            console.log('📤 Enviando email de prueba...');
            console.log('📋 Configuración Apps Script URL:', window.emailService.scriptConfig.url);
            
            const result = await window.emailService.sendEmail('admin_test', testData);
            
            if (result.success) {
                console.log('✅ EMAIL DE PRUEBA PROCESADO EXITOSAMENTE');
                console.log('🎉 El sistema de emails está funcionando correctamente');
                console.log('📧 Resultado:', result);
            } else {
                console.log('❌ Error enviando email de prueba:', result.reason || result.error);
                console.log('🔍 Detalles del error:', result);
            }

            return result;

        } catch (error) {
            console.log('❌ Error durante prueba de email:', error.message);
            console.log('🔍 Stack trace:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global para uso desde consola
window.emailDiagnostic = new EmailConfigDiagnostic();

// Auto-ejecutar diagnóstico cuando se carga la página (solo en admin)
document.addEventListener('DOMContentLoaded', () => {
    // Función para verificar si todo está listo
    const waitForInitialization = async () => {
        let attempts = 0;
        const maxAttempts = 60; // 30 segundos máximo
        
        while (attempts < maxAttempts) {
            try {
                // Verificar que todos los sistemas estén listos
                if (window.authManager && 
                    window.authManager.currentUser && 
                    window.authManager.isCurrentUserAdmin() &&
                    window.emailService &&
                    window.db) { // Verificar que Firebase esté disponible
                    
                    console.log('🔍 Ejecutando diagnóstico automático...');
                    await window.emailDiagnostic.runDiagnostic();
                    
                    console.log('\n💡 COMANDOS DISPONIBLES EN CONSOLA:');
                    console.log('• await emailDiagnostic.runDiagnostic()    - Ejecutar diagnóstico completo');
                    console.log('• await emailDiagnostic.testEmailFlow()    - Probar envío de email');
                    return;
                }
                
                // Esperar medio segundo antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
                
            } catch (error) {
                console.warn('⚠️ Error durante inicialización del diagnóstico:', error.message);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
        }
        
        console.log('⚠️ Diagnóstico automático no ejecutado - sistema no completamente inicializado');
        console.log('💡 Puedes ejecutarlo manualmente: await emailDiagnostic.runDiagnostic()');
    };
    
    // Iniciar verificación después de un breve delay
    setTimeout(waitForInitialization, 1000);
});

// Función de verificación manual de estado
window.checkEmailSystemStatus = function() {
    console.log('📊 ESTADO DEL SISTEMA DE EMAILS:');
    console.log('================================');
    console.log('Firebase (db):', !!window.db);
    console.log('AuthManager:', !!window.authManager);
    console.log('EmailService:', !!window.emailService);
    console.log('Es Admin:', window.authManager?.isCurrentUserAdmin() || false);
    console.log('User:', window.authManager?.currentUser?.email || 'No autenticado');
    
    if (window.emailService) {
        console.log('EmailService inicializado:', window.emailService.initialized);
        console.log('Script Config:', !!window.emailService.scriptConfig);
        console.log('Envio Config:', !!window.emailService.envioConfig);
    }
    
    console.log('\n� Para ejecutar diagnóstico: await emailDiagnostic.runDiagnostic()');
};

console.log('�🔧 Diagnóstico de Email cargado.');
console.log('💡 Usa: checkEmailSystemStatus() para ver el estado');
console.log('💡 Usa: await emailDiagnostic.runDiagnostic() para diagnóstico completo');