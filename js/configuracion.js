// configuracion.js - Sistema de Configuraciones
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    getDoc,
    onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

class ConfiguracionManager {
    constructor() {
        this.currentUser = null;
        this.sedeData = null;
        this.profesoresData = [];
        this.scriptsData = [];
        this.envioConfig = null;
        this.recordatoriosConfig = null;
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
        const agregarScriptBtn = document.getElementById('agregar-script-btn');
        if (agregarScriptBtn) {
            agregarScriptBtn.addEventListener('click', () => this.mostrarModalScript());
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
                this.loadRecordatoriosConfiguration()
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
            
            console.log('🔗 Cargando Apps Scripts...');
            const scriptsSnapshot = await getDocs(collection(db, 'apps_scripts'));
            this.scriptsData = [];
            
            scriptsSnapshot.forEach(doc => {
                this.scriptsData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ ${this.scriptsData.length} Apps Scripts cargados`);
            this.renderScriptsTable();
        } catch (error) {
            console.error('❌ Error al cargar scripts:', error);
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

    renderScriptsTable() {
        const tbody = document.getElementById('scripts-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.scriptsData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-light); padding: 20px;">
                        No hay URLs de Apps Script configuradas
                    </td>
                </tr>
            `;
            return;
        }

        this.scriptsData.forEach(script => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${script.nombre}</td>
                <td title="${script.url}">
                    ${script.url.length > 40 ? script.url.substring(0, 40) + '...' : script.url}
                </td>
                <td>
                    <span class="status-badge ${script.activo ? 'active' : 'inactive'}">
                        <i class="fas fa-${script.activo ? 'check-circle' : 'times-circle'}"></i>
                        ${script.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn edit" onclick="configuracionManager.editarScript('${script.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn test" onclick="configuracionManager.testearScript('${script.id}')" title="Probar">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="table-action-btn delete" onclick="configuracionManager.eliminarScript('${script.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
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

        // Envío del formulario
        const submitHandler = async (e) => {
            e.preventDefault();
            
            const nuevaSedeData = {
                direccion: document.getElementById('sede-direccion-input').value.trim(),
                email: document.getElementById('sede-email-input').value.trim(),
                updated: new Date()
            };

            if (!nuevaSedeData.direccion || !nuevaSedeData.email) {
                this.showError('Todos los campos son obligatorios');
                return;
            }

            await this.saveSedeConfiguration(nuevaSedeData);
            modal.classList.remove('active');
        };

        // Cerrar modal
        const closeHandler = () => {
            modal.classList.remove('active');
        };

        // Agregar eventos
        form.addEventListener('submit', submitHandler);
        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);
        
        // Click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });

        // Limpiar eventos al cerrar
        const cleanup = () => {
            form.removeEventListener('submit', submitHandler);
            closeBtn.removeEventListener('click', closeHandler);
            cancelBtn.removeEventListener('click', closeHandler);
        };

        modal.addEventListener('transitionend', cleanup, { once: true });
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
        this.setupScriptModalEvents(modal, scriptId);
    }

    setupScriptModalEvents(modal, scriptId) {
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
                if (scriptId) {
                    await updateDoc(doc(db, 'apps_scripts', scriptId), scriptData);
                    this.showSuccess('Script actualizado correctamente');
                } else {
                    scriptData.created = new Date();
                    await addDoc(collection(db, 'apps_scripts'), scriptData);
                    this.showSuccess('Script agregado correctamente');
                }
                
                await this.loadScriptsConfiguration();
                modal.classList.remove('active');
                
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

        const testHandler = () => {
            this.showInfo('Función de prueba de envío en desarrollo');
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

    async editarScript(scriptId) {
        this.mostrarModalScript(scriptId);
    }

    async eliminarScript(scriptId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este script?')) return;

        try {
            await deleteDoc(doc(db, 'apps_scripts', scriptId));
            await this.loadScriptsConfiguration();
            this.showSuccess('Script eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar script:', error);
            this.showError('Error al eliminar el script');
        }
    }

    async testearScript(scriptId) {
        const script = this.scriptsData.find(s => s.id === scriptId);
        if (!script) return;
        
        await this.testearScriptUrl(script.url);
    }

    async testearScriptUrl(url) {
        try {
            this.showInfo('Probando conexión con el Apps Script...');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    test: true,
                    timestamp: new Date().toISOString(),
                    source: 'club-colmena-config'
                })
            });

            if (response.ok) {
                this.showSuccess('✅ Apps Script respondió correctamente');
            } else {
                this.showError(`❌ Error en Apps Script: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error testeando script:', error);
            this.showError(`❌ Error de conexión: ${error.message}`);
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
}

// Inicializar el gestor de configuraciones
window.configuracionManager = new ConfiguracionManager();

export default ConfiguracionManager;