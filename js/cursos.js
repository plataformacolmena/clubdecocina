// Módulo de gestión de cursos
import { db, APP_CONFIG } from './firebase-config.js';
import { systemLogger } from './system-logger.js';
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

    // Método para contar inscriptos activos dinámicamente
    async contarInscriptosActivos(cursoId) {
        try {
            const q = query(
                collection(db, 'inscripciones'),
                where('cursoId', '==', cursoId),
                where('estado', 'in', ['pendiente', 'pagado', 'confirmado'])
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.size;
        } catch (error) {
            console.error('Error contando inscriptos activos:', error);
            return 0;
        }
    }

    // Método utilitario para sincronizar contador legacy (opcional)
    async sincronizarContadorCurso(cursoId) {
        try {
            const inscriptosReales = await this.contarInscriptosActivos(cursoId);
            const cursoRef = doc(db, 'cursos', cursoId);
            await updateDoc(cursoRef, {
                inscriptos: inscriptosReales,
                ultimaSincronizacion: new Date()
            });
            console.log(`✅ Contador sincronizado para curso ${cursoId}: ${inscriptosReales} inscriptos`);
        } catch (error) {
            console.error('Error sincronizando contador:', error);
        }
    }

    // Método para sincronizar todos los contadores (migración)
    async sincronizarTodosLosContadores() {
        try {
            console.log('🔄 Iniciando sincronización de contadores...');
            for (const curso of this.cursos) {
                await this.sincronizarContadorCurso(curso.id);
            }
            console.log('✅ Sincronización completa');
            window.authManager?.showMessage('Contadores sincronizados exitosamente', 'success');
        } catch (error) {
            console.error('Error en sincronización masiva:', error);
            window.authManager?.showMessage('Error en sincronización', 'error');
        }
    }

    // Método para obtener curso por ID (usado por otros módulos)
    getCursoById(cursoId) {
        return this.cursos.find(c => c.id === cursoId);
    }

    setupEventListeners() {
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
            
        } catch (error) {
            console.error('Error loading cursos:', error);
            window.authManager.showMessage('Error al cargar los cursos', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async renderCursos(cursosToRender = null) {
        const cursosGrid = document.getElementById('cursos-grid');
        if (!cursosGrid) return;

        let cursos = cursosToRender || this.cursos;
        
        // Filtrar automáticamente cursos terminados y cancelados para usuarios normales
        if (!window.authManager.getCurrentUser()?.isAdmin) {
            const now = new Date();
            cursos = cursos.filter(curso => {
                // Filtrar cursos terminados (fecha ya pasó)
                const cursoDate = new Date(curso.fechaHora.seconds * 1000);
                const yaTermino = cursoDate < now;
                
                // Filtrar cursos cancelados (si tienen estado)
                const estaCancelado = curso.estado === 'cancelado';
                
                return !yaTermino && !estaCancelado;
            });
        }

        if (cursos.length === 0) {
            cursosGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>No hay cursos disponibles</h3>
                    <p>Vuelve pronto para ver nuevos cursos</p>
                </div>
            `;
            return;
        }

        cursosGrid.innerHTML = await Promise.all(cursos.map(curso => this.createCursoCard(curso))).then(cards => cards.join(''));
        
        // Agregar event listeners a los botones de inscripción
        cursosGrid.querySelectorAll('.inscribirse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cursoId = e.target.dataset.cursoId;
                this.inscribirseACurso(cursoId);
            });
        });
    }

    async createCursoCard(curso) {
        const fechaFormatted = new Date(curso.fechaHora.seconds * 1000).toLocaleString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calcular inscriptos dinámicamente contando inscripciones activas
        const inscriptosActuales = await this.contarInscriptosActivos(curso.id);
        const disponibles = curso.capacidadMaxima - inscriptosActuales;
        const estaCompleto = disponibles <= 0;
        const yaTermino = new Date(curso.fechaHora.seconds * 1000) < new Date();

        // Verificar si el usuario actual está inscrito en este curso
        let estaInscrito = false;
        let estadoInscripcion = '';
        if (window.authManager.getCurrentUser()) {
            try {
                const inscripcionInfo = await this.verificarInscripcionCompleta(curso.id);
                estaInscrito = inscripcionInfo.inscrito;
                estadoInscripcion = inscripcionInfo.estado || '';
            } catch (error) {
                console.log('Error verificando inscripción:', error);
            }
        }

        return `
            <div class="card curso-card ${estaInscrito ? 'curso-card--inscrito' : ''}">
                <div class="card__header">
                    <h3 class="card__title">${curso.nombre}</h3>
                    <div class="curso-status-container">
                        ${estaInscrito ? `
                            <div class="status status--inscrito">
                                <i class="fas fa-check-circle"></i> 
                                ${estadoInscripcion === 'pagado' ? 'Inscrito y Pagado' : 
                                  estadoInscripcion === 'confirmado' ? 'Confirmado' : 'Inscrito'}
                            </div>
                        ` : ''}
                        <div class="status ${estaCompleto ? 'status--completo' : 'status--disponible'}">
                            ${estaCompleto ? 'Completo' : 'Disponible'}
                        </div>
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
                    ${!estaCompleto && !yaTermino ? (
                        estaInscrito ? `
                            <button class="btn btn--success" disabled>
                                <i class="fas fa-check"></i>
                                Ya inscrito
                            </button>
                        ` : `
                            <button class="btn btn--primary inscribirse-btn" data-curso-id="${curso.id}">
                                <i class="fas fa-user-plus"></i>
                                Inscribirse
                            </button>
                        `
                    ) : ''}
                </div>
            </div>
        `;
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

            // Contar inscriptos activos dinámicamente
            const inscriptosActuales = await this.contarInscriptosActivos(cursoId);
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

            const inscripcionRef = await addDoc(collection(db, 'inscripciones'), inscripcionData);

            // Logging de inscripción exitosa
            await systemLogger.logInscription('new_inscription', {
                inscripcionId: inscripcionRef.id,
                cursoId: cursoId,
                cursoNombre: curso.nombre,
                usuarioEmail: inscripcionData.usuarioEmail,
                usuarioNombre: inscripcionData.usuarioNombre,
                costo: curso.costo,
                success: true
            });

            // Ya no necesitamos actualizar manualmente el contador
            // El sistema ahora calcula dinámicamente los inscriptos activos

            // Enviar notificación de nueva inscripción al admin
            if (window.emailService) {
                try {
                    const emailResult = await window.emailService.procesarInscripcion(inscripcionRef.id, 'nueva');
                    if (emailResult.success) {
                        console.log('✅ Notificación de nueva inscripción enviada al admin');
                    } else {
                        console.log('⚠️ Notificación de nueva inscripción no enviada:', emailResult.reason);
                    }
                } catch (emailError) {
                    console.error('Error enviando notificación de nueva inscripción:', emailError);
                }
            }

            window.authManager.showMessage('¡Inscripción exitosa!', 'success');
            
            // Recargar cursos para actualizar la vista
            await this.loadCursos();
            
            // Mostrar información de pago
            this.mostrarInformacionPago(curso);
            
        } catch (error) {
            // Logging de inscripción fallida
            await systemLogger.logInscription('inscription_failed', {
                cursoId: cursoId,
                cursoNombre: curso?.nombre,
                error: error.message,
                success: false
            });
            
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

    async verificarInscripcionCompleta(cursoId) {
        const q = query(
            collection(db, 'inscripciones'),
            where('usuarioId', '==', window.authManager.getCurrentUser().uid),
            where('cursoId', '==', cursoId)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return { inscrito: false, estado: null };
        }
        
        const inscripcion = querySnapshot.docs[0].data();
        return { 
            inscrito: true, 
            estado: inscripcion.estado || 'pendiente',
            id: querySnapshot.docs[0].id
        };
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