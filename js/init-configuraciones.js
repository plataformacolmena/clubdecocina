// init-configuraciones.js - Inicialización de configuraciones básicas (solo sede, envío y recordatorios)
import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class ConfiguracionesInitializer {
    constructor() {
        this.initializeDefaults();
    }

    async initializeDefaults() {
        try {
            console.log('🔧 Inicializando configuraciones por defecto...');
            
            // Verificar que Firebase esté disponible
            await this.waitForFirebase();
            
            await Promise.all([
                this.initializeSedeConfig(),
                this.initializeEnvioConfig(),
                this.initializeRecordatoriosConfig()
            ]);
            
            console.log('✅ Configuraciones inicializadas correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando configuraciones:', error);
        }
    }

    async waitForFirebase() {
        const maxAttempts = 20;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                if (db && typeof db === 'object' && db.type === 'firestore') {
                    console.log('✅ Firebase listo para inicializador');
                    return true;
                }
                
                attempts++;
                console.log(`⏳ Esperando Firebase (${attempts}/${maxAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 250));
                
            } catch (error) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        
        throw new Error('❌ Firebase no disponible para inicializador');
    }

    async initializeSedeConfig() {
        try {
            const sedeRef = doc(db, 'configuraciones', 'sede');
            const sedeSnap = await getDoc(sedeRef);
            
            if (!sedeSnap.exists()) {
                const sedeData = {
                    direccion: 'Av. Corrientes 1234, CABA, Argentina',
                    email: 'contacto@clubcolmena.com.ar',
                    created: new Date(),
                    updated: new Date()
                };
                
                await setDoc(sedeRef, sedeData);
                console.log('✅ Configuración de sede creada');
            }
        } catch (error) {
            console.error('Error inicializando sede:', error);
        }
    }





    async initializeEnvioConfig() {
        try {
            const envioRef = doc(db, 'configuraciones', 'envio');
            const envioSnap = await getDoc(envioRef);
            
            if (!envioSnap.exists()) {
                const envioData = {
                    // Una sola configuración de eventos unificada
                    eventosNotificacion: {
                        nuevaInscripcion: true,
                        cancelacionCurso: true,
                        pagoRecibido: true,
                        confirmacionInscripcion: true
                    },
                    configuracionGeneral: {
                        emailRemitente: 'noreply@clubcolmena.com.ar',
                        nombreRemitente: 'Club de Cocina Colmena',
                        firmaEmail: 'Equipo Club de Cocina Colmena',
                        urlLogo: 'https://clubcolmena.com.ar/logo.png'
                    },
                    created: new Date(),
                    updated: new Date()
                };
                
                await setDoc(envioRef, envioData);
                console.log('✅ Configuración de envío creada');
            }
        } catch (error) {
            console.error('Error inicializando configuración de envío:', error);
        }
    }

    async initializeRecordatoriosConfig() {
        try {
            const recordatoriosRef = doc(db, 'configuraciones', 'recordatorios');
            const recordatoriosSnap = await getDoc(recordatoriosRef);
            
            if (!recordatoriosSnap.exists()) {
                const recordatoriosData = {
                    diasAntes: 1,
                    horario: '10:00',
                    activo: true,
                    diasSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
                    configuracionAvanzada: {
                        reenviarSiNoLeido: true,
                        horasReenvio: 2,
                        maxReintentos: 3
                    },
                    templateEmail: {
                        asunto: 'Recordatorio: Curso mañana en Club Colmena',
                        mensaje: 'Te recordamos que mañana tienes tu curso programado. ¡Te esperamos!'
                    },
                    created: new Date(),
                    updated: new Date()
                };
                
                await setDoc(recordatoriosRef, recordatoriosData);
                console.log('✅ Configuración de recordatorios creada');
            }
        } catch (error) {
            console.error('Error inicializando configuración de recordatorios:', error);
        }
    }
}

// Inicializar automáticamente cuando se carga el módulo
// Pero solo si estamos en modo admin y hay un usuario autenticado
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que el sistema de autenticación esté listo
    const waitForAdminAndInit = async () => {
        let attempts = 0;
        const maxAttempts = 40; // 20 segundos máximo
        
        while (attempts < maxAttempts) {
            try {
                // ConfiguracionesInitializer debe ejecutarse para TODOS los usuarios autenticados
                // porque crea configuraciones básicas (sede, envío, recordatorios) que todos necesitan
                if (window.authManager && window.authManager.currentUser) {
                    console.log('🔧 Iniciando ConfiguracionesInitializer para usuario autenticado...');
                    new ConfiguracionesInitializer();
                    return;
                }
                
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.warn('Error verificando estado de autenticación:', error);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log('⚠️ No se pudo inicializar ConfiguracionesInitializer - usuario no autenticado');
    };
    
    waitForAdminAndInit();
});

export default ConfiguracionesInitializer;