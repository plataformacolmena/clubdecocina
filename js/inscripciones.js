// Módulo de gestión de inscripciones
import { db, APP_CONFIG } from './firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class InscripcionesManager {
    constructor() {
        this.inscripciones = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navegación a inscripciones
        document.querySelector('a[href="#inscripciones"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadInscripciones();
            window.authManager.showSection('inscripciones');
        });
    }

    async loadInscripciones() {
        if (!window.authManager.getCurrentUser()) return;

        try {
            window.authManager.showLoading();
            
            const q = query(
                collection(db, 'inscripciones'),
                where('usuarioId', '==', window.authManager.getCurrentUser().uid),
                orderBy('fechaInscripcion', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.inscripciones = [];
            
            querySnapshot.forEach((doc) => {
                this.inscripciones.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderInscripciones();
            
        } catch (error) {
            console.error('Error loading inscripciones:', error);
            window.authManager.showMessage('Error al cargar las inscripciones', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    renderInscripciones() {
        const inscripcionesList = document.getElementById('inscripciones-list');
        if (!inscripcionesList) return;

        if (this.inscripciones.length === 0) {
            inscripcionesList.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-calendar-times"></i>
                    <p>No tienes inscripciones</p>
                    <button class="btn btn--primary" onclick="window.authManager.showSection('cursos')">
                        Ver Cursos Disponibles
                    </button>
                </div>
            `;
            return;
        }

        inscripcionesList.innerHTML = this.inscripciones.map(inscripcion => 
            this.createInscripcionCard(inscripcion)
        ).join('');

        // Agregar event listeners
        this.setupInscripcionEventListeners();
    }

    createInscripcionCard(inscripcion) {
        const fechaInscripcion = new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleDateString('es-AR');
        
        return `
            <div class="card inscripcion-card">
                <div class="card__header">
                    <h3 class="card__title">${inscripcion.cursoNombre}</h3>
                    <div class="status status--${inscripcion.estado}">
                        ${this.getEstadoText(inscripcion.estado)}
                    </div>
                </div>
                <div class="card__content">
                    <div class="card__info">
                        <div class="card__info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Inscripto: ${fechaInscripcion}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>Monto: $${inscripcion.costo.toLocaleString()}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-info-circle"></i>
                            <span>Estado: ${this.getEstadoText(inscripcion.estado)}</span>
                        </div>
                        ${inscripcion.comprobanteUrl ? `
                            <div class="card__info-item">
                                <i class="fas fa-file-image"></i>
                                <button class="btn btn--outline btn--small ver-comprobante-btn" 
                                        data-comprobante-url="${inscripcion.comprobanteUrl}">
                                    Ver Comprobante
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="card__actions">
                    ${inscripcion.estado === 'pendiente' ? `
                        <button class="btn btn--primary upload-comprobante-btn" 
                                data-inscripcion-id="${inscripcion.id}">
                            <i class="fas fa-upload"></i>
                            ${inscripcion.comprobanteUrl ? 'Cambiar' : 'Subir'} Comprobante
                        </button>
                    ` : ''}
                    ${inscripcion.estado !== 'confirmado' ? `
                        <button class="btn btn--secondary editar-inscripcion-btn" 
                                data-inscripcion-id="${inscripcion.id}">
                            <i class="fas fa-edit"></i>
                            Editar Inscripción
                        </button>
                    ` : ''}
                    <button class="btn btn--outline ver-detalles-pago-btn" 
                            data-inscripcion-id="${inscripcion.id}">
                        <i class="fas fa-info-circle"></i>
                        Datos de Pago
                    </button>
                    ${inscripcion.estado === 'pendiente' ? `
                        <button class="btn btn--outline btn--danger cancelar-inscripcion-btn" 
                                data-inscripcion-id="${inscripcion.id}">
                            <i class="fas fa-times"></i>
                            Cancelar Inscripción
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupInscripcionEventListeners() {
        // Botones de subir comprobante
        document.querySelectorAll('.upload-comprobante-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.target.dataset.inscripcionId;
                this.showUploadModal(inscripcionId);
            });
        });

        // Botones de ver detalles de pago
        document.querySelectorAll('.ver-detalles-pago-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.target.dataset.inscripcionId;
                const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
                this.showPaymentDetails(inscripcion);
            });
        });

        // Botones de ver comprobante
        document.querySelectorAll('.ver-comprobante-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const comprobanteUrl = e.target.dataset.comprobanteUrl;
                this.showComprobanteModal(comprobanteUrl);
            });
        });

        // Botones de editar inscripción
        document.querySelectorAll('.editar-inscripcion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.target.dataset.inscripcionId;
                this.showEditInscripcionModal(inscripcionId);
            });
        });

        // Botones de cancelar inscripción
        document.querySelectorAll('.cancelar-inscripcion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.target.dataset.inscripcionId;
                this.cancelInscripcion(inscripcionId);
            });
        });
    }

    showUploadModal(inscripcionId) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Subir Comprobante de Pago</h2>
                <form id="upload-comprobante-form" class="form">
                    <div class="form__group">
                        <label class="form__label">Seleccionar archivo (JPG, PNG, PDF)</label>
                        <input type="file" 
                               id="comprobante-file" 
                               accept="image/*,application/pdf" 
                               class="input" 
                               required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Método de pago</label>
                        <select id="metodo-pago" class="select" required>
                            <option value="">Seleccionar método</option>
                            <option value="transferencia">Transferencia Bancaria</option>
                            <option value="deposito">Depósito Bancario</option>
                            <option value="efectivo">Efectivo</option>
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Comentarios (opcional)</label>
                        <textarea id="comentarios-pago" 
                                  class="input" 
                                  rows="3" 
                                  placeholder="Comentarios sobre el pago..."></textarea>
                    </div>
                    <div class="modal__actions">
                        <button type="submit" class="btn btn--primary">
                            <i class="fas fa-upload"></i>
                            Subir Comprobante
                        </button>
                        <button type="button" class="btn btn--outline close-upload-modal">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        const form = modal.querySelector('#upload-comprobante-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadComprobante(inscripcionId, modal);
        });

        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.close-upload-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async uploadComprobante(inscripcionId, modal) {
        const fileInput = modal.querySelector('#comprobante-file');
        const metodoPago = modal.querySelector('#metodo-pago').value;
        const comentarios = modal.querySelector('#comentarios-pago').value;
        
        const file = fileInput.files[0];
        if (!file) {
            window.authManager.showMessage('Selecciona un archivo', 'error');
            return;
        }

        try {
            window.authManager.showLoading();

            let downloadURL = '';

            // Verificar si usar Google Drive o método alternativo
            if (APP_CONFIG.useGoogleDrive && window.googleDriveManager?.isReady()) {
                try {
                    // Subir a Google Drive
                    const fileName = `comprobante_${inscripcionId}_${Date.now()}_${file.name}`;
                    const driveFile = await window.googleDriveManager.uploadFile(file, 'comprobantes', fileName);
                    downloadURL = driveFile.url;
                    
                    window.authManager.showMessage('Archivo subido a Google Drive', 'success');
                } catch (driveError) {
                    console.error('Error con Google Drive, usando método alternativo:', driveError);
                    downloadURL = await this.uploadToAlternativeService(file, inscripcionId);
                }
            } else {
                // Método alternativo sin Firebase Storage
                downloadURL = await this.uploadToAlternativeService(file, inscripcionId);
            }

            // Actualizar inscripción en Firestore
            const inscripcionRef = doc(db, 'inscripciones', inscripcionId);
            await updateDoc(inscripcionRef, {
                comprobanteUrl: downloadURL,
                metodoPago: metodoPago,
                comentariosPago: comentarios,
                fechaSubidaComprobante: new Date(),
                estado: 'pagado' // Cambiar estado a pagado
            });

            modal.remove();
            window.authManager.showMessage('Comprobante subido exitosamente', 'success');
            
            // Recargar inscripciones
            await this.loadInscripciones();

        } catch (error) {
            console.error('Error uploading comprobante:', error);
            window.authManager.showMessage('Error al subir el comprobante', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async uploadToAlternativeService(file, inscripcionId) {
        // Método alternativo: convertir archivo a base64 y almacenar en Firestore
        // NOTA: Solo para archivos pequeños (< 1MB) debido a límites de Firestore
        
        if (file.size > 1024 * 1024) { // 1MB
            throw new Error('El archivo es muy grande. Máximo 1MB permitido sin Google Drive.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                // Crear URL temporal para el archivo
                const dataUrl = `data:${file.type};base64,${base64.split(',')[1]}`;
                
                // Mostrar mensaje de advertencia sobre método alternativo
                window.authManager.showMessage(
                    'Archivo convertido a formato temporal. Recomendamos configurar Google Drive para mejor rendimiento.',
                    'info'
                );
                
                resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showPaymentDetails(inscripcion) {
        const { bankInfo } = APP_CONFIG;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Datos de Pago</h2>
                <div class="payment-details">
                    <div class="course-info">
                        <h3>${inscripcion.cursoNombre}</h3>
                        <p><strong>Monto:</strong> $${inscripcion.costo.toLocaleString()}</p>
                        <p><strong>Estado:</strong> ${this.getEstadoText(inscripcion.estado)}</p>
                    </div>
                    
                    <div class="bank-details">
                        <h3>Datos para transferencia:</h3>
                        <div class="bank-info">
                            <p><strong>Cuenta:</strong> ${bankInfo.account}</p>
                            <p><strong>CBU:</strong> ${bankInfo.cbu}</p>
                            <p><strong>Alias:</strong> ${bankInfo.alias}</p>
                            <p><strong>Banco:</strong> ${bankInfo.bank}</p>
                        </div>
                    </div>
                    
                    ${inscripcion.metodoPago ? `
                        <div class="payment-method">
                            <h3>Método de pago utilizado:</h3>
                            <p>${this.getMetodoPagoText(inscripcion.metodoPago)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="payment-status">
                        <p class="note">
                            <i class="fas fa-info-circle"></i>
                            ${this.getEstadoDescription(inscripcion.estado)}
                        </p>
                    </div>
                </div>
                <div class="modal__actions">
                    <button class="btn btn--outline close-details-modal">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.close-details-modal').addEventListener('click', () => {
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
            'pendiente': 'Pendiente de pago',
            'pagado': 'Pago enviado',
            'confirmado': 'Confirmado',
            'cancelado': 'Cancelado'
        };
        return estados[estado] || estado;
    }

    getEstadoDescription(estado) {
        const descripciones = {
            'pendiente': 'Realiza la transferencia y sube tu comprobante para confirmar tu inscripción.',
            'pagado': 'Tu comprobante fue enviado y está siendo verificado por el administrador.',
            'confirmado': '¡Tu inscripción está confirmada! Recibirás más información por email.',
            'cancelado': 'Esta inscripción ha sido cancelada.'
        };
        return descripciones[estado] || '';
    }

    getMetodoPagoText(metodo) {
        const metodos = {
            'transferencia': 'Transferencia Bancaria',
            'deposito': 'Depósito Bancario',
            'efectivo': 'Efectivo'
        };
        return metodos[metodo] || metodo;
    }

    showEditInscripcionModal(inscripcionId) {
        const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
        if (!inscripcion) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Editar Inscripción</h2>
                <form id="edit-inscripcion-form" class="form">
                    <div class="form__group">
                        <label class="form__label">Curso</label>
                        <input type="text" value="${inscripcion.cursoNombre}" class="input" readonly>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Nombre completo</label>
                        <input type="text" id="edit-nombre" value="${inscripcion.usuarioNombre}" class="input" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label">Teléfono</label>
                        <input type="tel" id="edit-telefono" value="${inscripcion.telefono || ''}" class="input">
                    </div>
                    <div class="form__group">
                        <label class="form__label">Comentarios adicionales</label>
                        <textarea id="edit-comentarios" class="input" rows="3">${inscripcion.comentarios || ''}</textarea>
                    </div>
                    <div class="form__actions">
                        <button type="submit" class="btn btn--primary">
                            <i class="fas fa-save"></i>
                            Guardar Cambios
                        </button>
                        <button type="button" class="btn btn--outline modal-cancel">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        modal.querySelector('.modal__close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#edit-inscripcion-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateInscripcion(inscripcionId, {
                usuarioNombre: modal.querySelector('#edit-nombre').value,
                telefono: modal.querySelector('#edit-telefono').value,
                comentarios: modal.querySelector('#edit-comentarios').value
            });
            document.body.removeChild(modal);
        });
    }

    async updateInscripcion(inscripcionId, updates) {
        try {
            window.authManager.showLoading();
            
            await updateDoc(doc(db, 'inscripciones', inscripcionId), {
                ...updates,
                fechaModificacion: new Date()
            });
            
            window.authManager.showMessage('Inscripción actualizada exitosamente', 'success');
            await this.loadInscripciones();
            
        } catch (error) {
            console.error('Error updating inscripcion:', error);
            window.authManager.showMessage('Error al actualizar inscripción', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async cancelInscripcion(inscripcionId) {
        if (!confirm('¿Estás seguro de cancelar esta inscripción? Esta acción no se puede deshacer.')) return;

        try {
            window.authManager.showLoading();
            
            await updateDoc(doc(db, 'inscripciones', inscripcionId), {
                estado: 'cancelado',
                fechaCancelacion: new Date(),
                canceladoPor: 'usuario'
            });
            
            // TODO: Enviar email de notificación de cancelación
            
            window.authManager.showMessage('Inscripción cancelada exitosamente', 'success');
            await this.loadInscripciones();
            
        } catch (error) {
            console.error('Error canceling inscripcion:', error);
            window.authManager.showMessage('Error al cancelar inscripción', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    // Mostrar modal con el comprobante
    showComprobanteModal(comprobanteUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content" style="max-width: 90vw; max-height: 90vh;">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Comprobante de Pago</h2>
                <div style="text-align: center; overflow: auto; max-height: 70vh;">
                    <img src="${comprobanteUrl}" alt="Comprobante de Pago" 
                         style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 2rem; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>No se pudo cargar la imagen del comprobante.</p>
                        <p>Esto puede ocurrir si el archivo se subió usando el método alternativo.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Método para usar desde otros módulos
    getInscripcionById(inscripcionId) {
        return this.inscripciones.find(inscripcion => inscripcion.id === inscripcionId);
    }
}

// Crear instancia global del InscripcionesManager
window.inscripcionesManager = new InscripcionesManager();

export default InscripcionesManager;