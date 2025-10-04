// Módulo de gestión de cursos
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
    where,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class CursosManager {
    constructor() {
        this.cursos = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filtros de búsqueda
        document.getElementById('search-cursos')?.addEventListener('input', (e) => {
            this.filterCursos(e.target.value);
        });
        
        document.getElementById('filter-fecha')?.addEventListener('change', (e) => {
            this.filterByFecha(e.target.value);
        });

        // Filtro de estado del curso
        document.getElementById('filter-estado-curso')?.addEventListener('change', (e) => {
            this.filterByEstadoCurso(e.target.value);
        });

        // Navegación a cursos
        document.querySelector('a[href="#cursos"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadCursos(true); // Forzar recarga al hacer click en el menú
            window.authManager.showSection('cursos');
        });
    }

    async loadCursos(forceReload = false) {
        try {
            // Si ya hay cursos cargados y no se fuerza la recarga, solo renderizar
            if (this.cursos.length > 0 && !forceReload) {
                this.renderCursos();
                return;
            }
            
            window.authManager.showLoading();
            
            const q = query(
                collection(db, 'cursos'),
                orderBy('fechaHora', 'asc')
            );
            
            const querySnapshot = await getDocs(q);
            this.cursos = [];
            
            querySnapshot.forEach((doc) => {
                this.cursos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderCursos();
            this.updateFechaFilter();
            
        } catch (error) {
            console.error('Error loading cursos:', error);
            window.authManager.showMessage('Error al cargar los cursos', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    renderCursos(cursosToRender = this.cursos) {
        const cursosGrid = document.getElementById('cursos-grid');
        if (!cursosGrid) return;

        if (cursosToRender.length === 0) {
            cursosGrid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron cursos</p>
                </div>
            `;
            return;
        }

        cursosGrid.innerHTML = cursosToRender.map(curso => this.createCursoCard(curso)).join('');
        
        // Agregar event listeners a los botones de inscripción
        cursosGrid.querySelectorAll('.inscribirse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cursoId = e.target.dataset.cursoId;
                this.inscribirseACurso(cursoId);
            });
        });
    }

    createCursoCard(curso) {
        const fechaFormatted = new Date(curso.fechaHora.seconds * 1000).toLocaleString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const inscriptosActuales = curso.inscriptos || 0;
        const disponibles = curso.capacidadMaxima - inscriptosActuales;
        const estaCompleto = disponibles <= 0;
        
        const now = new Date();
        const cursoDate = new Date(curso.fechaHora.seconds * 1000);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const cursoDay = new Date(cursoDate.getFullYear(), cursoDate.getMonth(), cursoDate.getDate());
        
        let estadoCurso = '';
        let estadoClass = '';
        
        if (cursoDay < today) {
            estadoCurso = 'Terminado';
            estadoClass = 'status--terminado';
        } else if (cursoDay.getTime() === today.getTime()) {
            estadoCurso = estaCompleto ? 'Completo (Hoy)' : 'Hoy';
            estadoClass = 'status--hoy';
        } else if (estaCompleto) {
            estadoCurso = 'Completo';
            estadoClass = 'status--completo';
        } else {
            estadoCurso = 'Disponible';
            estadoClass = 'status--disponible';
        }

        return `
            <div class="card curso-card ${cursoDay < today ? 'curso-terminado' : ''}">
                <div class="card__header">
                    <h3 class="card__title">${curso.nombre}</h3>
                    <div class="status ${estadoClass}">
                        ${estadoCurso}
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
                        <div class="card__info-item">
                            <i class="fas fa-check-circle"></i>
                            <span>${disponibles} cupos disponibles</span>
                        </div>
                    </div>
                    ${curso.descripcion ? `
                        <div class="card__description">
                            <p>${curso.descripcion}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="card__actions">
                    ${cursoDay >= today && !estaCompleto ? `
                        <button class="btn btn--primary inscribirse-btn" data-curso-id="${curso.id}">
                            <i class="fas fa-user-plus"></i>
                            Inscribirse
                        </button>
                    ` : cursoDay < today ? `
                        <span class="curso-terminado-label">
                            <i class="fas fa-check-circle"></i>
                            Curso finalizado
                        </span>
                    ` : ''}
                    <button class="btn btn--outline ver-detalles-btn" data-curso-id="${curso.id}">
                        <i class="fas fa-info-circle"></i>
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    }

    filterCursos(searchTerm) {
        const filtered = this.cursos.filter(curso =>
            curso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            curso.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderCursos(filtered);
    }

    filterByFecha(fechaFilter) {
        if (!fechaFilter) {
            this.renderCursos();
            return;
        }

        const filtered = this.cursos.filter(curso => {
            const cursoDate = new Date(curso.fechaHora.seconds * 1000);
            const filterDate = new Date(fechaFilter);
            
            return cursoDate.toDateString() === filterDate.toDateString();
        });
        
        this.renderCursos(filtered);
    }

    filterByEstadoCurso(estadoFilter) {
        if (!estadoFilter) {
            this.renderCursos();
            return;
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filtered = this.cursos.filter(curso => {
            const cursoDate = new Date(curso.fechaHora.seconds * 1000);
            const cursoDay = new Date(cursoDate.getFullYear(), cursoDate.getMonth(), cursoDate.getDate());
            
            switch (estadoFilter) {
                case 'proximo':
                    return cursoDay >= tomorrow;
                case 'activo':
                    return cursoDay.getTime() === today.getTime();
                case 'terminado':
                    return cursoDay < today;
                default:
                    return true;
            }
        });
        
        this.renderCursos(filtered);
    }

    updateFechaFilter() {
        const fechaFilter = document.getElementById('filter-fecha');
        if (!fechaFilter) return;

        // Obtener fechas únicas de los cursos
        const fechas = [...new Set(this.cursos.map(curso => {
            const date = new Date(curso.fechaHora.seconds * 1000);
            return date.toISOString().split('T')[0];
        }))].sort();

        // Limpiar y agregar opciones
        fechaFilter.innerHTML = '<option value="">Todas las fechas</option>';
        fechas.forEach(fecha => {
            const option = document.createElement('option');
            option.value = fecha;
            option.textContent = new Date(fecha).toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            fechaFilter.appendChild(option);
        });
    }

    async inscribirseACurso(cursoId) {
        if (!window.authManager.getCurrentUser()) {
            window.authManager.showMessage('Debes iniciar sesión para inscribirte', 'error');
            window.authManager.showLoginModal();
            return;
        }

        try {
            window.authManager.showLoading();
            
            // Verificar que el curso existe y tiene cupo
            const curso = this.cursos.find(c => c.id === cursoId);
            if (!curso) {
                throw new Error('Curso no encontrado');
            }

            const inscriptosActuales = curso.inscriptos || 0;
            if (inscriptosActuales >= curso.capacidadMaxima) {
                throw new Error('El curso está completo');
            }

            // Verificar si ya está inscripto
            const yaInscripto = await this.verificarInscripcionExistente(cursoId);
            if (yaInscripto) {
                throw new Error('Ya estás inscripto en este curso');
            }

            // Crear la inscripción
            const inscripcionData = {
                usuarioId: window.authManager.getCurrentUser().uid,
                usuarioEmail: window.authManager.getCurrentUser().email,
                usuarioNombre: window.authManager.getCurrentUser().displayName || window.authManager.getCurrentUser().email,
                cursoId: cursoId,
                cursoNombre: curso.nombre,
                costo: curso.costo,
                fechaInscripcion: new Date(),
                estado: 'pendiente', // pendiente, pagado, confirmado
                metodoPago: null,
                comprobanteUrl: null
            };

            await addDoc(collection(db, 'inscripciones'), inscripcionData);

            // Actualizar contador de inscriptos en el curso
            const cursoRef = doc(db, 'cursos', cursoId);
            await updateDoc(cursoRef, {
                inscriptos: inscriptosActuales + 1
            });

            window.authManager.showMessage('¡Inscripción exitosa!', 'success');
            
            // Recargar cursos para actualizar la vista
            await this.loadCursos();
            
            // Mostrar información de pago
            this.mostrarInformacionPago(curso);
            
        } catch (error) {
            console.error('Error en inscripción:', error);
            window.authManager.showMessage(error.message, 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async verificarInscripcionExistente(cursoId) {
        const q = query(
            collection(db, 'inscripciones'),
            where('usuarioId', '==', window.authManager.getCurrentUser().uid),
            where('cursoId', '==', cursoId)
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    }

    async mostrarInformacionPago(curso) {
        // Obtener datos bancarios dinámicos
        const bankAccount = await window.bankAccountManager?.getActiveAccount();
        
        if (!bankAccount) {
            const message = `
                ¡Te has inscripto exitosamente al curso "${curso.nombre}"!
                
                ⚠️ Los datos bancarios no están configurados.
                Por favor contacta al administrador para obtener la información de pago.
                
                Luego sube tu comprobante en "Mis Inscripciones".
            `;
            alert(message);
            return;
        }
        
        const message = `
            ¡Te has inscripto exitosamente al curso "${curso.nombre}"!
            
            Para completar tu inscripción, realiza la transferencia:
            
            Monto: $${curso.costo.toLocaleString()}
            CVU/CBU: ${bankAccount.cvu}
            Alias: ${bankAccount.alias}
            CUIT: ${bankAccount.cuit}
            Titular: ${bankAccount.titular}
            
            Luego sube tu comprobante en "Mis Inscripciones".
        `;

        // Crear modal personalizado para la información de pago
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Información de Pago</h2>
                <div class="payment-info">
                    <p><strong>¡Inscripción exitosa!</strong></p>
                    <p>Curso: <strong>${curso.nombre}</strong></p>
                    <p>Monto: <strong>$${curso.costo.toLocaleString()}</strong></p>
                    
                    <div class="bank-details">
                        <h3>Datos para transferencia:</h3>
                        <p><strong>CVU/CBU:</strong> ${bankAccount.cvu}</p>
                        <p><strong>Alias:</strong> ${bankAccount.alias}</p>
                        <p><strong>CUIT:</strong> ${bankAccount.cuit}</p>
                        <p><strong>Titular:</strong> ${bankAccount.titular}</p>
                    </div>
                    
                    <p class="note">
                        <i class="fas fa-info-circle"></i>
                        Después de realizar la transferencia, sube tu comprobante en "Mis Inscripciones"
                    </p>
                </div>
                <div class="modal__actions">
                    <button class="btn btn--primary" id="ir-inscripciones">
                        Ver Mis Inscripciones
                    </button>
                    <button class="btn btn--outline close-payment-modal">
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

        modal.querySelector('.close-payment-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#ir-inscripciones').addEventListener('click', () => {
            modal.remove();
            window.authManager.showSection('inscripciones');
            // Cargar inscripciones del usuario
            if (window.inscripcionesManager) {
                window.inscripcionesManager.loadInscripciones();
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Método para obtener curso por ID (usado por otros módulos)
    getCursoById(cursoId) {
        return this.cursos.find(curso => curso.id === cursoId);
    }
}

// Crear instancia global del CursosManager
window.cursosManager = new CursosManager();

export default CursosManager;