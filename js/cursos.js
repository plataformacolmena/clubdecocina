// Módulo de gestión de cursos
import { db, APP_CONFIG } from './firebase-config.js';
import { systemLogger } from './system-logger.js';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    limit,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class CursosManager {
    constructor() {
        this.cursos = [];
        this.inscripcionListeners = new Map(); // Mapa de listeners activos por curso
        this.setupEventListeners();
    }

    // Método para contar inscriptos activos dinámicamente
    async contarInscriptosActivos(cursoId) {
        try {
            // Verificar que Firebase esté listo
            if (!db) {
                console.error('❌ Firebase no inicializado para contar inscriptos');
                return 0;
            }
            
            console.log(`🔢 Contando inscriptos para curso: ${cursoId}`);
            const q = query(
                collection(db, 'inscripciones'),
                where('cursoId', '==', cursoId),
                where('estado', 'in', ['pendiente', 'pagado', 'confirmado'])
            );
            
            const querySnapshot = await getDocs(q);
            const count = querySnapshot.size;
            console.log(`✅ Curso ${cursoId}: ${count} inscriptos activos encontrados`);
            
            // Debug: mostrar detalles de inscripciones
            if (count > 0) {
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ${data.usuarioNombre || 'Sin nombre'} (${data.estado})`);
                });
            } else {
                console.log(`   ℹ️ No se encontraron inscripciones activas para curso ${cursoId}`);
            }
            
            return count;
        } catch (error) {
            console.error('❌ Error contando inscriptos activos:', error);
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

        // Limpiar listeners cuando se cambie de sección
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.previousSection === 'cursos') {
                console.log('🔌 Limpiando listeners al salir de sección cursos');
                this.clearInscripcionListeners();
            }
        });
    }

    async loadCursos(forceReload = false) {
        try {
            // Limpiar listeners existentes antes de recargar
            if (forceReload) {
                this.clearInscripcionListeners();
            }
            
            // Si ya hay cursos cargados y no se fuerza la recarga, solo renderizar
            if (this.cursos.length > 0 && !forceReload) {
                this.showCursosLoading();
                await this.renderCursos();
                this.hideCursosLoading();
                return;
            }
            
            this.showCursosLoading();
            
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
            
            await this.renderCursos();
            
        } catch (error) {
            console.error('Error loading cursos:', error);
            window.authManager.showMessage('Error al cargar los cursos', 'error');
        } finally {
            this.hideCursosLoading();
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

        // Renderizar tarjetas de forma más robusta
        console.log(`🎯 Renderizando ${cursos.length} cursos...`);
        console.log(`⚡ Ejecutando creación de tarjetas en PARALELO...`);
        
        // Ejecutar todas las creaciones de tarjetas en paralelo para mejor rendimiento
        const cardPromises = cursos.map(async (curso) => {
            try {
                return await this.createCursoCard(curso);
            } catch (error) {
                console.error(`❌ Error al crear tarjeta para curso ${curso.nombre}:`, error);
                // Crear una tarjeta de error como fallback
                return `
                    <div class="card" style="border: 2px solid red;">
                        <h3>${curso.nombre}</h3>
                        <p style="color: red;">Error al cargar datos del curso</p>
                    </div>
                `;
            }
        });
        
        const cards = await Promise.all(cardPromises);
        
        cursosGrid.innerHTML = cards.join('');
        
        // Agregar event listeners a los botones de inscripción
        cursosGrid.querySelectorAll('.inscribirse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cursoId = e.target.dataset.cursoId;
                this.inscribirseACurso(cursoId);
            });
        });

        // Configurar listeners en tiempo real para inscripciones
        this.setupInscripcionListeners();
        
        console.log(`✅ Renderizado completo de ${cursos.length} cursos`);
    }

    async createCursoCard(curso) {
        console.log(`🃏 Creando tarjeta para curso: "${curso.nombre}" (ID: ${curso.id})`);
        
        const fechaFormatted = new Date(curso.fechaHora.seconds * 1000).toLocaleString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Ejecutar consultas en paralelo para mejor rendimiento
        const [inscriptosActuales, inscripcionInfo] = await Promise.all([
            this.contarInscriptosActivos(curso.id),
            window.authManager.getCurrentUser() 
                ? this.verificarInscripcionCompleta(curso.id).catch(error => {
                    console.log('Error verificando inscripción:', error);
                    return { inscrito: false, estado: '' };
                })
                : Promise.resolve({ inscrito: false, estado: '' })
        ]);
        
        const disponibles = curso.capacidadMaxima - inscriptosActuales;
        const estaCompleto = disponibles <= 0;
        const yaTermino = new Date(curso.fechaHora.seconds * 1000) < new Date();
        const estaInscrito = inscripcionInfo.inscrito;
        const estadoInscripcion = inscripcionInfo.estado || '';
        
        console.log(`📊 Tarjeta curso "${curso.nombre}":`, {
            inscriptosActuales: inscriptosActuales,
            tipoInscriptos: typeof inscriptosActuales,
            capacidadMaxima: curso.capacidadMaxima,
            disponibles: disponibles,
            estaCompleto: estaCompleto,
            estaInscrito: estaInscrito
        });

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

    // Validar que el usuario tenga teléfono registrado
    async validarTelefono() {
        try {
            const userEmail = window.authManager.getCurrentUser().email;
            
            // Verificar si el usuario ya tiene teléfono en base_inscriptos
            const inscriptoRef = doc(db, 'base_inscriptos', userEmail);
            const inscriptoDoc = await getDoc(inscriptoRef);
            
            if (inscriptoDoc.exists()) {
                const inscriptoData = inscriptoDoc.data();
                if (inscriptoData.telefono && inscriptoData.telefono.trim() !== '') {
                    console.log('✅ Usuario ya tiene teléfono registrado:', inscriptoData.telefono);
                    return inscriptoData.telefono;
                }
            }
            
            // Si no tiene teléfono, mostrar modal para pedirlo
            console.log('📱 Solicitando teléfono al usuario...');
            const telefono = await this.mostrarModalTelefono();
            
            if (telefono) {
                // Guardar teléfono en base_inscriptos
                await this.guardarTelefonoEnBase(userEmail, telefono);
                return telefono;
            }
            
            return null; // Usuario canceló
            
        } catch (error) {
            console.error('❌ Error validando teléfono:', error);
            return null;
        }
    }

    // Mostrar modal para solicitar teléfono
    async mostrarModalTelefono() {
        return new Promise((resolve) => {
            // Crear modal dinámicamente
            const modalHTML = `
                <div id="telefono-modal" class="modal-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                ">
                    <div class="modal-content" style="
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        max-width: 400px;
                        width: 90%;
                    ">
                        <h3 style="margin-top: 0; color: #333; text-align: center;">
                            📱 Necesitamos tu teléfono
                        </h3>
                        <p style="color: #666; text-align: center; margin-bottom: 20px;">
                            Para completar tu inscripción, necesitamos tu número de teléfono para contactarte.
                        </p>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                                Número de teléfono:
                            </label>
                            <input 
                                type="tel" 
                                id="telefono-input" 
                                placeholder="+56 9 1234 5678"
                                style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #ddd;
                                    border-radius: 5px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                "
                            />
                            <small style="color: #999; font-size: 12px;">
                                Incluye código de país (ej: +56 para Chile)
                            </small>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button 
                                id="telefono-cancelar" 
                                style="
                                    padding: 10px 20px;
                                    border: 2px solid #ddd;
                                    background: white;
                                    border-radius: 5px;
                                    cursor: pointer;
                                "
                            >
                                Cancelar
                            </button>
                            <button 
                                id="telefono-guardar" 
                                style="
                                    padding: 10px 20px;
                                    border: none;
                                    background: #007bff;
                                    color: white;
                                    border-radius: 5px;
                                    cursor: pointer;
                                "
                            >
                                Guardar y Continuar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Insertar modal en el DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.getElementById('telefono-modal');
            const input = document.getElementById('telefono-input');
            const cancelarBtn = document.getElementById('telefono-cancelar');
            const guardarBtn = document.getElementById('telefono-guardar');
            
            // Enfocar input
            setTimeout(() => input.focus(), 100);
            
            // Validación de teléfono
            const validarTelefono = (telefono) => {
                const regex = /^\+?[\d\s\-\(\)]{8,}$/;
                return regex.test(telefono.trim());
            };
            
            // Eventos
            cancelarBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
            
            guardarBtn.onclick = () => {
                const telefono = input.value.trim();
                if (!telefono) {
                    alert('Por favor ingresa tu teléfono');
                    input.focus();
                    return;
                }
                
                if (!validarTelefono(telefono)) {
                    alert('Por favor ingresa un teléfono válido (mínimo 8 dígitos, puede incluir código de país)');
                    input.focus();
                    return;
                }
                
                modal.remove();
                resolve(telefono);
            };
            
            // Enter para guardar
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    guardarBtn.click();
                }
            };
            
            // Escape para cancelar
            document.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    cancelarBtn.click();
                }
            };
        });
    }

    // Guardar teléfono en base_inscriptos
    async guardarTelefonoEnBase(email, telefono) {
        try {
            const inscriptoRef = doc(db, 'base_inscriptos', email);
            const inscriptoDoc = await getDoc(inscriptoRef);
            
            if (inscriptoDoc.exists()) {
                // Actualizar registro existente
                await updateDoc(inscriptoRef, {
                    telefono: telefono,
                    fechaActualizacion: new Date()
                });
            } else {
                // Crear nuevo registro básico
                const userData = window.authManager.getCurrentUser();
                await setDoc(inscriptoRef, {
                    email: email,
                    nombre: userData.displayName || userData.email,
                    telefono: telefono,
                    totalCursos: 0,
                    cursosConfirmados: 0,
                    cursosDetalle: [],
                    fechaRegistro: new Date(),
                    fechaActualizacion: new Date(),
                    montoTotal: 0,
                    activo: true
                });
            }
            
            console.log('✅ Teléfono guardado en base_inscriptos:', telefono);
            
        } catch (error) {
            console.error('❌ Error guardando teléfono:', error);
            throw error;
        }
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

            // 🆕 VALIDAR TELÉFONO ANTES DE INSCRIBIRSE
            const telefono = await this.validarTelefono();
            if (!telefono) {
                // Usuario canceló el modal o hubo error
                throw new Error('Inscripción cancelada: teléfono requerido');
            }

            // Crear la inscripción
            const inscripcionData = {
                usuarioId: window.authManager.getCurrentUser().uid,
                usuarioEmail: window.authManager.getCurrentUser().email,
                usuarioNombre: window.authManager.getCurrentUser().displayName || window.authManager.getCurrentUser().email,
                telefono: telefono, // 🆕 CAMPO TELÉFONO VALIDADO
                cursoId: cursoId,
                cursoNombre: curso.nombre,
                costo: curso.costo,
                fechaInscripcion: new Date(),
                estado: 'pendiente', // pendiente, pagado, confirmado
                metodoPago: null,
                comprobanteUrl: null
            };

            const inscripcionRef = await addDoc(collection(db, 'inscripciones'), inscripcionData);

            // Actualizar base_inscriptos con nueva inscripción
            try {
                if (window.baseInscriptosManager) {
                    await window.baseInscriptosManager.actualizarInscripto(
                        inscripcionData.usuarioEmail,
                        { ...inscripcionData, id: inscripcionRef.id },
                        curso
                    );
                    console.log('✅ Base de inscriptos actualizada con nueva inscripción');
                }
            } catch (baseError) {
                console.error('⚠️ Error actualizando base_inscriptos:', baseError);
                // No detener el proceso principal por este error
            }

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

    // Función de debug para probar desde consola
    async debugContarInscriptos(cursoId) {
        console.log('🔧 FUNCIÓN DEBUG - Contando inscriptos para:', cursoId);
        try {
            const result = await this.contarInscriptosActivos(cursoId);
            console.log('🔧 RESULTADO DEBUG:', result);
            return result;
        } catch (error) {
            console.error('🔧 ERROR DEBUG:', error);
            return null;
        }
    }

    // Función para ver todos los cursos disponibles
    debugVerCursos() {
        console.log('🔧 CURSOS CARGADOS:', this.cursos);
        return this.cursos;
    }

    // Función para ver todas las inscripciones
    async debugVerInscripciones() {
        try {
            console.log('🔧 OBTENIENDO TODAS LAS INSCRIPCIONES...');
            const querySnapshot = await getDocs(collection(db, 'inscripciones'));
            const inscripciones = [];
            querySnapshot.forEach(doc => {
                inscripciones.push({ id: doc.id, ...doc.data() });
            });
            console.log('🔧 INSCRIPCIONES ENCONTRADAS:', inscripciones);
            return inscripciones;
        } catch (error) {
            console.error('🔧 ERROR AL OBTENER INSCRIPCIONES:', error);
            return [];
        }
    }

    // Métodos para manejar el spinner de carga de cursos
    showCursosLoading() {
        console.log('🔄 Mostrando spinner de carga de cursos...');
        const cursosGrid = document.getElementById('cursos-grid');
        const cursosLoading = document.getElementById('cursos-loading');
        
        if (cursosGrid) cursosGrid.style.display = 'none';
        if (cursosLoading) cursosLoading.style.display = 'flex';
    }

    hideCursosLoading() {
        console.log('✅ Ocultando spinner de carga de cursos');
        const cursosGrid = document.getElementById('cursos-grid');
        const cursosLoading = document.getElementById('cursos-loading');
        
        if (cursosLoading) cursosLoading.style.display = 'none';
        if (cursosGrid) cursosGrid.style.display = 'grid';
    }

    // Configurar listeners en tiempo real para inscripciones
    setupInscripcionListeners() {
        // Limpiar listeners existentes
        this.clearInscripcionListeners();
        
        this.cursos.forEach(curso => {
            const q = query(
                collection(db, 'inscripciones'),
                where('cursoId', '==', curso.id),
                where('estado', 'in', ['pendiente', 'pagado', 'confirmado'])
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const inscriptosActuales = snapshot.size;
                const disponibles = curso.capacidadMaxima - inscriptosActuales;
                const estaCompleto = disponibles <= 0;
                
                // Actualizar el botón específico de este curso
                this.updateCursoButton(curso.id, estaCompleto, inscriptosActuales, disponibles);
            }, (error) => {
                console.error(`Error en listener de inscripciones para curso ${curso.id}:`, error);
            });
            
            this.inscripcionListeners.set(curso.id, unsubscribe);
        });
        
        console.log(`📡 Configurados ${this.inscripcionListeners.size} listeners de inscripciones en tiempo real`);
    }

    // Limpiar todos los listeners de inscripciones
    clearInscripcionListeners() {
        this.inscripcionListeners.forEach((unsubscribe, cursoId) => {
            unsubscribe();
            console.log(`🔌 Desconectado listener para curso ${cursoId}`);
        });
        this.inscripcionListeners.clear();
    }

    // Actualizar botón específico de un curso cuando cambian las inscripciones
    updateCursoButton(cursoId, estaCompleto, inscriptosActuales, disponibles) {
        const cursoCard = document.querySelector(`[data-curso-id="${cursoId}"]`)?.closest('.curso-card');
        if (!cursoCard) return;
        
        // Actualizar contador de inscriptos
        const contadorElement = cursoCard.querySelector('.card__info-item span');
        if (contadorElement && contadorElement.textContent.includes('inscriptos')) {
            const curso = this.cursos.find(c => c.id === cursoId);
            if (curso) {
                contadorElement.textContent = `${inscriptosActuales}/${curso.capacidadMaxima} inscriptos`;
            }
        }
        
        // Actualizar información de cupos disponibles
        const disponiblesElement = cursoCard.querySelector('.card__info-item:last-child span');
        if (disponiblesElement && disponiblesElement.textContent.includes('cupos')) {
            disponiblesElement.textContent = `${disponibles} cupos disponibles`;
        }
        
        // Actualizar estado del botón
        const button = cursoCard.querySelector('.inscribirse-btn');
        if (button) {
            if (estaCompleto) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-times"></i> Curso Completo';
                button.classList.remove('btn--primary');
                button.classList.add('btn--secondary');
            } else {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Inscribirse';
                button.classList.remove('btn--secondary');
                button.classList.add('btn--primary');
            }
        }
        
        console.log(`🔄 Actualizado botón curso ${cursoId}: ${inscriptosActuales} inscriptos, ${disponibles} disponibles`);
    }
}

// Crear instancia global del CursosManager
window.cursosManager = new CursosManager();

export default CursosManager;