// init-configuraciones.js - Inicialización de datos para Configuraciones
import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    addDoc,
    getDoc,
    getDocs 
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
                this.initializeProfesores(),
                this.initializeAppsScripts(),
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

    async initializeProfesores() {
        try {
            // Verificar si ya existen profesores
            const profesoresSnapshot = await getDocs(collection(db, 'profesores'));
            
            if (!profesoresSnapshot.empty) {
                console.log('✅ Profesores ya existentes, omitiendo inicialización');
                return;
            }
            
            // Crear algunos profesores de ejemplo solo si no existen
            const profesoresEjemplo = [
                {
                    nombre: 'María González',
                    email: 'maria.gonzalez@clubcolmena.com.ar',
                    especialidad: 'Cocina Internacional',
                    activo: true,
                    experiencia: '10 años',
                    descripcion: 'Chef especializada en cocina mediterránea y asiática',
                    created: new Date()
                },
                {
                    nombre: 'Carlos Rodríguez',
                    email: 'carlos.rodriguez@clubcolmena.com.ar',
                    especialidad: 'Pastelería y Repostería',
                    activo: true,
                    experiencia: '8 años',
                    descripcion: 'Pastelero con especialización en técnicas francesas',
                    created: new Date()
                },
                {
                    nombre: 'Ana Martín',
                    email: 'ana.martin@clubcolmena.com.ar',
                    especialidad: 'Cocina Vegana',
                    activo: false,
                    experiencia: '5 años',
                    descripcion: 'Especialista en alimentación plant-based y cocina saludable',
                    created: new Date()
                }
            ];

            for (const profesor of profesoresEjemplo) {
                await addDoc(collection(db, 'profesores'), profesor);
            }
            
            console.log('✅ Profesores de ejemplo creados');
            
        } catch (error) {
            console.error('Error inicializando profesores:', error);
        }
    }

    async initializeAppsScripts() {
        try {
            // Verificar si ya existe la configuración de Apps Script
            const scriptRef = doc(db, 'configuraciones', 'apps_script');
            const scriptSnap = await getDoc(scriptRef);
            
            if (!scriptSnap.exists()) {
                // Crear configuración única de Apps Script para Gmail API
                const scriptConfig = {
                    nombre: 'Gmail API Universal',
                    url: 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec',
                    descripcion: 'Script único para todas las funciones de Gmail API (notificaciones, recordatorios, confirmaciones)',
                    activo: true,
                    usos: [
                        'Notificaciones de inscripción',
                        'Recordatorios de cursos', 
                        'Confirmaciones de pago',
                        'Cancelaciones y cambios',
                        'Envío de recetas'
                    ],
                    configuracion: {
                        emailRemitente: 'noreply@clubcolmena.com.ar',
                        nombreRemitente: 'Club de Cocina Colmena'
                    },
                    created: new Date(),
                    updated: new Date()
                };
                
                await setDoc(scriptRef, scriptConfig);
                console.log('✅ Configuración única de Apps Script creada');
            } else {
                console.log('✅ Configuración de Apps Script ya existente, omitiendo inicialización');
            }
            
        } catch (error) {
            console.error('Error inicializando Apps Script:', error);
        }
    }

    async initializeEnvioConfig() {
        try {
            const envioRef = doc(db, 'configuraciones', 'envio');
            const envioSnap = await getDoc(envioRef);
            
            if (!envioSnap.exists()) {
                const envioData = {
                    notificacionesAdmin: {
                        nuevaInscripcion: true,
                        cancelacionCurso: true,
                        pagoRecibido: true,
                        recordatorioCurso: false,
                        nuevoUsuario: true
                    },
                    notificacionesAlumno: {
                        confirmacionInscripcion: true,
                        recordatorioCurso: true,
                        confirmacionPago: true,
                        cancelacionAdmin: true,
                        nuevaReceta: false
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
                if (window.authManager && 
                    window.authManager.currentUser && 
                    window.authManager.isCurrentUserAdmin()) {
                    
                    console.log('🔧 Iniciando ConfiguracionesInitializer...');
                    new ConfiguracionesInitializer();
                    return;
                }
                
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.warn('Error verificando admin status:', error);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log('⚠️ No se pudo inicializar ConfiguracionesInitializer - usuario no admin o no autenticado');
    };
    
    waitForAdminAndInit();
});

export default ConfiguracionesInitializer;