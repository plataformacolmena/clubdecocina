// Módulo de gestión de Base de Datos de Inscriptos
import { db } from './firebase-config.js';
import { systemLogger } from './system-logger.js';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class BaseInscriptosManager {
    constructor() {
        this.inscriptos = [];
        this.filteredInscriptos = [];
        this.isLoading = false;
        this.sortConfig = { column: 'email', direction: 'asc' };
        this.initialized = false;
    }

    // Inicializar event listeners cuando el tab se activa por primera vez
    initializeEventListeners() {
        if (this.initialized) return;
        
        // Botón de actualizar
        const refreshBtn = document.getElementById('refresh-base-usuarios-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.cargarBaseInscriptos();
            });
        }

        // Botón de consolidar
        const consolidarBtn = document.getElementById('consolidar-base-usuarios-btn');
        if (consolidarBtn) {
            consolidarBtn.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de que quieres consolidar todos los datos desde inscripciones? Esto puede tomar unos momentos.')) {
                    await this.consolidarDatosIniciales();
                    await this.cargarBaseInscriptos();
                }
            });
        }

        // Botón de exportar
        const exportBtn = document.getElementById('export-base-usuarios-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportarCSV();
            });
        }

        // Filtros
        const emailFilterEl = document.getElementById('filter-email-usuario');
        if (emailFilterEl) {
            emailFilterEl.addEventListener('input', (e) => {
                this.aplicarFiltros();
            });
        }

        const estadoFilterEl = document.getElementById('filter-estado-usuario');
        if (estadoFilterEl) {
            estadoFilterEl.addEventListener('change', (e) => {
                this.aplicarFiltros();
            });
        }

        // Ordenamiento por columnas
        document.querySelectorAll('#base-usuarios-table th[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                const column = e.target.dataset.sort;
                this.sortTable(column);
            });
        });

        this.initialized = true;
        console.log('✅ Base Usuarios Manager inicializado');
    }

    // Cargar todos los inscriptos consolidados de la colección base_inscriptos
    async cargarBaseInscriptos() {
        try {
            this.isLoading = true;
            this.showLoading();

            console.log('🔄 Cargando base de datos de inscriptos...');

            // Verificar si la colección existe, sino crearla
            await this.verificarYCrearColeccion();

            const inscriptosQuery = query(
                collection(db, 'base_inscriptos'),
                orderBy('fechaUltimaInscripcion', 'desc')
            );

            const querySnapshot = await getDocs(inscriptosQuery);
            this.inscriptos = [];

            querySnapshot.forEach((doc) => {
                const inscriptoData = doc.data();
                this.inscriptos.push({
                    id: doc.id,
                    email: inscriptoData.email || 'No disponible',
                    nombre: inscriptoData.nombre || 'Sin nombre',
                    telefono: inscriptoData.telefono || 'No disponible',
                    totalInscripciones: inscriptoData.totalInscripciones || 0,
                    cursosConfirmados: inscriptoData.cursosConfirmados || 0,
                    cursosPendientes: inscriptoData.cursosPendientes || 0,
                    cursosPagados: inscriptoData.cursosPagados || 0,
                    cursosCancelados: inscriptoData.cursosCancelados || 0,
                    fechaPrimeraInscripcion: inscriptoData.fechaPrimeraInscripcion,
                    fechaUltimaInscripcion: inscriptoData.fechaUltimaInscripcion,
                    montoTotalInvertido: inscriptoData.montoTotalInvertido || 0,
                    montoTotalPendiente: inscriptoData.montoTotalPendiente || 0,
                    metodoPagoPreferido: inscriptoData.metodoPagoPreferido || 'N/A',
                    activo: inscriptoData.activo || false,
                    cursosDetalle: inscriptoData.cursosDetalle || [],
                    // Datos adicionales que puedan existir
                    ...inscriptoData
                });
            });

            console.log(`✅ Cargados ${this.inscriptos.length} inscriptos`);
            
            this.filteredInscriptos = [...this.inscriptos];
            this.renderTabla();
            this.updateStats();

        } catch (error) {
            console.error('❌ Error cargando base de inscriptos:', error);
            this.showMessage('Error al cargar base de inscriptos', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    // Verificar si existe la colección base_inscriptos y crearla/consolidarla si es necesario
    async verificarYCrearColeccion() {
        try {
            const baseInscriptosQuery = query(collection(db, 'base_inscriptos'));
            const snapshot = await getDocs(baseInscriptosQuery);
            
            if (snapshot.empty) {
                console.log('📝 Colección base_inscriptos vacía, creando desde inscripciones...');
                await this.consolidarDatosIniciales();
            } else {
                console.log(`✅ Colección base_inscriptos existe con ${snapshot.size} registros`);
            }
        } catch (error) {
            console.error('❌ Error verificando colección:', error);
        }
    }

    // Consolidar datos iniciales desde todas las inscripciones
    async consolidarDatosIniciales() {
        try {
            console.log('🔄 Procesando todas las inscripciones para crear base_inscriptos...');
            
            // Obtener todas las inscripciones
            const inscripcionesQuery = query(
                collection(db, 'inscripciones'),
                orderBy('fechaInscripcion', 'asc')
            );
            
            const inscripcionesSnapshot = await getDocs(inscripcionesQuery);
            const inscripcionesPorEmail = new Map();
            
            // Obtener también información de cursos para fechas
            const cursosQuery = query(collection(db, 'cursos'));
            const cursosSnapshot = await getDocs(cursosQuery);
            const cursosMap = new Map();
            
            cursosSnapshot.forEach(doc => {
                cursosMap.set(doc.id, doc.data());
            });

            // Agrupar inscripciones por email
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = { id: doc.id, ...doc.data() };
                const email = inscripcion.usuarioEmail;
                
                if (!email) return; // Saltar inscripciones sin email
                
                if (!inscripcionesPorEmail.has(email)) {
                    inscripcionesPorEmail.set(email, []);
                }
                inscripcionesPorEmail.get(email).push(inscripcion);
            });

            console.log(`📊 Procesando ${inscripcionesPorEmail.size} inscriptos únicos...`);

            // Crear documentos consolidados
            for (const [email, inscripciones] of inscripcionesPorEmail) {
                const datosConsolidados = this.consolidarDatosInscripto(email, inscripciones, cursosMap);
                
                await setDoc(doc(db, 'base_inscriptos', email), datosConsolidados);
                console.log(`✅ Creado registro para: ${email}`);
            }

            console.log('🎉 Consolidación inicial completada');
            
        } catch (error) {
            console.error('❌ Error en consolidación inicial:', error);
            throw error;
        }
    }

    // Consolidar datos de un inscripto específico
    consolidarDatosInscripto(email, inscripciones, cursosMap) {
        // Estadísticas básicas
        const totalInscripciones = inscripciones.length;
        const cursosConfirmados = inscripciones.filter(i => i.estado === 'confirmado').length;
        const cursosPendientes = inscripciones.filter(i => i.estado === 'pendiente').length;
        const cursosPagados = inscripciones.filter(i => i.estado === 'pagado').length;
        const cursosCancelados = inscripciones.filter(i => i.estado === 'cancelado').length;

        // Fechas
        const fechas = inscripciones.map(i => i.fechaInscripcion).filter(f => f);
        const fechaPrimeraInscripcion = fechas.length > 0 ? 
            new Date(Math.min(...fechas.map(f => f.toDate ? f.toDate() : new Date(f)))) : null;
        const fechaUltimaInscripcion = fechas.length > 0 ? 
            new Date(Math.max(...fechas.map(f => f.toDate ? f.toDate() : new Date(f)))) : null;

        // Montos
        const inscripcionesValidas = inscripciones.filter(i => ['confirmado', 'pagado'].includes(i.estado));
        const montoTotalInvertido = inscripcionesValidas.reduce((sum, i) => sum + (i.costo || 0), 0);
        const montoTotalPendiente = inscripciones
            .filter(i => i.estado === 'pendiente')
            .reduce((sum, i) => sum + (i.costo || 0), 0);

        // Método de pago preferido
        const metodosPago = inscripciones
            .map(i => i.metodoPago)
            .filter(m => m && m !== 'null');
        const metodoPagoPreferido = metodosPago.length > 0 ? 
            metodosPago.sort((a,b) => metodosPago.filter(v => v === a).length - metodosPago.filter(v => v === b).length).pop() :
            'N/A';

        // Detalles de cursos
        const cursosDetalle = inscripciones.map(inscripcion => {
            const curso = cursosMap.get(inscripcion.cursoId) || {};
            return {
                cursoId: inscripcion.cursoId,
                cursoNombre: inscripcion.cursoNombre || curso.nombre || 'Curso sin nombre',
                fechaInscripcion: inscripcion.fechaInscripcion,
                fechaCurso: curso.fechaHora || null,
                estado: inscripcion.estado || 'pendiente',
                costo: inscripcion.costo || 0,
                metodoPago: inscripcion.metodoPago || 'N/A'
            };
        });

        // Determinar si está activo (inscripción en últimos 6 meses)
        const seiseMesesAtras = new Date();
        seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
        const activo = fechaUltimaInscripcion ? fechaUltimaInscripcion > seiseMesesAtras : false;

        // Obtener nombre y teléfono (del inscripto más reciente)
        const inscripcionReciente = inscripciones
            .sort((a, b) => {
                const fechaA = a.fechaInscripcion?.toDate ? a.fechaInscripcion.toDate() : new Date(a.fechaInscripcion || 0);
                const fechaB = b.fechaInscripcion?.toDate ? b.fechaInscripcion.toDate() : new Date(b.fechaInscripcion || 0);
                return fechaB - fechaA;
            })[0];

        return {
            email: email,
            nombre: inscripcionReciente.usuarioNombre || 'Sin nombre',
            telefono: inscripcionReciente.telefono || 'No disponible',
            totalInscripciones,
            cursosConfirmados,
            cursosPendientes,
            cursosPagados,
            cursosCancelados,
            fechaPrimeraInscripcion,
            fechaUltimaInscripcion,
            fechaUltimaActualizacion: serverTimestamp(),
            montoTotalInvertido,
            montoTotalPendiente,
            metodoPagoPreferido,
            activo,
            cursosDetalle
        };
    }

    // Aplicar filtros
    aplicarFiltros() {
        const emailFilterEl = document.getElementById('filter-email-usuario');
        const emailFilter = emailFilterEl ? emailFilterEl.value.toLowerCase() : '';
        
        const estadoFilterEl = document.getElementById('filter-estado-usuario');
        const estadoFilter = estadoFilterEl ? estadoFilterEl.value : '';

        this.filteredInscriptos = this.inscriptos.filter(inscripto => {
            const matchEmail = !emailFilter || 
                inscripto.email.toLowerCase().includes(emailFilter) ||
                inscripto.nombre.toLowerCase().includes(emailFilter);

            const matchEstado = !estadoFilter || 
                (estadoFilter === 'activo' && inscripto.activo) ||
                (estadoFilter === 'inactivo' && !inscripto.activo) ||
                (estadoFilter === 'confirmados' && inscripto.cursosConfirmados > 0) ||
                (estadoFilter === 'pendientes' && inscripto.cursosPendientes > 0) ||
                (estadoFilter === 'nuevos' && inscripto.totalInscripciones === 1);

            return matchEmail && matchEstado;
        });

        this.renderTabla();
        this.updateStats();
    }

    // Renderizar tabla de inscriptos
    renderTabla() {
        const tbody = document.getElementById('base-usuarios-tbody');
        if (!tbody) return;

        if (this.filteredInscriptos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p style="color: #666;">No se encontraron inscriptos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredInscriptos.map(inscripto => {
            const fechaPrimera = this.formatDate(inscripto.fechaPrimeraInscripcion);
            const fechaUltima = this.formatDate(inscripto.fechaUltimaInscripcion);
            
            return `
                <tr>
                    <td>
                        <div class="user-info-cell">
                            <div class="user-avatar-placeholder"><i class="fas fa-user"></i></div>
                            <div>
                                <strong>${inscripto.nombre}</strong>
                                <br>
                                <small style="color: #666;">${inscripto.email}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="user-badge ${inscripto.activo ? 'user-badge--success' : 'user-badge--secondary'}">
                            ${inscripto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>${inscripto.telefono}</td>
                    <td>
                        <div class="stats-mini">
                            <div class="stat-item">
                                <span class="stat-value">${inscripto.cursosConfirmados}</span>
                                <span class="stat-label">Confirmados</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${inscripto.cursosPendientes}</span>
                                <span class="stat-label">Pendientes</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${inscripto.totalInscripciones}</span>
                                <span class="stat-label">Total</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="amount-cell">
                            <strong style="color: #28a745;">$${inscripto.montoTotalInvertido.toLocaleString()}</strong>
                            ${inscripto.montoTotalPendiente > 0 ? 
                                `<br><small style="color: #ffc107;">Pendiente: $${inscripto.montoTotalPendiente.toLocaleString()}</small>` : 
                                ''
                            }
                        </div>
                    </td>
                    <td>
                        <small style="color: #666;">${fechaPrimera}</small>
                    </td>
                    <td>
                        <small style="color: #666;">${fechaUltima}</small>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-action--view" 
                                    onclick="baseInscriptosManager.verDetallesInscripto('${inscripto.id}')"
                                    title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-action--edit" 
                                    onclick="baseInscriptosManager.editarInscripto('${inscripto.id}')"
                                    title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-action--delete" 
                                    onclick="baseInscriptosManager.eliminarInscripto('${inscripto.id}')"
                                    title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Actualizar estadísticas
    updateStats() {
        const totalInscriptos = this.inscriptos.length;
        const activos = this.inscriptos.filter(i => i.activo).length;
        const confirmados = this.inscriptos.filter(i => i.cursosConfirmados > 0).length;
        const filtrados = this.filteredInscriptos.length;

        // Actualizar elementos del DOM
        const elements = {
            'total-usuarios': totalInscriptos,
            'usuarios-admins': activos,
            'usuarios-verificados': confirmados,
            'usuarios-filtrados': filtrados
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Formatear fechas
    formatDate(timestamp) {
        if (!timestamp) return 'No disponible';
        
        try {
            let date;
            if (timestamp.seconds) {
                // Firestore Timestamp
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp.toDate) {
                // Firestore Timestamp object
                date = timestamp.toDate();
            } else if (typeof timestamp === 'string') {
                // String date
                date = new Date(timestamp);
            } else {
                // Regular Date object
                date = new Date(timestamp);
            }

            return date.toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.warn('Error formateando fecha:', error);
            return 'Fecha inválida';
        }
    }

    // Obtener ícono del proveedor
    getProviderIcon(provider) {
        const icons = {
            'google.com': 'google',
            'microsoft.com': 'microsoft',
            'email': 'envelope',
            'password': 'envelope'
        };
        return icons[provider] || 'user';
    }

    // Obtener texto del proveedor
    getProviderText(provider) {
        const texts = {
            'google.com': 'Google',
            'microsoft.com': 'Microsoft',
            'email': 'Email',
            'password': 'Email'
        };
        return texts[provider] || 'Otro';
    }

    // Ordenar tabla
    sortTable(column) {
        const direction = this.sortConfig.column === column 
            ? (this.sortConfig.direction === 'asc' ? 'desc' : 'asc')
            : 'asc';

        this.sortConfig = { column, direction };

        this.filteredUsuarios.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];

            // Manejar valores null/undefined
            if (!valueA) valueA = '';
            if (!valueB) valueB = '';

            // Convertir a string para comparación
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();

            if (direction === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        });

        this.renderTabla();
        this.updateSortIndicators();
    }

    // Actualizar indicadores de ordenamiento
    updateSortIndicators() {
        document.querySelectorAll('#base-usuarios-table th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.sortConfig.column) {
                th.classList.add(`sort-${this.sortConfig.direction}`);
            }
        });
    }

    // Ver detalles de usuario
    async verDetallesUsuario(userId) {
        const usuario = this.usuarios.find(u => u.id === userId);
        if (!usuario) return;

        const detalles = `
            DETALLES DEL USUARIO:
            
            ID: ${usuario.id}
            UID: ${usuario.uid}
            Email: ${usuario.email}
            Nombre: ${usuario.displayName}
            Teléfono: ${usuario.telefono}
            Administrador: ${usuario.isAdmin ? 'Sí' : 'No'}
            Email Verificado: ${usuario.emailVerified ? 'Sí' : 'No'}
            Proveedor: ${this.getProviderText(usuario.provider)}
            Fecha de Registro: ${this.formatDate(usuario.createdAt)}
            Último Login: ${this.formatDate(usuario.lastLogin)}
            Dirección: ${usuario.direccion}
            Fecha de Nacimiento: ${usuario.fechaNacimiento}
        `;

        alert(detalles);
    }

    // Editar usuario (placeholder)
    async editarUsuario(userId) {
        alert('Funcionalidad de edición en desarrollo');
        // TODO: Implementar modal de edición
    }

    // Eliminar usuario
    async eliminarUsuario(userId) {
        const usuario = this.usuarios.find(u => u.id === userId);
        if (!usuario) return;

        if (!confirm(`¿Estás seguro de eliminar al usuario ${usuario.displayName} (${usuario.email})? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            this.showLoading();
            
            await deleteDoc(doc(db, 'users', userId));
            
            await systemLogger.logSystemActivity('delete_user', {
                userId: userId,
                userEmail: usuario.email,
                userName: usuario.displayName,
                success: true
            });

            this.showMessage('Usuario eliminado exitosamente', 'success');
            this.cargarBaseInscriptos(); // Recargar la lista

        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.showMessage('Error al eliminar usuario', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Exportar a CSV
    exportarCSV() {
        if (this.filteredInscriptos.length === 0) {
            this.showMessage('No hay datos para exportar', 'warning');
            return;
        }

        const headers = [
            'Email', 'Nombre', 'Teléfono', 'Total Inscripciones', 'Confirmados', 'Pendientes', 
            'Monto Total', 'Monto Pendiente', 'Primera Inscripción', 'Última Inscripción', 'Estado'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredInscriptos.map(inscripto => [
                `"${inscripto.email}"`,
                `"${inscripto.nombre}"`,
                `"${inscripto.telefono}"`,
                `"${inscripto.totalInscripciones}"`,
                `"${inscripto.cursosConfirmados}"`,
                `"${inscripto.cursosPendientes}"`,
                `"${inscripto.montoTotalInvertido}"`,
                `"${inscripto.montoTotalPendiente}"`,
                `"${this.formatDate(inscripto.fechaPrimeraInscripcion)}"`,
                `"${this.formatDate(inscripto.fechaUltimaInscripcion)}"`,
                `"${inscripto.activo ? 'Activo' : 'Inactivo'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `base_inscriptos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('Base de inscriptos exportada exitosamente', 'success');
    }

    // Mostrar loading
    showLoading() {
        const loading = document.getElementById('base-usuarios-loading');
        const table = document.getElementById('base-usuarios-table');
        
        if (loading) loading.style.display = 'flex';
        if (table) table.style.opacity = '0.5';
    }

    // Ocultar loading
    hideLoading() {
        const loading = document.getElementById('base-usuarios-loading');
        const table = document.getElementById('base-usuarios-table');
        
        if (loading) loading.style.display = 'none';
        if (table) table.style.opacity = '1';
    }

    // Mostrar mensajes
    showMessage(message, type = 'info') {
        // Usar el sistema de notificaciones del authManager si está disponible
        if (window.authManager && window.authManager.showMessage) {
            window.authManager.showMessage(message, type);
        } else {
            // Fallback a alert si no está disponible
            alert(message);
        }
    }

    // Ver detalles de inscripto
    async verDetallesInscripto(email) {
        const inscripto = this.inscriptos.find(i => i.id === email);
        if (!inscripto) return;

        const detalles = `
            DETALLES DEL INSCRIPTO:
            
            Email: ${inscripto.email}
            Nombre: ${inscripto.nombre}
            Teléfono: ${inscripto.telefono}
            
            ESTADÍSTICAS:
            Total Inscripciones: ${inscripto.totalInscripciones}
            Cursos Confirmados: ${inscripto.cursosConfirmados}
            Cursos Pendientes: ${inscripto.cursosPendientes}
            Cursos Pagados: ${inscripto.cursosPagados}
            Cursos Cancelados: ${inscripto.cursosCancelados}
            
            MONTOS:
            Total Invertido: $${inscripto.montoTotalInvertido.toLocaleString()}
            Total Pendiente: $${inscripto.montoTotalPendiente.toLocaleString()}
            
            FECHAS:
            Primera Inscripción: ${this.formatDate(inscripto.fechaPrimeraInscripcion)}
            Última Inscripción: ${this.formatDate(inscripto.fechaUltimaInscripcion)}
            
            ESTADO: ${inscripto.activo ? 'Activo' : 'Inactivo'}
            Método de Pago Preferido: ${inscripto.metodoPagoPreferido}
        `;

        alert(detalles);
    }

    // Editar inscripto
    async editarInscripto(email) {
        // Implementar modal de edición según necesidades
        this.showMessage('Función de edición en desarrollo', 'info');
    }

    // Eliminar inscripto
    async eliminarInscripto(email) {
        const inscripto = this.inscriptos.find(i => i.id === email);
        if (!inscripto) return;

        if (!confirm(`¿Estás seguro de eliminar el registro del inscripto ${inscripto.nombre} (${inscripto.email})? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            this.showLoading();
            
            await deleteDoc(doc(db, 'base_inscriptos', email));
            
            await systemLogger.logSystemActivity('delete_inscripto', {
                email: email,
                nombre: inscripto.nombre,
                success: true
            });

            this.showMessage('Registro de inscripto eliminado exitosamente', 'success');
            this.cargarBaseInscriptos(); // Recargar la lista

        } catch (error) {
            console.error('Error eliminando inscripto:', error);
            this.showMessage('Error al eliminar inscripto', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Método para activar el tab - se llama cuando se selecciona el tab
    async activateTab() {
        this.initializeEventListeners();
        
        // Solo cargar datos si no los tenemos ya
        if (this.inscriptos.length === 0) {
            await this.cargarBaseInscriptos();
        }
    }

    // Función CRUD: Actualizar inscripto cuando cambia estado de inscripción
    async actualizarInscripto(email, nuevaInscripcion, curso) {
        try {
            const inscriptoRef = doc(db, 'base_inscriptos', email);
            const inscriptoDoc = await getDoc(inscriptoRef);
            
            if (inscriptoDoc.exists()) {
                // Actualizar registro existente
                const datosActuales = inscriptoDoc.data();
                const cursosDetalle = [...(datosActuales.cursosDetalle || [])];
                
                // Buscar si ya existe este curso
                const indiceExistente = cursosDetalle.findIndex(c => c.cursoId === nuevaInscripcion.cursoId);
                
                const nuevoCurso = {
                    cursoId: nuevaInscripcion.cursoId,
                    cursoNombre: nuevaInscripcion.cursoNombre,
                    fechaInscripcion: nuevaInscripcion.fechaInscripcion,
                    fechaCurso: curso?.fechaHora || null,
                    estado: nuevaInscripcion.estado,
                    costo: nuevaInscripcion.costo || 0,
                    metodoPago: nuevaInscripcion.metodoPago || 'N/A'
                };
                
                if (indiceExistente >= 0) {
                    cursosDetalle[indiceExistente] = nuevoCurso;
                } else {
                    cursosDetalle.push(nuevoCurso);
                }
                
                // Recalcular estadísticas
                const cursosConfirmados = cursosDetalle.filter(c => c.estado === 'confirmado').length;
                const cursosPendientes = cursosDetalle.filter(c => c.estado === 'pendiente').length;
                const cursosPagados = cursosDetalle.filter(c => c.estado === 'pagado').length;
                const cursosCancelados = cursosDetalle.filter(c => c.estado === 'cancelado').length;
                
                const datosActualizados = {
                    ...datosActuales,
                    nombre: nuevaInscripcion.usuarioNombre || datosActuales.nombre,
                    telefono: nuevaInscripcion.telefono || datosActuales.telefono,
                    totalInscripciones: cursosDetalle.length,
                    cursosConfirmados,
                    cursosPendientes,
                    cursosPagados,
                    cursosCancelados,
                    fechaUltimaInscripcion: nuevaInscripcion.fechaInscripcion,
                    fechaUltimaActualizacion: serverTimestamp(),
                    cursosDetalle
                };
                
                await updateDoc(inscriptoRef, datosActualizados);
                
            } else {
                // Crear nuevo registro
                const datosConsolidados = this.consolidarDatosInscripto(email, [nuevaInscripcion], new Map([[nuevaInscripcion.cursoId, curso]]));
                await setDoc(inscriptoRef, datosConsolidados);
            }
            
            console.log(`✅ Inscripto ${email} actualizado en base_inscriptos`);
            
        } catch (error) {
            console.error('❌ Error actualizando inscripto:', error);
        }
    }
}

// Crear instancia global
window.baseInscriptosManager = new BaseInscriptosManager();

export default BaseInscriptosManager;