// Módulo de administración
import { db, APP_CONFIG } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class AdminManager {
    constructor() {
        this.cursos = [];
        this.inscripciones = [];
        this.recetas = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navegación a admin
        document.querySelector('a[href="#admin"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.authManager.isCurrentUserAdmin()) {
                this.loadAdminData();
                window.authManager.showSection('admin');
            } else {
                window.authManager.showMessage('No tienes permisos de administrador', 'error');
            }
        });

        // Tabs de administración
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Botones de acciones principales
        document.getElementById('nuevo-curso-btn')?.addEventListener('click', () => {
            this.showCursoModal();
        });

        document.getElementById('nueva-receta-btn')?.addEventListener('click', () => {
            this.showRecetaModal();
        });

        // Filtros de admin
        this.setupAdminFilters();
    }

    setupAdminFilters() {
        document.getElementById('filter-curso-admin')?.addEventListener('change', (e) => {
            this.filterInscripcionesBycurso(e.target.value);
        });

        document.getElementById('filter-estado')?.addEventListener('change', (e) => {
            this.filterInscripcionesByEstado(e.target.value);
        });
    }

    async loadAdminData() {
        if (!window.authManager.isCurrentUserAdmin()) return;

        try {
            window.authManager.showLoading();
            
            // Cargar datos en paralelo
            await Promise.all([
                this.loadAdminCursos(),
                this.loadAdminInscripciones(),
                this.loadAdminRecetas()
            ]);
            
            this.renderAdminData();
            
        } catch (error) {
            console.error('Error loading admin data:', error);
            window.authManager.showMessage('Error al cargar datos de administración', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async loadAdminCursos() {
        const q = query(collection(db, 'cursos'), orderBy('fechaHora', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.cursos = [];
        querySnapshot.forEach((doc) => {
            this.cursos.push({ id: doc.id, ...doc.data() });
        });
    }

    async loadAdminInscripciones() {
        const q = query(collection(db, 'inscripciones'), orderBy('fechaInscripcion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.inscripciones = [];
        querySnapshot.forEach((doc) => {
            this.inscripciones.push({ id: doc.id, ...doc.data() });
        });
    }

    async loadAdminRecetas() {
        const q = query(collection(db, 'recetas'), orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.recetas = [];
        querySnapshot.forEach((doc) => {
            this.recetas.push({ id: doc.id, ...doc.data() });
        });
    }

    renderAdminData() {
        this.renderAdminCursos();
        this.renderAdminInscripciones();
        this.renderAdminRecetas();
        this.updateAdminFilters();
    }

    switchTab(tabId) {
        // Actualizar botones activos
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Mostrar contenido activo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
    }

    // === GESTIÓN DE CURSOS ===
    renderAdminCursos() {
        const grid = document.getElementById('admin-cursos-grid');
        if (!grid) return;

        if (this.cursos.length === 0) {
            grid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <p>No hay cursos creados</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.cursos.map(curso => this.createAdminCursoCard(curso)).join('');
        this.setupCursoEventListeners();
    }

    createAdminCursoCard(curso) {
        const fechaFormatted = new Date(curso.fechaHora.seconds * 1000).toLocaleString('es-AR');
        const inscriptosActuales = curso.inscriptos || 0;

        return `
            <div class="card admin-curso-card">
                <div class="card__header">
                    <h3 class="card__title">${curso.nombre}</h3>
                    <div class="admin-actions">
                        <button class="btn btn--outline btn--small edit-curso-btn" data-curso-id="${curso.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--outline btn--small delete-curso-btn" data-curso-id="${curso.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card__content">
                    <div class="card__info">
                        <div class="card__info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${fechaFormatted}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>$${curso.costo.toLocaleString()}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-users"></i>
                            <span>${inscriptosActuales}/${curso.capacidadMaxima} inscriptos</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupCursoEventListeners() {
        document.querySelectorAll('.edit-curso-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cursoId = e.target.dataset.cursoId;
                const curso = this.cursos.find(c => c.id === cursoId);
                this.showCursoModal(curso);
            });
        });

        document.querySelectorAll('.delete-curso-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cursoId = e.target.dataset.cursoId;
                this.deleteCurso(cursoId);
            });
        });
    }

    showCursoModal(curso = null) {
        const isEdit = !!curso;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">${isEdit ? 'Editar' : 'Nuevo'} Curso</h2>
                <form id="curso-form" class="form">
                    <div class="form__group">
                        <label class="form__label">Nombre del curso</label>
                        <input type="text" id="curso-nombre" class="input" 
                               value="${curso?.nombre || ''}" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Descripción</label>
                        <textarea id="curso-descripcion" class="input" rows="3">${curso?.descripcion || ''}</textarea>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Fecha y hora</label>
                        <input type="datetime-local" id="curso-fecha" class="input" 
                               value="${curso ? this.formatDateForInput(new Date(curso.fechaHora.seconds * 1000)) : ''}" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Costo por persona</label>
                        <input type="number" id="curso-costo" class="input" 
                               value="${curso?.costo || ''}" min="0" step="0.01" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Capacidad máxima</label>
                        <input type="number" id="curso-capacidad" class="input" 
                               value="${curso?.capacidadMaxima || ''}" min="1" required>
                    </div>
                    <div class="modal__actions">
                        <button type="submit" class="btn btn--primary">
                            ${isEdit ? 'Actualizar' : 'Crear'} Curso
                        </button>
                        <button type="button" class="btn btn--outline close-modal">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#curso-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isEdit) {
                this.updateCurso(curso.id, modal);
            } else {
                this.createCurso(modal);
            }
        });

        this.setupModalEventListeners(modal);
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async createCurso(modal) {
        try {
            window.authManager.showLoading();
            
            const cursoData = {
                nombre: modal.querySelector('#curso-nombre').value,
                descripcion: modal.querySelector('#curso-descripcion').value,
                fechaHora: new Date(modal.querySelector('#curso-fecha').value),
                costo: parseFloat(modal.querySelector('#curso-costo').value),
                capacidadMaxima: parseInt(modal.querySelector('#curso-capacidad').value),
                inscriptos: 0,
                fechaCreacion: new Date()
            };

            await addDoc(collection(db, 'cursos'), cursoData);
            
            modal.remove();
            window.authManager.showMessage('Curso creado exitosamente', 'success');
            await this.loadAdminCursos();
            this.renderAdminCursos();

        } catch (error) {
            console.error('Error creating curso:', error);
            window.authManager.showMessage('Error al crear el curso', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async updateCurso(cursoId, modal) {
        try {
            window.authManager.showLoading();
            
            const cursoData = {
                nombre: modal.querySelector('#curso-nombre').value,
                descripcion: modal.querySelector('#curso-descripcion').value,
                fechaHora: new Date(modal.querySelector('#curso-fecha').value),
                costo: parseFloat(modal.querySelector('#curso-costo').value),
                capacidadMaxima: parseInt(modal.querySelector('#curso-capacidad').value)
            };

            await updateDoc(doc(db, 'cursos', cursoId), cursoData);
            
            modal.remove();
            window.authManager.showMessage('Curso actualizado exitosamente', 'success');
            await this.loadAdminCursos();
            this.renderAdminCursos();

        } catch (error) {
            console.error('Error updating curso:', error);
            window.authManager.showMessage('Error al actualizar el curso', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async deleteCurso(cursoId) {
        if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            window.authManager.showLoading();
            
            await deleteDoc(doc(db, 'cursos', cursoId));
            
            window.authManager.showMessage('Curso eliminado exitosamente', 'success');
            await this.loadAdminCursos();
            this.renderAdminCursos();

        } catch (error) {
            console.error('Error deleting curso:', error);
            window.authManager.showMessage('Error al eliminar el curso', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    // === GESTIÓN DE INSCRIPCIONES ===
    renderAdminInscripciones(inscripcionesToRender = this.inscripciones) {
        const list = document.getElementById('admin-inscripciones-list');
        if (!list) return;

        if (inscripcionesToRender.length === 0) {
            list.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-user-check"></i>
                    <p>No hay inscripciones</p>
                </div>
            `;
            return;
        }

        list.innerHTML = inscripcionesToRender.map(inscripcion => 
            this.createAdminInscripcionCard(inscripcion)
        ).join('');
        
        this.setupInscripcionEventListeners();
    }

    createAdminInscripcionCard(inscripcion) {
        const fechaInscripcion = new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleDateString('es-AR');
        
        return `
            <div class="card admin-inscripcion-card">
                <div class="card__header">
                    <h3 class="card__title">${inscripcion.usuarioNombre}</h3>
                    <div class="status status--${inscripcion.estado}">
                        ${this.getEstadoText(inscripcion.estado)}
                    </div>
                </div>
                <div class="card__content">
                    <div class="card__info">
                        <div class="card__info-item">
                            <i class="fas fa-envelope"></i>
                            <span>${inscripcion.usuarioEmail}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-chalkboard-teacher"></i>
                            <span>${inscripcion.cursoNombre}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Inscripto: ${fechaInscripcion}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>$${inscripcion.costo.toLocaleString()}</span>
                        </div>
                        ${inscripcion.metodoPago ? `
                            <div class="card__info-item">
                                <i class="fas fa-credit-card"></i>
                                <span>${inscripcion.metodoPago}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="card__actions">
                    ${inscripcion.comprobanteUrl ? `
                        <a href="${inscripcion.comprobanteUrl}" target="_blank" 
                           class="btn btn--outline">
                            <i class="fas fa-file-image"></i>
                            Ver Comprobante
                        </a>
                    ` : ''}
                    ${inscripcion.estado === 'pagado' ? `
                        <button class="btn btn--primary confirm-inscripcion-btn" 
                                data-inscripcion-id="${inscripcion.id}">
                            <i class="fas fa-check"></i>
                            Confirmar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupInscripcionEventListeners() {
        document.querySelectorAll('.confirm-inscripcion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.target.dataset.inscripcionId;
                this.confirmInscripcion(inscripcionId);
            });
        });
    }

    async confirmInscripcion(inscripcionId) {
        try {
            window.authManager.showLoading();
            
            await updateDoc(doc(db, 'inscripciones', inscripcionId), {
                estado: 'confirmado',
                fechaConfirmacion: new Date()
            });
            
            window.authManager.showMessage('Inscripción confirmada', 'success');
            await this.loadAdminInscripciones();
            this.renderAdminInscripciones();

        } catch (error) {
            console.error('Error confirming inscripcion:', error);
            window.authManager.showMessage('Error al confirmar inscripción', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    filterInscripcionesBycurso(cursoNombre) {
        if (!cursoNombre) {
            this.renderAdminInscripciones();
            return;
        }

        const filtered = this.inscripciones.filter(inscripcion =>
            inscripcion.cursoNombre === cursoNombre
        );
        this.renderAdminInscripciones(filtered);
    }

    filterInscripcionesByEstado(estado) {
        if (!estado) {
            this.renderAdminInscripciones();
            return;
        }

        const filtered = this.inscripciones.filter(inscripcion =>
            inscripcion.estado === estado
        );
        this.renderAdminInscripciones(filtered);
    }

    // === GESTIÓN DE RECETAS ===
    renderAdminRecetas() {
        const grid = document.getElementById('admin-recetas-grid');
        if (!grid) return;

        if (this.recetas.length === 0) {
            grid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-book-open"></i>
                    <p>No hay recetas creadas</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.recetas.map(receta => this.createAdminRecetaCard(receta)).join('');
        this.setupRecetaEventListeners();
    }

    createAdminRecetaCard(receta) {
        return `
            <div class="card admin-receta-card">
                <div class="card__header">
                    <h3 class="card__title">${receta.nombre}</h3>
                    <div class="admin-actions">
                        <button class="btn btn--outline btn--small edit-receta-btn" data-receta-id="${receta.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--outline btn--small delete-receta-btn" data-receta-id="${receta.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${receta.imagenUrl ? `
                    <div class="receta-image-small">
                        <img src="${receta.imagenUrl}" alt="${receta.nombre}">
                    </div>
                ` : ''}
                <div class="card__content">
                    <div class="card__info">
                        <div class="card__info-item">
                            <i class="fas fa-chalkboard-teacher"></i>
                            <span>${receta.cursoNombre || 'Sin curso'}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-clock"></i>
                            <span>${receta.tiempoPreparacion || 'N/A'}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-users"></i>
                            <span>${receta.porciones || 'N/A'} porciones</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupRecetaEventListeners() {
        document.querySelectorAll('.edit-receta-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recetaId = e.target.dataset.recetaId;
                const receta = this.recetas.find(r => r.id === recetaId);
                this.showRecetaModal(receta);
            });
        });

        document.querySelectorAll('.delete-receta-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recetaId = e.target.dataset.recetaId;
                this.deleteReceta(recetaId);
            });
        });
    }

    showRecetaModal(receta = null) {
        const isEdit = !!receta;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content modal__content--large">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">${isEdit ? 'Editar' : 'Nueva'} Receta</h2>
                <form id="receta-form" class="form">
                    <div class="form__group">
                        <label class="form__label">Nombre de la receta</label>
                        <input type="text" id="receta-nombre" class="input" 
                               value="${receta?.nombre || ''}" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Curso relacionado</label>
                        <select id="receta-curso" class="select">
                            <option value="">Sin curso específico</option>
                            ${this.cursos.map(curso => `
                                <option value="${curso.nombre}" ${receta?.cursoNombre === curso.nombre ? 'selected' : ''}>
                                    ${curso.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Descripción</label>
                        <textarea id="receta-descripcion" class="input" rows="3">${receta?.descripcion || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form__group">
                            <label class="form__label">Tiempo de preparación</label>
                            <input type="text" id="receta-tiempo" class="input" 
                                   value="${receta?.tiempoPreparacion || ''}" placeholder="ej: 30 minutos">
                        </div>
                        <div class="form__group">
                            <label class="form__label">Porciones</label>
                            <input type="text" id="receta-porciones" class="input" 
                                   value="${receta?.porciones || ''}" placeholder="ej: 4 porciones">
                        </div>
                        <div class="form__group">
                            <label class="form__label">Dificultad</label>
                            <select id="receta-dificultad" class="select">
                                <option value="Fácil" ${receta?.dificultad === 'Fácil' ? 'selected' : ''}>Fácil</option>
                                <option value="Media" ${receta?.dificultad === 'Media' ? 'selected' : ''}>Media</option>
                                <option value="Difícil" ${receta?.dificultad === 'Difícil' ? 'selected' : ''}>Difícil</option>
                            </select>
                        </div>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Ingredientes (uno por línea)</label>
                        <textarea id="receta-ingredientes" class="input" rows="6">${receta?.ingredientes || ''}</textarea>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Instrucciones (una por línea)</label>
                        <textarea id="receta-instrucciones" class="input" rows="8">${receta?.instrucciones || ''}</textarea>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Tips adicionales</label>
                        <textarea id="receta-tips" class="input" rows="3">${receta?.tips || ''}</textarea>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Imagen de la receta</label>
                        <input type="file" id="receta-imagen" class="input" accept="image/*">
                        ${receta?.imagenUrl ? `<p class="file-note">Imagen actual disponible. Selecciona una nueva para reemplazar.</p>` : ''}
                    </div>
                    <div class="modal__actions">
                        <button type="submit" class="btn btn--primary">
                            ${isEdit ? 'Actualizar' : 'Crear'} Receta
                        </button>
                        <button type="button" class="btn btn--outline close-modal">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#receta-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isEdit) {
                this.updateReceta(receta.id, modal);
            } else {
                this.createReceta(modal);
            }
        });

        this.setupModalEventListeners(modal);
    }

    async createReceta(modal) {
        try {
            window.authManager.showLoading();
            
            let imagenUrl = null;
            const imagenFile = modal.querySelector('#receta-imagen').files[0];
            
            if (imagenFile) {
                imagenUrl = await this.uploadRecetaImage(imagenFile);
            }
            
            const recetaData = {
                nombre: modal.querySelector('#receta-nombre').value,
                cursoNombre: modal.querySelector('#receta-curso').value,
                descripcion: modal.querySelector('#receta-descripcion').value,
                tiempoPreparacion: modal.querySelector('#receta-tiempo').value,
                porciones: modal.querySelector('#receta-porciones').value,
                dificultad: modal.querySelector('#receta-dificultad').value,
                ingredientes: modal.querySelector('#receta-ingredientes').value,
                instrucciones: modal.querySelector('#receta-instrucciones').value,
                tips: modal.querySelector('#receta-tips').value,
                imagenUrl: imagenUrl,
                fechaCreacion: new Date(),
                likes: []
            };

            await addDoc(collection(db, 'recetas'), recetaData);
            
            modal.remove();
            window.authManager.showMessage('Receta creada exitosamente', 'success');
            await this.loadAdminRecetas();
            this.renderAdminRecetas();

        } catch (error) {
            console.error('Error creating receta:', error);
            window.authManager.showMessage('Error al crear la receta', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async updateReceta(recetaId, modal) {
        try {
            window.authManager.showLoading();
            
            const recetaData = {
                nombre: modal.querySelector('#receta-nombre').value,
                cursoNombre: modal.querySelector('#receta-curso').value,
                descripcion: modal.querySelector('#receta-descripcion').value,
                tiempoPreparacion: modal.querySelector('#receta-tiempo').value,
                porciones: modal.querySelector('#receta-porciones').value,
                dificultad: modal.querySelector('#receta-dificultad').value,
                ingredientes: modal.querySelector('#receta-ingredientes').value,
                instrucciones: modal.querySelector('#receta-instrucciones').value,
                tips: modal.querySelector('#receta-tips').value
            };

            const imagenFile = modal.querySelector('#receta-imagen').files[0];
            if (imagenFile) {
                recetaData.imagenUrl = await this.uploadRecetaImage(imagenFile);
            }

            await updateDoc(doc(db, 'recetas', recetaId), recetaData);
            
            modal.remove();
            window.authManager.showMessage('Receta actualizada exitosamente', 'success');
            await this.loadAdminRecetas();
            this.renderAdminRecetas();

        } catch (error) {
            console.error('Error updating receta:', error);
            window.authManager.showMessage('Error al actualizar la receta', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async uploadRecetaImage(file) {
        try {
            // Verificar si usar Google Drive
            if (APP_CONFIG.useGoogleDrive && window.googleDriveManager?.isReady()) {
                const fileName = `receta_${Date.now()}_${file.name}`;
                const driveFile = await window.googleDriveManager.uploadFile(file, 'recetas', fileName);
                return driveFile.url;
            } else {
                // Método alternativo: convertir a base64 (solo para imágenes pequeñas)
                if (file.size > 500 * 1024) { // 500KB
                    throw new Error('Imagen muy grande. Máximo 500KB sin Google Drive configurado.');
                }
                
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        resolve(e.target.result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
        } catch (error) {
            console.error('Error uploading receta image:', error);
            throw error;
        }
    }

    async deleteReceta(recetaId) {
        if (!confirm('¿Estás seguro de eliminar esta receta? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            window.authManager.showLoading();
            
            await deleteDoc(doc(db, 'recetas', recetaId));
            
            window.authManager.showMessage('Receta eliminada exitosamente', 'success');
            await this.loadAdminRecetas();
            this.renderAdminRecetas();

        } catch (error) {
            console.error('Error deleting receta:', error);
            window.authManager.showMessage('Error al eliminar la receta', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    // === UTILIDADES ===
    updateAdminFilters() {
        // Actualizar filtro de cursos en inscripciones
        const filterCurso = document.getElementById('filter-curso-admin');
        if (filterCurso) {
            const cursosNombres = [...new Set(this.inscripciones.map(i => i.cursoNombre))];
            
            filterCurso.innerHTML = '<option value="">Todos los cursos</option>';
            cursosNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                filterCurso.appendChild(option);
            });
        }
    }

    setupModalEventListeners(modal) {
        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.close-modal')?.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    getEstadoText(estado) {
        const estados = {
            'pendiente': 'Pendiente',
            'pagado': 'Pago enviado',
            'confirmado': 'Confirmado'
        };
        return estados[estado] || estado;
    }
}

// Crear instancia global del AdminManager
window.adminManager = new AdminManager();

export default AdminManager;