// configuracion.js - Sistema de Configuraciones
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    addDoc,
    getDoc,
    onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

class ConfiguracionManager {
    constructor() {
        this.currentUser = null;
        this.sedeData = null;
        this.profesoresData = [];
        this.envioConfig = null;
        this.recordatoriosConfig = null;
        this.plantillasEmail = [];
        this.isFirebaseReady = false;
        this.initializationPromise = null;
        
        this.init();
    }

    async init() {
        // Crear promesa de inicialización para evitar múltiples intentos
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.waitForFirebaseAndInit();
        return this.initializationPromise;
    }

    async waitForFirebaseAndInit() {
        console.log('🔄 Esperando inicialización de Firebase...');
        
        // Verificar que Firebase esté disponible
        await this.waitForFirebase();
        
        console.log('✅ Firebase listo, configurando autenticación...');
        
        // Configurar autenticación
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('👤 Usuario autenticado:', user.email);
                this.currentUser = user;
                this.setupEventListeners();
                
                // Delay adicional para asegurar que todo esté listo
                await this.delay(500);
                
                await this.loadAllConfigurations();
            } else {
                console.log('❌ Usuario no autenticado');
            }
        });
    }

    async waitForFirebase() {
        const maxAttempts = 20;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                // Verificar que db esté disponible y sea una instancia válida
                if (db && typeof db === 'object' && db.type === 'firestore') {
                    console.log('✅ Firestore inicializado correctamente');
                    this.isFirebaseReady = true;
                    return true;
                }
                
                // Si db existe pero no tiene el tipo correcto
                if (db) {
                    console.log('⚠️ db existe pero no es instancia válida:', typeof db, db);
                }
                
                attempts++;
                console.log(`⏳ Intento ${attempts}/${maxAttempts} - Esperando Firebase...`);
                await this.delay(250);
                
            } catch (error) {
                console.warn(`❌ Error verificando Firebase (intento ${attempts}):`, error.message);
                attempts++;
                await this.delay(250);
            }
        }
        
        throw new Error('❌ Firebase no se inicializó después de ' + maxAttempts + ' intentos');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupEventListeners() {
        // Navegación entre sub-pestañas
        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.closest('.config-tab-btn').dataset.configTab;
                this.switchConfigTab(tabId);
            });
        });

        // Botones de acción - Sede
        const editarSedeBtn = document.getElementById('editar-sede-btn');
        if (editarSedeBtn) {
            editarSedeBtn.addEventListener('click', () => this.mostrarModalSede());
        }

        // Botones de acción - Profesores
        const agregarProfesorBtn = document.getElementById('agregar-profesor-btn');
        if (agregarProfesorBtn) {
            agregarProfesorBtn.addEventListener('click', () => this.mostrarModalProfesor());
        }

        // Botones de acción - Scripts
        const editarScriptBtn = document.getElementById('editar-script-btn');
        if (editarScriptBtn) {
            editarScriptBtn.addEventListener('click', () => this.mostrarModalScript());
        }

        // Botones de configuración de envío
        const editarEnvioBtn = document.getElementById('editar-envio-btn');
        if (editarEnvioBtn) {
            editarEnvioBtn.addEventListener('click', () => this.mostrarModalEnvio());
        }

        // Botones de recordatorios
        const editarRecordatoriosBtn = document.getElementById('editar-recordatorios-btn');
        if (editarRecordatoriosBtn) {
            editarRecordatoriosBtn.addEventListener('click', () => this.mostrarModalRecordatorios());
        }

        // Botones de plantillas de email
        const agregarPlantillaBtn = document.getElementById('agregar-plantilla-btn');
        if (agregarPlantillaBtn) {
            agregarPlantillaBtn.addEventListener('click', () => this.abrirModalPlantilla());
        }

        // Event listeners del modal de plantillas
        this.setupPlantillaModalEvents();
    }

    switchConfigTab(tabId) {
        // Actualizar botones
        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-config-tab="${tabId}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.config-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`config-${tabId}`).classList.add('active');
    }

    async loadAllConfigurations() {
        try {
            // Verificar que Firebase esté listo antes de continuar
            if (!this.isFirebaseReady) {
                console.log('⚠️ Firebase no está listo, esperando...');
                await this.waitForFirebase();
            }

            console.log('📋 Cargando todas las configuraciones...');
            
            await Promise.all([
                this.loadSedeConfiguration(),
                this.loadProfesoresConfiguration(),
                this.loadScriptsConfiguration(),
                this.loadEnvioConfiguration(),
                this.loadRecordatoriosConfiguration(),
                this.loadPlantillasEmail()
            ]);
            
            console.log('✅ Todas las configuraciones cargadas exitosamente');
        } catch (error) {
            console.error('❌ Error al cargar configuraciones:', error);
            this.showError('Error al cargar las configuraciones del sistema: ' + error.message);
        }
    }

    async loadSedeConfiguration() {
        try {
            this.validateFirebaseReady('loadSedeConfiguration');
            
            console.log('📍 Cargando configuración de sede...');
            const sedeDoc = await getDoc(doc(db, 'configuraciones', 'sede'));
            
            if (sedeDoc.exists()) {
                this.sedeData = sedeDoc.data();
                console.log('✅ Configuración de sede cargada:', this.sedeData.direccion);
            } else {
                console.log('⚠️ No existe configuración de sede, creando por defecto...');
                // Configuración por defecto
                this.sedeData = {
                    direccion: 'Dirección no configurada',
                    email: 'No configurado'
                };
                await this.saveSedeConfiguration(this.sedeData);
            }
            this.renderSedeDisplay();
        } catch (error) {
            console.error('❌ Error al cargar configuración de sede:', error);
            throw error;
        }
    }

    validateFirebaseReady(methodName) {
        if (!this.isFirebaseReady || !db) {
            throw new Error(`Firebase no está listo para ${methodName}. db=${!!db}, ready=${this.isFirebaseReady}`);
        }
    }

    async loadProfesoresConfiguration() {
        try {
            this.validateFirebaseReady('loadProfesoresConfiguration');
            
            console.log('👨‍🏫 Cargando profesores...');
            const profesoresSnapshot = await getDocs(collection(db, 'profesores'));
            this.profesoresData = [];
            
            profesoresSnapshot.forEach(doc => {
                this.profesoresData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ ${this.profesoresData.length} profesores cargados`);
            this.renderProfesoresTable();
        } catch (error) {
            console.error('❌ Error al cargar profesores:', error);
            throw error;
        }
    }

    async loadScriptsConfiguration() {
        try {
            this.validateFirebaseReady('loadScriptsConfiguration');
            
            console.log('� Cargando configuración de Apps Script...');
            const scriptDoc = await getDoc(doc(db, 'configuraciones', 'apps_script'));
            
            if (scriptDoc.exists()) {
                this.scriptConfig = scriptDoc.data();
                console.log('✅ Configuración de Apps Script cargada');
            } else {
                console.log('⚠️ No existe configuración de Apps Script, creando por defecto...');
                this.scriptConfig = {
                    nombre: 'Gmail API Universal',
                    url: 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec',
                    descripcion: 'Script único para todas las funciones de Gmail API',
                    activo: false,
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
                    }
                };
                await this.saveScriptConfiguration(this.scriptConfig);
            }
            this.renderScriptDisplay();
        } catch (error) {
            console.error('❌ Error al cargar configuración de Apps Script:', error);
            throw error;
        }
    }

    async loadEnvioConfiguration() {
        try {
            this.validateFirebaseReady('loadEnvioConfiguration');
            
            console.log('📬 Cargando configuración de envío...');
            const envioDoc = await getDoc(doc(db, 'configuraciones', 'envio'));
            
            if (envioDoc.exists()) {
                this.envioConfig = envioDoc.data();
                console.log('✅ Configuración de envío cargada');
            } else {
                console.log('⚠️ No existe configuración de envío, creando por defecto...');
                this.envioConfig = {
                    notificacionesAdmin: {
                        nuevaInscripcion: true,
                        cancelacionCurso: true,
                        pagoRecibido: true
                    },
                    notificacionesAlumno: {
                        confirmacionInscripcion: true,
                        recordatorioCurso: true,
                        confirmacionPago: true
                    }
                };
                await this.saveEnvioConfiguration(this.envioConfig);
            }
            this.renderEnvioDisplay();
        } catch (error) {
            console.error('❌ Error al cargar configuración de envío:', error);
            throw error;
        }
    }

    async loadRecordatoriosConfiguration() {
        try {
            this.validateFirebaseReady('loadRecordatoriosConfiguration');
            
            console.log('⏰ Cargando configuración de recordatorios...');
            const recordatoriosDoc = await getDoc(doc(db, 'configuraciones', 'recordatorios'));
            
            if (recordatoriosDoc.exists()) {
                this.recordatoriosConfig = recordatoriosDoc.data();
                console.log('✅ Configuración de recordatorios cargada');
            } else {
                console.log('⚠️ No existe configuración de recordatorios, creando por defecto...');
                this.recordatoriosConfig = {
                    diasAntes: 1,
                    horario: '11:00',
                    activo: true
                };
                await this.saveRecordatoriosConfiguration(this.recordatoriosConfig);
            }
            this.renderRecordatoriosDisplay();
        } catch (error) {
            console.error('❌ Error al cargar configuración de recordatorios:', error);
            throw error;
        }
    }

    // Métodos de renderizado
    renderSedeDisplay() {
        document.getElementById('sede-direccion-display').textContent = this.sedeData.direccion;
        document.getElementById('sede-email-display').textContent = this.sedeData.email;
    }

    renderProfesoresTable() {
        const tbody = document.getElementById('profesores-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.profesoresData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-light); padding: 20px;">
                        No hay profesores registrados
                    </td>
                </tr>
            `;
            return;
        }

        this.profesoresData.forEach(profesor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${profesor.nombre}</td>
                <td>${profesor.email}</td>
                <td>${profesor.especialidad}</td>
                <td>
                    <span class="status-badge ${profesor.activo ? 'active' : 'inactive'}">
                        <i class="fas fa-${profesor.activo ? 'check-circle' : 'times-circle'}"></i>
                        ${profesor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn edit" onclick="configuracionManager.editarProfesor('${profesor.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn delete" onclick="configuracionManager.eliminarProfesor('${profesor.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderScriptDisplay() {
        // Mostrar configuración única de Apps Script
        document.getElementById('script-nombre-display').textContent = this.scriptConfig?.nombre || 'No configurado';
        document.getElementById('script-url-display').textContent = this.scriptConfig?.url || 'No configurado';
        document.getElementById('script-descripcion-display').textContent = this.scriptConfig?.descripcion || 'No configurado';
        
        const statusElement = document.getElementById('script-status-display');
        if (statusElement) {
            const isActive = this.scriptConfig?.activo;
            const isServiceReady = window.emailService?.initialized;
            
            let statusText = 'Inactivo';
            let statusIcon = 'times-circle';
            let statusClass = 'inactive';
            
            if (isActive && isServiceReady) {
                statusText = 'Activo y Conectado';
                statusIcon = 'check-circle';
                statusClass = 'active';
            } else if (isActive) {
                statusText = 'Configurado';
                statusIcon = 'clock';
                statusClass = 'warning';
            }
            
            statusElement.innerHTML = `
                <span class="status-badge ${statusClass}">
                    <i class="fas fa-${statusIcon}"></i>
                    ${statusText}
                </span>
            `;
        }
        
        // Mostrar usos del script
        const usosElement = document.getElementById('script-usos-display');
        if (usosElement && this.scriptConfig?.usos) {
            usosElement.innerHTML = this.scriptConfig.usos.map(uso => 
                `<span class="uso-tag">${uso}</span>`
            ).join('');
        }
    }

    renderEnvioDisplay() {
        const notifAdminList = document.getElementById('notif-admin-list');
        const notifAlumnoList = document.getElementById('notif-alumno-list');

        if (notifAdminList && this.envioConfig) {
            notifAdminList.innerHTML = Object.entries(this.envioConfig.notificacionesAdmin)
                .map(([key, value]) => `
                    <div class="config-status-item ${value ? 'enabled' : 'disabled'}">
                        <i class="fas fa-${value ? 'check' : 'times'}"></i>
                        ${this.getNotificationLabel(key)}
                    </div>
                `).join('');
        }

        if (notifAlumnoList && this.envioConfig) {
            notifAlumnoList.innerHTML = Object.entries(this.envioConfig.notificacionesAlumno)
                .map(([key, value]) => `
                    <div class="config-status-item ${value ? 'enabled' : 'disabled'}">
                        <i class="fas fa-${value ? 'check' : 'times'}"></i>
                        ${this.getNotificationLabel(key)}
                    </div>
                `).join('');
        }
    }

    renderRecordatoriosDisplay() {
        if (this.recordatoriosConfig) {
            document.getElementById('recordatorio-dias-display').textContent = 
                `${this.recordatoriosConfig.diasAntes} día${this.recordatoriosConfig.diasAntes > 1 ? 's' : ''}`;
            document.getElementById('recordatorio-horario-display').textContent = 
                this.recordatoriosConfig.horario;
            document.getElementById('recordatorio-estado-display').textContent = 
                this.recordatoriosConfig.activo ? 'Activo' : 'Inactivo';
        }
    }

    getNotificationLabel(key) {
        const labels = {
            nuevaInscripcion: 'Nueva Inscripción',
            cancelacionCurso: 'Cancelación de Curso',
            pagoRecibido: 'Pago Recibido',
            confirmacionInscripcion: 'Confirmación de Inscripción',
            recordatorioCurso: 'Recordatorio de Curso',
            confirmacionPago: 'Confirmación de Pago'
        };
        return labels[key] || key;
    }

    // Métodos de guardado
    async saveSedeConfiguration(data) {
        try {
            this.validateFirebaseReady('saveSedeConfiguration');
            
            console.log('💾 Guardando configuración de sede...');
            await setDoc(doc(db, 'configuraciones', 'sede'), data);
            this.sedeData = data;
            this.renderSedeDisplay();
            console.log('✅ Configuración de sede guardada exitosamente');
            this.showSuccess('Configuración de sede guardada correctamente');
        } catch (error) {
            console.error('❌ Error al guardar configuración de sede:', error);
            this.showError('Error al guardar la configuración de sede: ' + error.message);
        }
    }

    async saveEnvioConfiguration(data) {
        try {
            this.validateFirebaseReady('saveEnvioConfiguration');
            
            console.log('💾 Guardando configuración de envío...');
            await setDoc(doc(db, 'configuraciones', 'envio'), data);
            this.envioConfig = data;
            this.renderEnvioDisplay();
            console.log('✅ Configuración de envío guardada exitosamente');
            this.showSuccess('Configuración de envío guardada correctamente');
        } catch (error) {
            console.error('❌ Error al guardar configuración de envío:', error);
            this.showError('Error al guardar la configuración de envío: ' + error.message);
        }
    }

    async saveScriptConfiguration(data) {
        try {
            this.validateFirebaseReady('saveScriptConfiguration');
            
            console.log('💾 Guardando configuración de Apps Script...');
            
            await setDoc(doc(db, 'configuraciones', 'apps_script'), {
                ...data,
                updated: new Date()
            });
            
            this.scriptConfig = { ...data, updated: new Date() };
            this.renderScriptDisplay();
            
            console.log('✅ Configuración de Apps Script guardada exitosamente');
            this.showSuccess('Configuración de Apps Script actualizada');
            
        } catch (error) {
            console.error('❌ Error al guardar configuración de Apps Script:', error);
            this.showError('Error al guardar la configuración de Apps Script: ' + error.message);
            throw error;
        }
    }

    async saveRecordatoriosConfiguration(data) {
        try {
            this.validateFirebaseReady('saveRecordatoriosConfiguration');
            
            console.log('💾 Guardando configuración de recordatorios...');
            await setDoc(doc(db, 'configuraciones', 'recordatorios'), data);
            this.recordatoriosConfig = data;
            this.renderRecordatoriosDisplay();
            console.log('✅ Configuración de recordatorios guardada exitosamente');
            this.showSuccess('Configuración de recordatorios guardada correctamente');
        } catch (error) {
            console.error('❌ Error al guardar configuración de recordatorios:', error);
            this.showError('Error al guardar la configuración de recordatorios: ' + error.message);
        }
    }

    // Métodos de modal
    mostrarModalSede() {
        const modal = document.getElementById('sede-modal');
        if (!modal) return;

        // Rellenar campos con datos actuales
        document.getElementById('sede-direccion-input').value = this.sedeData?.direccion || '';
        document.getElementById('sede-email-input').value = this.sedeData?.email || '';

        modal.classList.add('active');
        this.setupSedeModalEvents(modal);
    }

    setupSedeModalEvents(modal) {
        const form = document.getElementById('sede-form');
        const closeBtn = document.getElementById('sede-modal-close');
        const cancelBtn = document.getElementById('cancel-sede');

        // Limpiar eventos anteriores para evitar duplicados
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Envío del formulario
        const submitHandler = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const nuevaSedeData = {
                    direccion: document.getElementById('sede-direccion-input').value.trim(),
                    email: document.getElementById('sede-email-input').value.trim(),
                    updated: new Date()
                };

                if (!nuevaSedeData.direccion || !nuevaSedeData.email) {
                    this.showError('Todos los campos son obligatorios');
                    return false;
                }

                await this.saveSedeConfiguration(nuevaSedeData);
                modal.classList.remove('active');
                this.showSuccess('Configuración de sede actualizada exitosamente');
                
                return false; // Prevenir cualquier propagación adicional
                
            } catch (error) {
                console.error('Error al guardar sede:', error);
                this.showError('Error al guardar la configuración');
                return false;
            }
        };

        // Cerrar modal
        const closeHandler = (e) => {
            e?.preventDefault();
            e?.stopPropagation();
            modal.classList.remove('active');
        };

        // Agregar eventos una sola vez
        const actualForm = document.getElementById('sede-form');
        actualForm.addEventListener('submit', submitHandler, { once: true });
        closeBtn.addEventListener('click', closeHandler, { once: true });
        cancelBtn.addEventListener('click', closeHandler, { once: true });
        
        // Click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                closeHandler(e);
            }
        }, { once: true });
    }

    mostrarModalProfesor(profesorId = null) {
        const modal = document.getElementById('profesor-modal');
        if (!modal) return;

        const isEdit = !!profesorId;
        const profesor = isEdit ? this.profesoresData.find(p => p.id === profesorId) : null;

        // Actualizar título
        document.getElementById('profesor-modal-title').textContent = 
            isEdit ? 'Editar Profesor' : 'Agregar Profesor';
        document.getElementById('profesor-submit-text').textContent = 
            isEdit ? 'Actualizar Profesor' : 'Agregar Profesor';

        // Rellenar campos
        document.getElementById('profesor-nombre-input').value = profesor?.nombre || '';
        document.getElementById('profesor-email-input').value = profesor?.email || '';
        document.getElementById('profesor-especialidad-input').value = profesor?.especialidad || '';
        document.getElementById('profesor-experiencia-input').value = profesor?.experiencia || '';
        document.getElementById('profesor-descripcion-input').value = profesor?.descripcion || '';
        document.getElementById('profesor-activo-input').checked = profesor?.activo !== false;

        modal.classList.add('active');
        this.setupProfesorModalEvents(modal, profesorId);
    }

    setupProfesorModalEvents(modal, profesorId) {
        const form = document.getElementById('profesor-form');
        const closeBtn = document.getElementById('profesor-modal-close');
        const cancelBtn = document.getElementById('cancel-profesor');

        const submitHandler = async (e) => {
            e.preventDefault();
            
            const profesorData = {
                nombre: document.getElementById('profesor-nombre-input').value.trim(),
                email: document.getElementById('profesor-email-input').value.trim(),
                especialidad: document.getElementById('profesor-especialidad-input').value.trim(),
                experiencia: document.getElementById('profesor-experiencia-input').value.trim(),
                descripcion: document.getElementById('profesor-descripcion-input').value.trim(),
                activo: document.getElementById('profesor-activo-input').checked,
                updated: new Date()
            };

            if (!profesorData.nombre || !profesorData.email || !profesorData.especialidad) {
                this.showError('Los campos Nombre, Email y Especialidad son obligatorios');
                return;
            }

            try {
                if (profesorId) {
                    // Editar profesor existente
                    await updateDoc(doc(db, 'profesores', profesorId), profesorData);
                    this.showSuccess('Profesor actualizado correctamente');
                } else {
                    // Crear nuevo profesor
                    profesorData.created = new Date();
                    await addDoc(collection(db, 'profesores'), profesorData);
                    this.showSuccess('Profesor agregado correctamente');
                }
                
                await this.loadProfesoresConfiguration();
                modal.classList.remove('active');
                
            } catch (error) {
                console.error('Error guardando profesor:', error);
                this.showError('Error al guardar el profesor');
            }
        };

        const closeHandler = () => modal.classList.remove('active');

        form.addEventListener('submit', submitHandler);
        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    mostrarModalScript(scriptId = null) {
        const modal = document.getElementById('script-modal');
        if (!modal) return;

        const isEdit = !!scriptId;
        const script = isEdit ? this.scriptsData.find(s => s.id === scriptId) : null;

        // Actualizar título
        document.getElementById('script-modal-title').textContent = 
            isEdit ? 'Editar Apps Script' : 'Agregar Apps Script';
        document.getElementById('script-submit-text').textContent = 
            isEdit ? 'Actualizar Script' : 'Agregar Script';

        // Rellenar campos
        document.getElementById('script-nombre-input').value = script?.nombre || '';
        document.getElementById('script-tipo-input').value = script?.tipo || '';
        document.getElementById('script-url-input').value = script?.url || '';
        document.getElementById('script-descripcion-input').value = script?.descripcion || '';
        document.getElementById('script-activo-input').checked = script?.activo !== false;

        modal.classList.add('active');
        this.setupScriptModalEvents(modal);
    }

    setupScriptModalEvents(modal) {
        const form = document.getElementById('script-form');
        const closeBtn = document.getElementById('script-modal-close');
        const cancelBtn = document.getElementById('cancel-script');
        const testBtn = document.getElementById('test-script');

        const submitHandler = async (e) => {
            e.preventDefault();
            
            const scriptData = {
                nombre: document.getElementById('script-nombre-input').value.trim(),
                tipo: document.getElementById('script-tipo-input').value,
                url: document.getElementById('script-url-input').value.trim(),
                descripcion: document.getElementById('script-descripcion-input').value.trim(),
                activo: document.getElementById('script-activo-input').checked,
                updated: new Date()
            };

            if (!scriptData.nombre || !scriptData.tipo || !scriptData.url) {
                this.showError('Los campos Nombre, Tipo y URL son obligatorios');
                return;
            }

            try {
                // Guardar en sistema único (configuraciones/apps_script)
                const configData = {
                    nombre: scriptData.nombre,
                    url: scriptData.url,
                    descripcion: scriptData.descripcion,
                    activo: scriptData.activo,
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
                    }
                };
                
                await this.saveScriptConfiguration(configData);
                await this.loadScriptsConfiguration(); // Recargar el panel
                modal.classList.remove('active');
                this.showSuccess('Configuración guardada correctamente');
                
            } catch (error) {
                console.error('Error guardando script:', error);
                this.showError('Error al guardar el script');
            }
        };

        const testHandler = () => {
            const url = document.getElementById('script-url-input').value.trim();
            if (url) {
                this.testearScriptUrl(url);
            } else {
                this.showError('Ingresa una URL para probar');
            }
        };

        const closeHandler = () => modal.classList.remove('active');

        form.addEventListener('submit', submitHandler);
        testBtn.addEventListener('click', testHandler);
        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    mostrarModalEnvio() {
        const modal = document.getElementById('envio-modal');
        if (!modal) return;

        if (this.envioConfig) {
            // Rellenar checkboxes de notificaciones admin
            const adminNotifs = this.envioConfig.notificacionesAdmin || {};
            document.getElementById('notif-admin-nueva-inscripcion').checked = adminNotifs.nuevaInscripcion || false;
            document.getElementById('notif-admin-cancelacion-curso').checked = adminNotifs.cancelacionCurso || false;
            document.getElementById('notif-admin-pago-recibido').checked = adminNotifs.pagoRecibido || false;
            document.getElementById('notif-admin-nuevo-usuario').checked = adminNotifs.nuevoUsuario || false;

            // Rellenar checkboxes de notificaciones alumno
            const alumnoNotifs = this.envioConfig.notificacionesAlumno || {};
            document.getElementById('notif-alumno-confirmacion-inscripcion').checked = alumnoNotifs.confirmacionInscripcion || false;
            document.getElementById('notif-alumno-recordatorio-curso').checked = alumnoNotifs.recordatorioCurso || false;
            document.getElementById('notif-alumno-confirmacion-pago').checked = alumnoNotifs.confirmacionPago || false;
            document.getElementById('notif-alumno-cancelacion-admin').checked = alumnoNotifs.cancelacionAdmin || false;
        }

        modal.classList.add('active');
        this.setupEnvioModalEvents(modal);
    }

    setupEnvioModalEvents(modal) {
        const form = document.getElementById('envio-form');
        const closeBtn = document.getElementById('envio-modal-close');
        const cancelBtn = document.getElementById('cancel-envio');
        const testBtn = document.getElementById('test-envio');

        const submitHandler = async (e) => {
            e.preventDefault();
            
            const nuevaConfigEnvio = {
                notificacionesAdmin: {
                    nuevaInscripcion: document.getElementById('notif-admin-nueva-inscripcion').checked,
                    cancelacionCurso: document.getElementById('notif-admin-cancelacion-curso').checked,
                    pagoRecibido: document.getElementById('notif-admin-pago-recibido').checked,
                    nuevoUsuario: document.getElementById('notif-admin-nuevo-usuario').checked
                },
                notificacionesAlumno: {
                    confirmacionInscripcion: document.getElementById('notif-alumno-confirmacion-inscripcion').checked,
                    recordatorioCurso: document.getElementById('notif-alumno-recordatorio-curso').checked,
                    confirmacionPago: document.getElementById('notif-alumno-confirmacion-pago').checked,
                    cancelacionAdmin: document.getElementById('notif-alumno-cancelacion-admin').checked
                },
                updated: new Date()
            };

            await this.saveEnvioConfiguration(nuevaConfigEnvio);
            modal.classList.remove('active');
        };

        const testHandler = async () => {
            try {
                this.showInfo('🔄 Probando conexión con el sistema de emails...');
                
                if (!window.emailService) {
                    throw new Error('Servicio de emails no inicializado');
                }
                
                // Test de conexión
                const testResult = await window.emailService.testConnection();
                
                if (testResult.success) {
                    this.showSuccess(`✅ Sistema de emails funcionando correctamente<br>
                        <strong>Versión:</strong> ${testResult.data.version || 'N/A'}<br>
                        <strong>Estado:</strong> ${testResult.data.status || 'OK'}<br>
                        <strong>Timestamp:</strong> ${new Date(testResult.data.timestamp).toLocaleString('es-AR')}`);
                } else {
                    throw new Error(testResult.error || 'Error desconocido en la conexión');
                }
                
            } catch (error) {
                console.error('Error en test de emails:', error);
                this.showError(`❌ Error probando el sistema de emails:<br>
                    <strong>Detalle:</strong> ${error.message}<br><br>
                    <strong>Posibles causas:</strong><br>
                    • Apps Script no configurado correctamente<br>
                    • URL inválida o permisos incorrectos<br>
                    • Servicio de emails no inicializado`);
            }
        };

        const closeHandler = () => modal.classList.remove('active');

        form.addEventListener('submit', submitHandler);
        testBtn.addEventListener('click', testHandler);
        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    mostrarModalRecordatorios() {
        const modal = document.getElementById('recordatorios-modal');
        if (!modal) return;

        if (this.recordatoriosConfig) {
            document.getElementById('recordatorio-dias-input').value = this.recordatoriosConfig.diasAntes || 1;
            document.getElementById('recordatorio-horario-input').value = this.recordatoriosConfig.horario || '11:00';
            document.getElementById('recordatorio-activo-input').checked = this.recordatoriosConfig.activo !== false;
            
            // Template del email si existe
            const template = this.recordatoriosConfig.templateEmail || {};
            document.getElementById('recordatorio-asunto-input').value = template.asunto || 'Recordatorio: Curso mañana en Club Colmena';
            document.getElementById('recordatorio-mensaje-input').value = template.mensaje || 'Te recordamos que mañana tienes tu curso programado. ¡Te esperamos!';
            
            // Configuración avanzada si existe
            const avanzada = this.recordatoriosConfig.configuracionAvanzada || {};
            document.getElementById('recordatorio-reenviar-input').checked = avanzada.reenviarSiNoLeido || false;
            document.getElementById('recordatorio-horas-reenvio-input').value = avanzada.horasReenvio || 2;
        }

        modal.classList.add('active');
        this.setupRecordatoriosModalEvents(modal);
    }

    setupRecordatoriosModalEvents(modal) {
        const form = document.getElementById('recordatorios-form');
        const closeBtn = document.getElementById('recordatorios-modal-close');
        const cancelBtn = document.getElementById('cancel-recordatorios');
        const testBtn = document.getElementById('test-recordatorio');

        const submitHandler = async (e) => {
            e.preventDefault();
            
            const nuevaConfigRecordatorios = {
                diasAntes: parseInt(document.getElementById('recordatorio-dias-input').value),
                horario: document.getElementById('recordatorio-horario-input').value,
                activo: document.getElementById('recordatorio-activo-input').checked,
                templateEmail: {
                    asunto: document.getElementById('recordatorio-asunto-input').value.trim(),
                    mensaje: document.getElementById('recordatorio-mensaje-input').value.trim()
                },
                configuracionAvanzada: {
                    reenviarSiNoLeido: document.getElementById('recordatorio-reenviar-input').checked,
                    horasReenvio: parseInt(document.getElementById('recordatorio-horas-reenvio-input').value)
                },
                updated: new Date()
            };

            if (!nuevaConfigRecordatorios.templateEmail.asunto || !nuevaConfigRecordatorios.templateEmail.mensaje) {
                this.showError('Los campos Asunto y Mensaje son obligatorios');
                return;
            }

            await this.saveRecordatoriosConfiguration(nuevaConfigRecordatorios);
            modal.classList.remove('active');
        };

        const testHandler = () => {
            this.showInfo('Función de prueba de recordatorio en desarrollo');
        };

        const closeHandler = () => modal.classList.remove('active');

        form.addEventListener('submit', submitHandler);
        testBtn.addEventListener('click', testHandler);
        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    // Métodos de acción
    async editarProfesor(profesorId) {
        this.mostrarModalProfesor(profesorId);
    }

    async eliminarProfesor(profesorId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este profesor?')) return;

        try {
            await deleteDoc(doc(db, 'profesores', profesorId));
            await this.loadProfesoresConfiguration();
            this.showSuccess('Profesor eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar profesor:', error);
            this.showError('Error al eliminar el profesor');
        }
    }



    async testearScriptUrl(url) {
        try {
            this.showInfo('🔄 Probando conexión con el Apps Script...');
            
            // Validar formato de URL
            if (!url || !url.includes('script.google.com') || !url.includes('/exec')) {
                throw new Error('❌ URL inválida: Debe ser una URL de Google Apps Script que termine en /exec');
            }
            
            const testUrl = `${url}?test=true&timestamp=${Date.now()}`;
            console.log('🔗 Testing URL:', testUrl);
            
            // Realizar petición de prueba
            const response = await fetch(testUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('📡 Respuesta recibida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Datos de respuesta:', data);
                
                if (data.status && data.status.includes('funcionando')) {
                    this.showSuccess(`✅ Apps Script funcionando correctamente<br>
                        <small>Versión: ${data.version || 'N/A'}<br>
                        Test: ${data.test ? 'Exitoso' : 'Parcial'}<br>
                        CORS: ${data.cors || 'Configurado'}</small>`);
                    return true;
                } else {
                    this.showWarning(`⚠️ Apps Script respondió pero con datos inesperados:<br>
                        <small>${JSON.stringify(data, null, 2)}</small>`);
                    return false;
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Error testeando script:', error);
            
            // Análisis detallado del error
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                this.showError(`
                    ❌ <strong>Error CORS/Conexión</strong><br>
                    El Apps Script no es accesible desde este dominio.<br><br>
                    
                    <strong>🔧 Soluciones:</strong><br>
                    1. Redespliega el Apps Script como "Web App"<br>
                    2. Configura acceso como "Cualquier persona"<br>
                    3. Verifica que la URL termine en /exec<br>
                    4. Consulta la guía: <a href="docs/CORS-TROUBLESHOOTING.md" target="_blank">CORS Troubleshooting</a>
                `);
            } else if (error.message.includes('CORS')) {
                this.showError(`
                    ❌ <strong>Error CORS Específico</strong><br>
                    ${error.message}<br><br>
                    
                    <strong>🔧 Acción requerida:</strong><br>
                    Verifica headers CORS en el Apps Script
                `);
            } else if (error.message.includes('HTTP 302')) {
                this.showError(`
                    ❌ <strong>Error de Redirección</strong><br>
                    El Apps Script está redirigiendo (posible problema de permisos)<br><br>
                    
                    <strong>🔧 Solución:</strong><br>
                    Asegúrate que esté desplegado con permisos públicos
                `);
            } else if (error.message.includes('URL inválida')) {
                this.showError(error.message);
            } else {
                this.showError(`
                    ❌ <strong>Error Desconocido</strong><br>
                    ${error.message}<br><br>
                    
                    <strong>🔧 Siguiente paso:</strong><br>
                    Verifica manualmente: <a href="${url}?test=true" target="_blank">Abrir URL de prueba</a>
                `);
            }
            
            return false;
        }
    }



    async testEmailService() {
        const button = event.target;
        const originalText = button.textContent;
        const originalIcon = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            // Verificar que el servicio esté inicializado
            if (!window.emailService?.initialized) {
                throw new Error('Servicio de email no inicializado. Verifica la configuración del Apps Script.');
            }
            
            // Verificar configuración de administrador
            const adminConfig = await this.getAdminConfig();
            if (!adminConfig?.email) {
                throw new Error('Email del administrador no configurado');
            }
            
            // Email de prueba al administrador
            const testResult = await window.emailService.sendEmail({
                tipo: 'admin_test',
                destinatario: adminConfig.email,
                datos: {
                    timestamp: new Date().toLocaleString(),
                    testMessage: 'Este es un email de prueba del sistema de inscripciones'
                }
            });
            
            if (testResult.success) {
                this.showSuccess(
                    `Email de prueba enviado correctamente a ${adminConfig.email}. 
                    Revisa tu bandeja de entrada.`
                );
                
                // Actualizar estadísticas si existen
                if (window.emailService.stats) {
                    this.updateEmailStats();
                }
            } else {
                throw new Error(testResult.error || 'Error desconocido al enviar email');
            }
            
        } catch (error) {
            console.error('Error testing email service:', error);
            this.showError(`Error al probar el servicio: ${error.message}`);
        } finally {
            button.disabled = false;
            button.innerHTML = originalIcon;
        }
    }

    async getAdminConfig() {
        try {
            const adminDoc = await getDoc(doc(db, 'configuracion', 'admin'));
            return adminDoc.exists() ? adminDoc.data() : null;
        } catch (error) {
            console.error('Error obteniendo configuración de admin:', error);
            return null;
        }
    }

    updateEmailStats() {
        // Actualizar estadísticas de emails si hay un elemento para mostrarlas
        const statsElement = document.getElementById('email-stats');
        if (statsElement && window.emailService?.stats) {
            const stats = window.emailService.stats;
            statsElement.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Emails Enviados:</span>
                        <span class="stat-value">${stats.sent || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Errores:</span>
                        <span class="stat-value error">${stats.errors || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Último Envío:</span>
                        <span class="stat-value">${stats.lastSent || 'Nunca'}</span>
                    </div>
                </div>
            `;
        }
    }

    // Utilidades
    showSuccess(message) {
        if (window.authManager && window.authManager.showMessage) {
            window.authManager.showMessage(message, 'success');
        } else {
            console.log('SUCCESS:', message);
            alert('✅ ' + message);
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showMessage) {
            window.authManager.showMessage(message, 'error');
        } else {
            console.error('ERROR:', message);
            alert('❌ ' + message);
        }
    }

    showInfo(message) {
        if (window.authManager && window.authManager.showMessage) {
            window.authManager.showMessage(message, 'info');
        } else {
            console.log('INFO:', message);
            alert('ℹ️ ' + message);
        }
    }

    showAlert(message, type = 'info') {
        // Método auxiliar para compatibilidad con el EmailService
        switch (type) {
            case 'success':
                this.showSuccess(message);
                break;
            case 'error':
                this.showError(message);
                break;
            default:
                this.showInfo(message);
        }
    }

    // ============================================================================
    // GESTIÓN DE PLANTILLAS DE EMAIL
    // ============================================================================

    /**
     * Cargar plantillas de email desde Firebase
     */
    async loadPlantillasEmail() {
        try {
            console.log('📧 Cargando plantillas de email...');
            
            const plantillasRef = collection(db, 'plantillas_email');
            const snapshot = await getDocs(plantillasRef);
            
            this.plantillasEmail = [];
            snapshot.forEach((doc) => {
                this.plantillasEmail.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ ${this.plantillasEmail.length} plantillas cargadas`);
            this.displayPlantillasTable();
            
        } catch (error) {
            console.error('❌ Error cargando plantillas de email:', error);
            this.showError('Error cargando plantillas de email: ' + error.message);
        }
    }

    /**
     * Mostrar plantillas en la tabla
     */
    displayPlantillasTable() {
        const tbody = document.getElementById('plantillas-table-body');
        if (!tbody) return;

        if (this.plantillasEmail.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted" style="padding: 40px;">
                        <i class="fas fa-file-alt fa-2x"></i><br><br>
                        No hay plantillas configuradas<br>
                        <small>Haz clic en "Agregar Plantilla" para crear la primera</small>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.plantillasEmail.map(plantilla => {
            const fecha = plantilla.fechaCreacion?.toDate?.() || new Date();
            const fechaStr = fecha.toLocaleDateString('es-ES');
            
            return `
                <tr>
                    <td>
                        <span class="badge badge--${this.getTipoBadgeColor(plantilla.tipo)}">
                            ${this.getTipoDisplayName(plantilla.tipo)}
                        </span>
                    </td>
                    <td>
                        <div style="max-width: 200px;">
                            <div class="text-truncate">${plantilla.asunto}</div>
                            <small class="text-muted">${plantilla.asunto.length > 30 ? '...' : ''}</small>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${plantilla.activa ? 'active' : 'inactive'}">
                            <i class="fas fa-${plantilla.activa ? 'check-circle' : 'times-circle'}"></i>
                            ${plantilla.activa ? 'Activa' : 'Inactiva'}
                        </span>
                    </td>
                    <td>${fechaStr}</td>
                    <td>
                        <button class="btn btn--small btn--outline" onclick="configuracionManager.editarPlantilla('${plantilla.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--small btn--outline" onclick="configuracionManager.togglePlantillaStatus('${plantilla.id}')" title="${plantilla.activa ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${plantilla.activa ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn btn--small btn--danger" onclick="configuracionManager.eliminarPlantilla('${plantilla.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Obtener color del badge según tipo
     */
    getTipoBadgeColor(tipo) {
        const colors = {
            'inscripcion': 'success',
            'confirmacion': 'primary', 
            'cancelacion': 'danger',
            'recordatorio': 'warning',
            'pago': 'info',
            'receta': 'secondary'
        };
        return colors[tipo] || 'secondary';
    }

    /**
     * Obtener nombre display del tipo
     */
    getTipoDisplayName(tipo) {
        const names = {
            'inscripcion': 'Inscripción',
            'confirmacion': 'Confirmación',
            'cancelacion': 'Cancelación', 
            'recordatorio': 'Recordatorio',
            'pago': 'Conf. Pago',
            'receta': 'Receta'
        };
        return names[tipo] || tipo;
    }

    /**
     * Abrir modal para nueva plantilla
     */
    abrirModalPlantilla() {
        // Limpiar formulario
        document.getElementById('plantilla-form').reset();
        document.getElementById('plantilla-modal-title').textContent = 'Nueva Plantilla de Email';
        
        // Mostrar modal
        document.getElementById('modal-plantilla-email').style.display = 'flex';
        
        // Configurar para nueva plantilla
        this.plantillaEditando = null;
    }

    /**
     * Editar plantilla existente
     */
    async editarPlantilla(plantillaId) {
        const plantilla = this.plantillasEmail.find(p => p.id === plantillaId);
        if (!plantilla) {
            this.showError('Plantilla no encontrada');
            return;
        }

        // Llenar formulario
        document.getElementById('plantilla-tipo-input').value = plantilla.tipo;
        document.getElementById('plantilla-asunto-input').value = plantilla.asunto;
        document.getElementById('plantilla-contenido-input').value = plantilla.plantilla;
        document.getElementById('plantilla-activa-input').checked = plantilla.activa;

        // Cambiar título del modal
        document.getElementById('plantilla-modal-title').textContent = 'Editar Plantilla de Email';
        
        // Mostrar modal
        document.getElementById('modal-plantilla-email').style.display = 'flex';
        
        // Guardar ID para edición
        this.plantillaEditando = plantillaId;
    }

    /**
     * Guardar plantilla (nueva o editada)
     */
    async guardarPlantilla() {
        try {
            const tipo = document.getElementById('plantilla-tipo-input').value;
            const asunto = document.getElementById('plantilla-asunto-input').value.trim();
            const contenido = document.getElementById('plantilla-contenido-input').value.trim();
            const activa = document.getElementById('plantilla-activa-input').checked;

            // Validaciones
            if (!tipo || !asunto || !contenido) {
                this.showError('Todos los campos son obligatorios');
                return;
            }

            // Verificar si ya existe una plantilla activa del mismo tipo (solo para nuevas)
            if (!this.plantillaEditando) {
                const existeActiva = this.plantillasEmail.some(p => p.tipo === tipo && p.activa);
                if (existeActiva && activa) {
                    const confirmar = confirm('Ya existe una plantilla activa para este tipo. ¿Desea desactivar la anterior y activar esta nueva?');
                    if (!confirmar) return;
                    
                    // Desactivar plantilla anterior del mismo tipo
                    await this.desactivarPlantillasPorTipo(tipo);
                }
            }

            const plantillaData = {
                tipo,
                asunto,
                plantilla: contenido,
                activa,
                fechaActualizacion: new Date()
            };

            if (this.plantillaEditando) {
                // Actualizar plantilla existente
                const plantillaRef = doc(db, 'plantillas_email', this.plantillaEditando);
                await updateDoc(plantillaRef, plantillaData);
                this.showSuccess('Plantilla actualizada correctamente');
            } else {
                // Crear nueva plantilla
                plantillaData.fechaCreacion = new Date();
                await addDoc(collection(db, 'plantillas_email'), plantillaData);
                this.showSuccess('Plantilla creada correctamente');
            }

            // Cerrar modal y recargar
            this.cerrarModalPlantilla();
            await this.loadPlantillasEmail();

        } catch (error) {
            console.error('❌ Error guardando plantilla:', error);
            this.showError('Error guardando plantilla: ' + error.message);
        }
    }

    /**
     * Desactivar plantillas del mismo tipo
     */
    async desactivarPlantillasPorTipo(tipo) {
        const plantillasDelTipo = this.plantillasEmail.filter(p => p.tipo === tipo && p.activa);
        
        for (const plantilla of plantillasDelTipo) {
            const plantillaRef = doc(db, 'plantillas_email', plantilla.id);
            await updateDoc(plantillaRef, { activa: false });
        }
    }

    /**
     * Cambiar estado activo/inactivo de plantilla
     */
    async togglePlantillaStatus(plantillaId) {
        try {
            const plantilla = this.plantillasEmail.find(p => p.id === plantillaId);
            if (!plantilla) return;

            const nuevoEstado = !plantilla.activa;
            
            // Si se está activando, verificar si hay otra activa del mismo tipo
            if (nuevoEstado) {
                const existeActiva = this.plantillasEmail.some(p => p.tipo === plantilla.tipo && p.activa && p.id !== plantillaId);
                if (existeActiva) {
                    const confirmar = confirm('Ya existe una plantilla activa para este tipo. ¿Desea desactivar la anterior?');
                    if (!confirmar) return;
                    
                    await this.desactivarPlantillasPorTipo(plantilla.tipo);
                }
            }

            const plantillaRef = doc(db, 'plantillas_email', plantillaId);
            await updateDoc(plantillaRef, { 
                activa: nuevoEstado,
                fechaActualizacion: new Date()
            });

            this.showSuccess(`Plantilla ${nuevoEstado ? 'activada' : 'desactivada'} correctamente`);
            await this.loadPlantillasEmail();

        } catch (error) {
            console.error('❌ Error cambiando estado de plantilla:', error);
            this.showError('Error cambiando estado: ' + error.message);
        }
    }

    /**
     * Eliminar plantilla
     */
    async eliminarPlantilla(plantillaId) {
        if (!confirm('¿Está seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'plantillas_email', plantillaId));
            this.showSuccess('Plantilla eliminada correctamente');
            await this.loadPlantillasEmail();

        } catch (error) {
            console.error('❌ Error eliminando plantilla:', error);
            this.showError('Error eliminando plantilla: ' + error.message);
        }
    }

    /**
     * Cerrar modal de plantilla
     */
    cerrarModalPlantilla() {
        document.getElementById('modal-plantilla-email').style.display = 'none';
        this.plantillaEditando = null;
    }

    /**
     * Vista previa de plantilla
     */
    previsualizarPlantilla() {
        const asunto = document.getElementById('plantilla-asunto-input').value;
        const contenido = document.getElementById('plantilla-contenido-input').value;
        
        if (!asunto || !contenido) {
            this.showError('Complete el asunto y contenido para ver la vista previa');
            return;
        }

        // Datos de ejemplo para la vista previa
        const datosEjemplo = {
            nombreAlumno: 'María García',
            nombreCurso: 'Cocina Italiana Básica',
            fechaCurso: '15/02/2024',
            horarioCurso: '18:00 - 20:00',
            precioCurso: '$2500',
            direccionSede: 'Av. Corrientes 1234, CABA'
        };

        // Reemplazar variables
        let asuntoPreview = asunto;
        let contenidoPreview = contenido;
        
        Object.keys(datosEjemplo).forEach(key => {
            const variable = `{{${key}}}`;
            asuntoPreview = asuntoPreview.replace(new RegExp(variable, 'g'), datosEjemplo[key]);
            contenidoPreview = contenidoPreview.replace(new RegExp(variable, 'g'), datosEjemplo[key]);
        });

        // Abrir ventana de vista previa
        const ventanaPreview = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        ventanaPreview.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Vista Previa - ${asuntoPreview}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .preview-header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .preview-subject { font-weight: bold; font-size: 18px; color: #333; }
                    .preview-note { color: #666; font-size: 14px; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="preview-header">
                    <div class="preview-subject">Asunto: ${asuntoPreview}</div>
                    <div class="preview-note">Esta es una vista previa con datos de ejemplo</div>
                </div>
                <div class="preview-content">
                    ${contenidoPreview}
                </div>
            </body>
            </html>
        `);
        ventanaPreview.document.close();
    }

    /**
     * Configurar event listeners del modal de plantillas
     */
    setupPlantillaModalEvents() {
        const modal = document.getElementById('modal-plantilla-email');
        const form = document.getElementById('plantilla-form');
        const closeBtn = document.getElementById('close-plantilla-modal');
        const cancelBtn = document.getElementById('cancel-plantilla');
        const previewBtn = document.getElementById('preview-plantilla');

        if (!modal || !form) return;

        // Submit del formulario
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarPlantilla();
        });

        // Botones de cerrar
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.cerrarModalPlantilla());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cerrarModalPlantilla());
        }

        // Vista previa
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previsualizarPlantilla());
        }

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarModalPlantilla();
            }
        });

        // Tecla ESC para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.cerrarModalPlantilla();
            }
        });
    }
}

// Inicializar el gestor de configuraciones
window.configuracionManager = new ConfiguracionManager();

export default ConfiguracionManager;