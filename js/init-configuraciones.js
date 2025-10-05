// init-configuraciones.js - Inicialización de datos para Configuraciones
import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    addDoc,
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

class ConfiguracionesInitializer {
    constructor() {
        this.initializeDefaults();
    }

    async initializeDefaults() {
        try {
            console.log('🔧 Inicializando configuraciones por defecto...');
            
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
            // Crear algunos profesores de ejemplo
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
            // Crear URLs de Apps Script de ejemplo
            const scriptsEjemplo = [
                {
                    nombre: 'Notificaciones Email',
                    url: 'https://script.google.com/macros/s/ejemplo1234567890/exec',
                    descripcion: 'Script para envío de emails automáticos',
                    activo: true,
                    tipo: 'notificaciones',
                    created: new Date()
                },
                {
                    nombre: 'Recordatorios Cursos',
                    url: 'https://script.google.com/macros/s/ejemplo0987654321/exec',
                    descripcion: 'Script para recordatorios automáticos de cursos',
                    activo: true,
                    tipo: 'recordatorios',
                    created: new Date()
                },
                {
                    nombre: 'Backup Datos',
                    url: 'https://script.google.com/macros/s/ejemplo1122334455/exec',
                    descripcion: 'Script para respaldo automático de datos',
                    activo: false,
                    tipo: 'backup',
                    created: new Date()
                }
            ];

            for (const script of scriptsEjemplo) {
                await addDoc(collection(db, 'apps_scripts'), script);
            }
            
            console.log('✅ Apps Scripts de ejemplo creados');
            
        } catch (error) {
            console.error('Error inicializando scripts:', error);
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
    setTimeout(() => {
        if (window.authManager && window.authManager.isCurrentUserAdmin()) {
            new ConfiguracionesInitializer();
        }
    }, 2000);
});

export default ConfiguracionesInitializer;