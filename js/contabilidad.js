// Módulo de Contabilidad
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

export class ContabilidadManager {
    constructor() {
        this.movimientos = [];
        this.filteredMovimientos = [];
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.sortColumn = 'fecha';
        this.sortDirection = 'desc';
        
        this.filters = {
            tipo: '',
            categoria: '',
            mes: ''
        };
        
        // Inicializar event listeners
        this.setupEventListeners();
        
        // console.log removed
    }

    setupEventListeners() {
        // Sub-tabs
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSubTab(e.target.dataset.subtab);
            });
        });

        // Botones principales
        document.getElementById('nuevo-ingreso-btn')?.addEventListener('click', () => {
            this.showMovimientoModal('ingreso');
        });

        document.getElementById('nuevo-gasto-btn')?.addEventListener('click', () => {
            this.showMovimientoModal('gasto');
        });

        // Form de movimiento
        document.getElementById('movimiento-form')?.addEventListener('submit', (e) => {
            this.handleSaveMovimiento(e);
        });

        // Cancelar modal
        document.getElementById('cancel-movimiento')?.addEventListener('click', () => {
            this.hideMovimientoModal();
        });

        document.getElementById('movimiento-modal-close')?.addEventListener('click', () => {
            this.hideMovimientoModal();
        });

        // Limpiar campos
        document.getElementById('restore-movimiento-defaults')?.addEventListener('click', () => {
            this.clearMovimientoForm();
        });

        // Filtros
        document.getElementById('filter-tipo-movimiento')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filter-categoria-movimiento')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('filter-mes-movimiento')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('limpiar-filtros-movimientos')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Ordenamiento de tabla
        document.querySelectorAll('#movimientos-table .sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.sortMovimientos(column);
            });
        });

        // Establecer fecha actual por defecto
        const fechaInput = document.getElementById('movimiento-fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    }

    switchSubTab(subtabId) {
        // Actualizar botones activos
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');

        // Mostrar contenido activo
        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(subtabId).classList.add('active');

        // Cargar datos según la pestaña
        if (subtabId === 'contabilidad') {
            this.loadContabilidad();
        }
    }

    async loadContabilidad() {
        try {
            // console.log removed
            window.authManager?.showLoading();

            // Configurar snapshot para movimientos (esto también renderiza la tabla)
            await this.loadMovimientos();

            // console.log removed

        } catch (error) {
            console.error('❌ Error configurando contabilidad:', error);
            window.authManager?.showMessage('Error al configurar contabilidad', 'error');
        } finally {
            window.authManager?.hideLoading();
        }
    }

    setupMovimientosSnapshot() {
        try {
            const movimientosRef = collection(db, 'movimientos');
            const q = query(movimientosRef, orderBy('fecha', 'desc'));
            
            // Configurar snapshot en tiempo real
            this.movimientosUnsubscribe = onSnapshot(q, (snapshot) => {
                // console.log removed
                
                this.movimientos = [];
                snapshot.forEach((doc) => {
                    this.movimientos.push({ 
                        id: doc.id, 
                        ...doc.data(),
                        // Convertir timestamp a Date si es necesario
                        fecha: doc.data().fecha?.seconds ? 
                            new Date(doc.data().fecha.seconds * 1000) : 
                            new Date(doc.data().fecha)
                    });
                });

                // console.log removed
                
                // Actualizar la tabla automáticamente
                this.applyFilters();
                this.updateFinancialStats();
                
            }, (error) => {
                console.error('❌ Error en snapshot de movimientos:', error);
                window.authManager?.showMessage('Error de conexión con contabilidad', 'error');
            });
            
        } catch (error) {
            console.error('Error configurando snapshot de movimientos:', error);
            throw error;
        }
    }

    async loadMovimientos() {
        // Método mantenido para compatibilidad y carga inicial
        this.setupMovimientosSnapshot();
    }

    async updateFinancialStats() {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Filtrar movimientos del mes actual
            const currentMonthMovements = this.movimientos.filter(mov => {
                const movDate = new Date(mov.fecha);
                return movDate.getMonth() === currentMonth && 
                       movDate.getFullYear() === currentYear;
            });

            // Calcular totales
            let totalIngresos = 0;
            let totalGastos = 0;

            currentMonthMovements.forEach(mov => {
                if (mov.tipo === 'ingreso') {
                    totalIngresos += mov.monto || 0;
                } else if (mov.tipo === 'gasto') {
                    totalGastos += mov.monto || 0;
                }
            });

            const balanceNeto = totalIngresos - totalGastos;

            // Calcular ingresos pendientes (inscripciones pendientes/pagadas)
            const ingresosPendientes = await this.calculatePendingIncome();

            // Actualizar UI
            document.getElementById('total-ingresos').textContent = 
                `$${totalIngresos.toLocaleString('es-AR')}`;
            document.getElementById('total-gastos').textContent = 
                `$${totalGastos.toLocaleString('es-AR')}`;
            document.getElementById('balance-neto').textContent = 
                `$${balanceNeto.toLocaleString('es-AR')}`;
            document.getElementById('ingresos-pendientes').textContent = 
                `$${ingresosPendientes.toLocaleString('es-AR')}`;

            // Colorear balance según si es positivo o negativo
            const balanceElement = document.getElementById('balance-neto');
            if (balanceElement) {
                if (balanceNeto >= 0) {
                    balanceElement.style.color = '#4CAF50';
                } else {
                    balanceElement.style.color = '#f44336';
                }
            }

        } catch (error) {
            console.error('Error calculando estadísticas:', error);
        }
    }

    async calculatePendingIncome() {
        try {
            // Obtener inscripciones pendientes y pagadas (no confirmadas)
            const inscripcionesRef = collection(db, 'inscripciones');
            const pendientesQuery = query(inscripcionesRef, 
                where('estado', 'in', ['pendiente', 'pagado']));
            const snapshot = await getDocs(pendientesQuery);
            
            let totalPendiente = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                totalPendiente += data.costo || 0;
            });

            return totalPendiente;

        } catch (error) {
            console.error('Error calculando ingresos pendientes:', error);
            return 0;
        }
    }

    showMovimientoModal(tipo = null) {
        const modal = document.getElementById('movimiento-modal');
        const form = document.getElementById('movimiento-form');
        const title = document.getElementById('movimiento-modal-title');
        const submitText = document.getElementById('movimiento-submit-text');
        
        // Resetear formulario
        form.reset();
        delete form.dataset.editId;
        
        // Configurar según tipo
        if (tipo) {
            document.getElementById('movimiento-tipo').value = tipo;
            title.textContent = tipo === 'ingreso' ? 'Nuevo Ingreso' : 'Nuevo Gasto';
            submitText.textContent = tipo === 'ingreso' ? 'Crear Ingreso' : 'Crear Gasto';
        } else {
            title.textContent = 'Nuevo Movimiento';
            submitText.textContent = 'Crear Movimiento';
        }
        
        // Establecer fecha actual
        document.getElementById('movimiento-fecha').value = 
            new Date().toISOString().split('T')[0];
        
        modal.classList.add('active');
    }

    hideMovimientoModal() {
        document.getElementById('movimiento-modal').classList.remove('active');
    }

    clearMovimientoForm() {
        const form = document.getElementById('movimiento-form');
        form.reset();
        // Establecer fecha actual por defecto
        document.getElementById('movimiento-fecha').value = 
            new Date().toISOString().split('T')[0];
    }

    async handleSaveMovimiento(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const movimientoData = {
            tipo: document.getElementById('movimiento-tipo').value,
            categoria: document.getElementById('movimiento-categoria').value,
            descripcion: document.getElementById('movimiento-descripcion').value,
            monto: parseFloat(document.getElementById('movimiento-monto').value),
            fecha: new Date(document.getElementById('movimiento-fecha').value),
            notas: document.getElementById('movimiento-notas').value || null,
            origen: 'manual', // Identificar que fue creado manualmente
            creadoPor: window.authManager?.currentUser?.email || 'sistema',
            fechaCreacion: new Date()
        };

        if (!movimientoData.tipo || !movimientoData.categoria || 
            !movimientoData.descripcion || !movimientoData.monto || !movimientoData.fecha) {
            window.authManager?.showMessage('Todos los campos requeridos deben estar completos', 'error');
            return;
        }

        if (movimientoData.monto <= 0) {
            window.authManager?.showMessage('El monto debe ser mayor a cero', 'error');
            return;
        }

        try {
            window.authManager?.showLoading();
            
            if (form.dataset.editId) {
                // Editar movimiento existente
                const movRef = doc(db, 'movimientos', form.dataset.editId);
                movimientoData.fechaActualizacion = new Date();
                await updateDoc(movRef, movimientoData);
                window.authManager?.showMessage('Movimiento actualizado correctamente', 'success');
            } else {
                // Crear nuevo movimiento
                await addDoc(collection(db, 'movimientos'), movimientoData);
                window.authManager?.showMessage('Movimiento creado correctamente', 'success');
            }
            
            this.hideMovimientoModal();
            // Los datos se actualizarán automáticamente via snapshot
            
        } catch (error) {
            console.error('Error guardando movimiento:', error);
            window.authManager?.showMessage('Error al guardar movimiento', 'error');
        } finally {
            window.authManager?.hideLoading();
        }
    }

    applyFilters() {
        // Obtener valores de filtros
        this.filters.tipo = document.getElementById('filter-tipo-movimiento')?.value || '';
        this.filters.categoria = document.getElementById('filter-categoria-movimiento')?.value || '';
        this.filters.mes = document.getElementById('filter-mes-movimiento')?.value || '';

        // Aplicar filtros
        let filtered = [...this.movimientos];

        if (this.filters.tipo) {
            filtered = filtered.filter(mov => mov.tipo === this.filters.tipo);
        }

        if (this.filters.categoria) {
            filtered = filtered.filter(mov => mov.categoria === this.filters.categoria);
        }

        if (this.filters.mes) {
            const now = new Date();
            let targetMonth, targetYear;
            
            if (this.filters.mes === 'current') {
                targetMonth = now.getMonth();
                targetYear = now.getFullYear();
            } else if (this.filters.mes === 'previous') {
                targetMonth = now.getMonth() - 1;
                targetYear = now.getFullYear();
                if (targetMonth < 0) {
                    targetMonth = 11;
                    targetYear--;
                }
            }
            
            if (targetMonth !== undefined) {
                filtered = filtered.filter(mov => {
                    const movDate = new Date(mov.fecha);
                    return movDate.getMonth() === targetMonth && 
                           movDate.getFullYear() === targetYear;
                });
            }
        }

        this.filteredMovimientos = filtered;
        this.currentPage = 1; // Reset página
        this.renderMovimientosTable();
    }

    clearFilters() {
        document.getElementById('filter-tipo-movimiento').value = '';
        document.getElementById('filter-categoria-movimiento').value = '';
        document.getElementById('filter-mes-movimiento').value = '';
        
        this.filters = { tipo: '', categoria: '', mes: '' };
        this.applyFilters();
    }

    sortMovimientos(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }

        // Actualizar indicadores visuales
        document.querySelectorAll('#movimientos-table .sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });
        document.querySelector(`#movimientos-table [data-column="${column}"]`)
            .classList.add(this.sortDirection);

        // Ordenar datos
        this.filteredMovimientos.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'fecha':
                    valueA = new Date(a.fecha);
                    valueB = new Date(b.fecha);
                    break;
                case 'tipo':
                    valueA = a.tipo;
                    valueB = b.tipo;
                    break;
                case 'categoria':
                    valueA = a.categoria;
                    valueB = b.categoria;
                    break;
                case 'descripcion':
                    valueA = a.descripcion;
                    valueB = b.descripcion;
                    break;
                case 'monto':
                    valueA = a.monto;
                    valueB = b.monto;
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderMovimientosTable();
    }

    renderMovimientosTable() {
        const tableBody = document.getElementById('movimientos-table-body');
        const noMovimientos = document.getElementById('no-movimientos');
        
        if (!tableBody) return;

        // Aplicar filtros si no se han aplicado
        if (this.filteredMovimientos.length === 0 && this.movimientos.length > 0) {
            this.filteredMovimientos = [...this.movimientos];
        }

        if (this.filteredMovimientos.length === 0) {
            tableBody.innerHTML = '';
            noMovimientos.style.display = 'block';
            return;
        }

        noMovimientos.style.display = 'none';

        // Calcular paginación
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredMovimientos.slice(startIndex, endIndex);

        // Renderizar filas
        tableBody.innerHTML = pageData.map(movimiento => 
            this.createMovimientoTableRow(movimiento)).join('');
        
        // Setup event listeners para acciones
        this.setupTableEventListeners();
    }

    createMovimientoTableRow(movimiento) {
        const fecha = new Date(movimiento.fecha).toLocaleDateString('es-AR');
        const tipoIcon = movimiento.tipo === 'ingreso' ? '💰' : '💸';
        const tipoClass = movimiento.tipo === 'ingreso' ? 'text-success' : 'text-danger';
        
        const categoriaIcons = {
            curso: '🎓',
            material: '📦',
            servicio: '🛠️',
            otro: '📋'
        };

        return `
            <tr>
                <td>${fecha}</td>
                <td>
                    <span class="${tipoClass}">
                        ${tipoIcon} ${movimiento.tipo.charAt(0).toUpperCase() + movimiento.tipo.slice(1)}
                    </span>
                </td>
                <td>
                    ${categoriaIcons[movimiento.categoria] || '📋'} 
                    ${movimiento.categoria.charAt(0).toUpperCase() + movimiento.categoria.slice(1)}
                </td>
                <td>${movimiento.descripcion}</td>
                <td class="${tipoClass}">
                    <strong>$${movimiento.monto.toLocaleString('es-AR')}</strong>
                </td>
                <td>
                    <span class="badge ${movimiento.origen === 'automatico' ? 'badge--primary' : 'badge--secondary'}">
                        ${movimiento.origen === 'automatico' ? 'Automático' : 'Manual'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" 
                                data-movimiento-id="${movimiento.id}" 
                                title="Editar movimiento">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" 
                                data-movimiento-id="${movimiento.id}" 
                                title="Eliminar movimiento">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    setupTableEventListeners() {
        // Editar movimiento
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const movimientoId = e.currentTarget.dataset.movimientoId;
                this.editMovimiento(movimientoId);
            });
        });

        // Eliminar movimiento
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const movimientoId = e.currentTarget.dataset.movimientoId;
                this.deleteMovimiento(movimientoId);
            });
        });
    }

    async editMovimiento(movimientoId) {
        const movimiento = this.movimientos.find(m => m.id === movimientoId);
        if (!movimiento) return;

        const modal = document.getElementById('movimiento-modal');
        const form = document.getElementById('movimiento-form');
        const title = document.getElementById('movimiento-modal-title');
        const submitText = document.getElementById('movimiento-submit-text');
        
        // Llenar formulario con datos existentes
        document.getElementById('movimiento-tipo').value = movimiento.tipo;
        document.getElementById('movimiento-categoria').value = movimiento.categoria;
        document.getElementById('movimiento-descripcion').value = movimiento.descripcion;
        document.getElementById('movimiento-monto').value = movimiento.monto;
        document.getElementById('movimiento-fecha').value = 
            new Date(movimiento.fecha).toISOString().split('T')[0];
        document.getElementById('movimiento-notas').value = movimiento.notas || '';
        
        // Configurar modal para edición
        title.textContent = 'Editar Movimiento';
        submitText.textContent = 'Actualizar Movimiento';
        form.dataset.editId = movimientoId;
        
        modal.classList.add('active');
    }

    async deleteMovimiento(movimientoId) {
        if (!confirm('¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            window.authManager?.showLoading();
            
            await deleteDoc(doc(db, 'movimientos', movimientoId));
            
            window.authManager?.showMessage('Movimiento eliminado correctamente', 'success');
            // Los datos se actualizarán automáticamente via snapshot
            
        } catch (error) {
            console.error('Error eliminando movimiento:', error);
            window.authManager?.showMessage('Error al eliminar movimiento', 'error');
        } finally {
            window.authManager?.hideLoading();
        }
    }

    // Método para registrar ingreso automático desde inscripciones
    async registrarIngresoAutomatico(inscripcionData) {
        try {
            const ingresoData = {
                tipo: 'ingreso',
                categoria: 'curso',
                descripcion: `Inscripción a curso: ${inscripcionData.cursoNombre}`,
                monto: inscripcionData.costo,
                fecha: new Date(),
                notas: `Alumno: ${inscripcionData.usuarioNombre} (${inscripcionData.usuarioEmail})`,
                origen: 'automatico',
                inscripcionId: inscripcionData.id,
                creadoPor: 'sistema',
                fechaCreacion: new Date()
            };

            await addDoc(collection(db, 'movimientos'), ingresoData);
            // console.log removed
            
        } catch (error) {
            console.error('❌ Error registrando ingreso automático:', error);
        }
    }

    // Método para limpiar listeners y desuscribirse de snapshots
    destroy() {
        try {
            if (this.movimientosUnsubscribe) {
                this.movimientosUnsubscribe();
                // console.log removed
            }
        } catch (error) {
            console.error('Error al desuscribir snapshots:', error);
        }
    }
}

// Exponer globalmente para integración con admin.js
window.ContabilidadManager = ContabilidadManager;