// Módulo de administración
import { db, APP_CONFIG, auth } from './firebase-config.js';
import { systemLogger } from './system-logger.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Gestor de Cuentas Bancarias
class BankAccountManager {
    constructor() {
        this.accounts = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botón nueva cuenta
        document.getElementById('nueva-cuenta-btn')?.addEventListener('click', () => {
            this.showAccountModal();
        });

        // Form de cuenta bancaria
        document.getElementById('cuenta-bancaria-form')?.addEventListener('submit', (e) => {
            this.handleSaveAccount(e);
        });

        // Cancelar modal
        document.getElementById('cancelar-cuenta-btn')?.addEventListener('click', () => {
            this.hideAccountModal();
        });

        // Cerrar modal con X
        document.querySelector('#cuenta-bancaria-modal .modal__close')?.addEventListener('click', () => {
            this.hideAccountModal();
        });
    }

    async loadAccounts() {
        try {
            const accountsRef = collection(db, 'bankAccounts');
            const accountsQuery = query(accountsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(accountsQuery);
            
            this.accounts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderAccountsTable();
        } catch (error) {
            console.error('Error cargando cuentas bancarias:', error);
            window.authManager?.showMessage('Error al cargar cuentas bancarias', 'error');
        }
    }

    renderAccountsTable() {
        const tbody = document.getElementById('cuentas-tbody');
        if (!tbody) return;

        if (this.accounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-university"></i>
                        <p>No hay cuentas bancarias configuradas</p>
                        <button class="btn btn--primary btn--small" onclick="window.bankAccountManager.showAccountModal()">
                            <i class="fas fa-plus"></i> Agregar Primera Cuenta
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.accounts.map(account => `
            <tr>
                <td>
                    <span class="account-cvu">${account.cvu}</span>
                </td>
                <td>
                    <span class="account-alias">${account.alias}</span>
                </td>
                <td>
                    <span class="account-cuit">${account.cuit}</span>
                </td>
                <td>
                    <span class="account-titular">${account.titular}</span>
                </td>
                <td>
                    <span class="status-badge ${account.active ? 'status-active' : 'status-inactive'}">
                        <i class="fas fa-${account.active ? 'check-circle' : 'times-circle'}"></i>
                        ${account.active ? 'Activa' : 'Inactiva'}
                    </span>
                </td>
                <td>
                    <span class="date-text">
                        ${account.createdAt ? new Date(account.createdAt.seconds * 1000).toLocaleDateString('es-AR') : 'N/A'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="window.bankAccountManager.editAccount('${account.id}')" title="Editar cuenta">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ${account.active ? 'deactivate' : 'activate'}" 
                                onclick="window.bankAccountManager.toggleAccountStatus('${account.id}')" 
                                title="${account.active ? 'Desactivar' : 'Activar'} cuenta">
                            <i class="fas fa-${account.active ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.bankAccountManager.deleteAccount('${account.id}')" title="Eliminar cuenta">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showAccountModal(accountId = null) {
        const modal = document.getElementById('cuenta-bancaria-modal');
        const form = document.getElementById('cuenta-bancaria-form');
        const title = document.getElementById('cuenta-modal-title');
        
        // Resetear formulario
        form.reset();
        document.getElementById('cuenta-activa').checked = true;
        
        if (accountId) {
            const account = this.accounts.find(acc => acc.id === accountId);
            if (account) {
                title.textContent = 'Editar Cuenta Bancaria';
                document.getElementById('cuenta-cvu').value = account.cvu;
                document.getElementById('cuenta-alias').value = account.alias;
                document.getElementById('cuenta-cuit').value = account.cuit;
                document.getElementById('cuenta-titular').value = account.titular;
                document.getElementById('cuenta-activa').checked = account.active;
                form.dataset.editId = accountId;
            }
        } else {
            title.textContent = 'Nueva Cuenta Bancaria';
            delete form.dataset.editId;
        }
        
        modal.classList.add('active');
    }

    hideAccountModal() {
        const modal = document.getElementById('cuenta-bancaria-modal');
        modal.classList.remove('active');
    }

    async handleSaveAccount(e) {
        e.preventDefault();
        
        const form = e.target;
        const cvu = document.getElementById('cuenta-cvu').value.trim();
        const alias = document.getElementById('cuenta-alias').value.trim();
        const cuit = document.getElementById('cuenta-cuit').value.trim();
        const titular = document.getElementById('cuenta-titular').value.trim();
        const active = document.getElementById('cuenta-activa').checked;
        
        if (!cvu || !alias || !cuit || !titular) {
            window.authManager?.showMessage('Todos los campos son obligatorios', 'error');
            return;
        }

        // Validaciones
        if (!this.validateCVU(cvu)) {
            window.authManager?.showMessage('CVU/CBU debe tener 22 dígitos', 'error');
            return;
        }

        if (!this.validateCUIT(cuit)) {
            window.authManager?.showMessage('CUIT debe tener formato válido (XX-XXXXXXXX-X)', 'error');
            return;
        }

        try {
            window.authManager?.showLoading();

            const accountData = {
                cvu,
                alias: alias.toUpperCase(),
                cuit,
                titular,
                active,
                updatedAt: serverTimestamp()
            };

            if (form.dataset.editId) {
                // Editar cuenta existente
                const accountRef = doc(db, 'bankAccounts', form.dataset.editId);
                await updateDoc(accountRef, accountData);
                window.authManager?.showMessage('Cuenta bancaria actualizada correctamente', 'success');
            } else {
                // Nueva cuenta
                accountData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'bankAccounts'), accountData);
                window.authManager?.showMessage('Cuenta bancaria creada correctamente', 'success');
            }

            this.hideAccountModal();
            await this.loadAccounts();
        } catch (error) {
            console.error('Error guardando cuenta bancaria:', error);
            window.authManager?.showMessage('Error al guardar cuenta bancaria', 'error');
        } finally {
            window.authManager?.hideLoading();
        }
    }

    async editAccount(accountId) {
        this.showAccountModal(accountId);
    }

    async toggleAccountStatus(accountId) {
        try {
            const account = this.accounts.find(acc => acc.id === accountId);
            if (!account) return;

            const accountRef = doc(db, 'bankAccounts', accountId);
            await updateDoc(accountRef, {
                active: !account.active,
                updatedAt: serverTimestamp()
            });

            window.authManager?.showMessage(
                `Cuenta ${!account.active ? 'activada' : 'desactivada'} correctamente`, 
                'success'
            );
            
            await this.loadAccounts();
        } catch (error) {
            console.error('Error cambiando estado de cuenta:', error);
            window.authManager?.showMessage('Error al cambiar estado de cuenta', 'error');
        }
    }

    async deleteAccount(accountId) {
        if (!confirm('¿Estás seguro de eliminar esta cuenta bancaria? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'bankAccounts', accountId));
            window.authManager?.showMessage('Cuenta bancaria eliminada correctamente', 'success');
            await this.loadAccounts();
        } catch (error) {
            console.error('Error eliminando cuenta bancaria:', error);
            window.authManager?.showMessage('Error al eliminar cuenta bancaria', 'error');
        }
    }

    validateCVU(cvu) {
        return /^\d{22}$/.test(cvu);
    }

    validateCUIT(cuit) {
        return /^\d{2}-\d{8}-\d{1}$/.test(cuit);
    }

    // Método para obtener cuenta activa (para uso en otros módulos)
    async getActiveAccount() {
        try {
            const accountsRef = collection(db, 'bankAccounts');
            const activeQuery = query(accountsRef, where('active', '==', true), limit(1));
            const snapshot = await getDocs(activeQuery);
            
            if (snapshot.empty) {
                return null;
            }
            
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error obteniendo cuenta activa:', error);
            return null;
        }
    }
}

class ColumnManager {
    constructor() {
        this.storageKey = 'inscripciones-column-config';
        this.defaultColumns = {
            inscripto: true,
            email: true,
            telefono: true, // 🆕 Columna teléfono
            curso: true,
            fechaCurso: true,
            fechaInscripcion: true,
            estado: true,
            monto: true,
            comprobante: true,
            acciones: true // Siempre visible
        };
        this.currentConfig = this.loadConfig();
        this.setupEventListeners();
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? { ...this.defaultColumns, ...JSON.parse(saved) } : { ...this.defaultColumns };
        } catch (error) {
            console.error('Error loading column config:', error);
            return { ...this.defaultColumns };
        }
    }

    saveConfig() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentConfig));
        } catch (error) {
            console.error('Error saving column config:', error);
        }
    }

    setupEventListeners() {
        // Botón de configuración de columnas
        document.getElementById('column-config-btn')?.addEventListener('click', () => {
            this.showColumnConfigModal();
        });

        // Cerrar modal
        document.getElementById('column-config-close')?.addEventListener('click', () => {
            this.hideColumnConfigModal();
        });

        document.getElementById('cancel-column-config')?.addEventListener('click', () => {
            this.hideColumnConfigModal();
        });

        // Restaurar configuración predeterminada
        document.getElementById('restore-default-columns')?.addEventListener('click', () => {
            this.restoreDefaultConfig();
        });

        // Aplicar cambios
        document.getElementById('apply-column-config')?.addEventListener('click', () => {
            this.applyColumnConfig();
        });

        // Cerrar modal al hacer click fuera
        document.getElementById('column-config-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'column-config-modal') {
                this.hideColumnConfigModal();
            }
        });
    }

    showColumnConfigModal() {
        // Actualizar checkboxes según configuración actual
        Object.keys(this.currentConfig).forEach(columnId => {
            const checkbox = document.getElementById(`col-${columnId}`);
            if (checkbox) {
                checkbox.checked = this.currentConfig[columnId];
            }
        });

        document.getElementById('column-config-modal').classList.add('active');
    }

    hideColumnConfigModal() {
        document.getElementById('column-config-modal').classList.remove('active');
    }

    restoreDefaultConfig() {
        // Actualizar checkboxes
        Object.keys(this.defaultColumns).forEach(columnId => {
            const checkbox = document.getElementById(`col-${columnId}`);
            if (checkbox) {
                checkbox.checked = this.defaultColumns[columnId];
            }
        });
    }

    applyColumnConfig() {
        // Leer estado de checkboxes
        const newConfig = {};
        Object.keys(this.defaultColumns).forEach(columnId => {
            const checkbox = document.getElementById(`col-${columnId}`);
            newConfig[columnId] = checkbox ? checkbox.checked : this.defaultColumns[columnId];
        });

        // Asegurar que acciones siempre esté visible
        newConfig.acciones = true;

        this.currentConfig = newConfig;
        this.saveConfig();
        this.applyColumnVisibility();
        this.updateColumnIndicator();
        this.hideColumnConfigModal();

        window.authManager.showMessage('Configuración de columnas aplicada', 'success');
    }

    applyColumnVisibility() {
        const table = document.getElementById('inscripciones-table');
        if (!table) return;

        // Obtener todas las columnas (headers y celdas)
        const headers = table.querySelectorAll('thead th');
        const rows = table.querySelectorAll('tbody tr');

        // Aplicar visibilidad a headers
        headers.forEach((header, index) => {
            const columnId = header.getAttribute('data-column-id');
            if (columnId && this.currentConfig.hasOwnProperty(columnId)) {
                if (this.currentConfig[columnId]) {
                    header.classList.remove('column-hidden');
                } else {
                    header.classList.add('column-hidden');
                }
            }
        });

        // Aplicar visibilidad a celdas de datos
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                const header = headers[index];
                if (header) {
                    const columnId = header.getAttribute('data-column-id');
                    if (columnId && this.currentConfig.hasOwnProperty(columnId)) {
                        if (this.currentConfig[columnId]) {
                            cell.classList.remove('column-hidden');
                        } else {
                            cell.classList.add('column-hidden');
                        }
                    }
                }
            });
        });
    }

    updateColumnIndicator() {
        const hiddenCount = Object.values(this.currentConfig).filter(visible => !visible).length;
        const button = document.getElementById('column-config-btn');
        
        if (button) {
            // Remover indicador anterior
            const existingIndicator = button.querySelector('.columns-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Agregar nuevo indicador si hay columnas ocultas
            if (hiddenCount > 0) {
                const indicator = document.createElement('span');
                indicator.className = 'columns-indicator';
                indicator.textContent = `${hiddenCount} oculta${hiddenCount > 1 ? 's' : ''}`;
                button.appendChild(indicator);
            }
        }
    }

    getVisibleColumns() {
        return Object.keys(this.currentConfig).filter(columnId => this.currentConfig[columnId]);
    }

    isColumnVisible(columnId) {
        return this.currentConfig[columnId] !== false;
    }
}

class AdminManager {
    constructor() {
        this.cursos = [];
        this.inscripciones = [];
        this.recetas = [];
        
        // Configuración de tabla de inscripciones
        this.filteredInscripciones = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.sortColumn = 'fechaInscripcion';
        this.sortDirection = 'desc';
        
        // Gestor de columnas
        this.columnManager = new ColumnManager();
        
        // Gestor de notas (se inicializará cuando sea necesario)
        this.notasManager = null;
        
        // Gestor de contabilidad (se inicializará cuando sea necesario)
        this.contabilidadManager = null;
        
        // Listeners de Firestore
        this.inscripcionesListener = null;
        this.cursosListener = null;
        
        // Configuración de tabla de estado de cursos
        this.filteredEstadoCursos = [];
        this.estadoCursosCurrentPage = 1;
        this.estadoCursosItemsPerPage = 15;
        this.estadoCursosSortColumn = 'fechaHora';
        this.estadoCursosSortDirection = 'asc';
        
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
        
        // Limpiar listeners al navegar fuera del admin
        document.querySelectorAll('nav a:not([href="#admin"])')?.forEach(link => {
            link.addEventListener('click', () => {
                this.cleanupListeners();
            });
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

        document.getElementById('sincronizar-cupos-btn')?.addEventListener('click', async () => {
            if (confirm('¿Deseas sincronizar los contadores de cupos de todos los cursos?\n\nEsto recalculará los inscriptos basándose en las inscripciones activas.')) {
                await window.cursosManager?.sincronizarTodosLosContadores();
                // Recargar la vista de cursos
                await this.loadData();
            }
        });

        document.getElementById('sincronizar-sheet-btn')?.addEventListener('click', async () => {
            await this.handleSincronizarSheet();
        });

        document.getElementById('nueva-receta-btn')?.addEventListener('click', () => {
            this.showRecetaModal();
        });

        // Filtros de admin
        this.setupAdminFilters();
        
        // Configurar tabla de inscripciones
        this.setupInscripcionesTable();
        
        // Configurar tabla de estado de cursos
        this.setupEstadoCursosTable();
        
        // Configurar listeners para logs
        this.setupLogsEventListeners();
        
        // Configurar tabs del panel de admin
        this.setupAdminTabs();
    }
    
    setupAdminTabs() {
        // Manejar clicks en las tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remover clase activa de todas las tabs
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Activar la tab clickeada
                tab.classList.add('active');
                
                // Mostrar el contenido correspondiente
                const targetTab = tab.getAttribute('data-tab');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Cargar datos específicos según la tab
                if (targetTab === 'logs-admin') {
                    this.loadSystemLogs();
                } else if (targetTab === 'administradores-admin') {
                    this.loadAdministratorsTab();
                } else if (targetTab === 'estado-cursos-admin') {
                    this.loadEstadoCursosTab();
                } else if (targetTab === 'base-usuarios-admin') {
                    this.loadBaseUsuariosTab();
                }
            });
        });
        
        // Activar la primera tab por defecto
        const firstTab = document.querySelector('.tab-btn');
        const firstContent = document.querySelector('.tab-content');
        if (firstTab && firstContent) {
            firstTab.classList.add('active');
            firstContent.classList.add('active');
        }
    }

    // ============================================
    // GESTIÓN DE ADMINISTRADORES
    // ============================================

    async loadAdministratorsTab() {
        try {
            // console.log removed
            
            // Asegurar que authManager esté disponible
            if (!window.authManager) {
                // console.log removed
                // Esperar un poco y reintentar
                setTimeout(() => this.loadAdministratorsTab(), 500);
                return;
            }
            
            // Configurar event listeners PRIMERO
            this.setupAdminManagementListeners();
            
            // Cargar lista de administradores
            await this.loadAdminsList();
            
            // Actualizar estadísticas
            await this.updateAdminsStats();
            
            // console.log removed
            
        } catch (error) {
            console.error('❌ Error cargando administradores:', error);
            window.authManager?.showMessage('Error cargando administradores', 'error');
        }
    }

    async loadAdminsList() {
        try {
            // console.log removed
            
            // Verificar si authManager existe
            if (!window.authManager) {
                console.error('❌ AuthManager no está disponible');
                throw new Error('AuthManager no inicializado');
            }
            
            // console.log removed
            const admins = await window.authManager.getAdminList();
            // console.log removed
            
            this.renderAdminsTable(admins);
            // console.log removed
            
        } catch (error) {
            console.error('❌ Error obteniendo lista de administradores:', error);
            const tbody = document.getElementById('admins-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #dc3545;">
                            <i class="fas fa-exclamation-triangle"></i><br>
                            Error: ${error.message || 'Error cargando administradores'}
                        </td>
                    </tr>
                `;
            }
        }
    }

    renderAdminsTable(admins) {
        const tbody = document.getElementById('admins-table-body');
        if (!tbody) return;

        if (admins.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 2em; color: #ccc; margin-bottom: 10px;"></i><br>
                        No hay administradores registrados
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = admins.map(admin => this.renderAdminRow(admin)).join('');
    }

    renderAdminRow(admin) {
        const createdDate = admin.createdAt?.toDate ? 
            admin.createdAt.toDate().toLocaleDateString('es-AR') : 
            'N/A';
        
        const lastLogin = admin.lastLogin?.toDate ? 
            admin.lastLogin.toDate().toLocaleDateString('es-AR') :
            'Nunca';

        const isCurrentUser = admin.email === window.authManager?.currentUser?.email;
        const isSystemCreated = admin.createdBy === 'system';

        return `
            <tr class="admin-row" data-admin-email="${admin.email}">
                <td>
                    <div class="admin-info">
                        <strong>${admin.email}</strong>
                        ${isCurrentUser ? '<span class="badge badge--primary">Tú</span>' : ''}
                    </div>
                </td>
                <td>${createdDate}</td>
                <td>
                    <span class="${isSystemCreated ? 'admin-status--system' : 'admin-status--active'} admin-status">
                        ${isSystemCreated ? 'Sistema' : admin.createdBy || 'N/A'}
                    </span>
                </td>
                <td>${lastLogin}</td>
                <td>
                    <span class="admin-status admin-status--active">
                        <i class="fas fa-check-circle"></i> Activo
                    </span>
                </td>
                <td>
                    ${!isCurrentUser ? `
                        <button 
                            class="btn btn--outline btn--small remove-admin-btn"
                            data-admin-email="${admin.email}"
                            title="Desactivar administrador"
                        >
                            <i class="fas fa-user-times"></i> Remover
                        </button>
                    ` : `
                        <span class="text-muted">No disponible</span>
                    `}
                </td>
            </tr>
        `;
    }

    async updateAdminsStats() {
        try {
            const admins = await window.authManager.getAdminList();
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const recentLogins = admins.filter(admin => {
                if (!admin.lastLogin?.toDate) return false;
                return admin.lastLogin.toDate() > weekAgo;
            }).length;

            document.getElementById('total-admins').textContent = admins.length;
            document.getElementById('active-admins').textContent = admins.length; // Todos están activos
            document.getElementById('recent-logins').textContent = recentLogins;

        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    setupAdminManagementListeners() {
        // Prevenir múltiples event listeners
        if (this.adminListenersSetup) return;
        this.adminListenersSetup = true;

        // Agregar nuevo administrador
        document.getElementById('add-admin-btn')?.addEventListener('click', async () => {
            await this.handleAddAdmin();
        });

        // Enter en campo de email
        document.getElementById('new-admin-email')?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handleAddAdmin();
            }
        });

        // Remover administrador
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('remove-admin-btn') || e.target.closest('.remove-admin-btn')) {
                const button = e.target.classList.contains('remove-admin-btn') ? 
                    e.target : e.target.closest('.remove-admin-btn');
                const adminEmail = button.getAttribute('data-admin-email');
                await this.handleRemoveAdmin(adminEmail);
            }
        });
    }

    async handleAddAdmin() {
        // console.log removed
        
        const emailInput = document.getElementById('new-admin-email');
        const email = emailInput.value.trim();
        
        // console.log removed

        if (!email) {
            // console.log removed
            window.authManager?.showMessage('Ingresa un email válido', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            // console.log removed
            window.authManager?.showMessage('El formato del email no es válido', 'error');
            return;
        }

        try {
            // console.log removed
            const result = await window.authManager.addNewAdmin(email);
            // console.log removed
            
            if (result.success) {
                window.authManager?.showMessage('Administrador agregado exitosamente', 'success');
                emailInput.value = '';
                
                // Recargar lista
                await this.loadAdminsList();
                await this.updateAdminsStats();
            } else {
                window.authManager?.showMessage(result.message || 'Error agregando administrador', 'error');
            }
            
        } catch (error) {
            console.error('Error agregando admin:', error);
            window.authManager?.showMessage('Error: ' + error.message, 'error');
        }
    }

    async handleRemoveAdmin(adminEmail) {
        if (!confirm(`¿Estás seguro de que deseas remover a ${adminEmail} como administrador?`)) {
            return;
        }

        try {
            const result = await window.authManager.removeAdmin(adminEmail);
            
            if (result.success) {
                window.authManager?.showMessage('Administrador removido exitosamente', 'success');
                
                // Recargar lista
                await this.loadAdminsList();
                await this.updateAdminsStats();
            } else {
                window.authManager?.showMessage(result.message || 'Error removiendo administrador', 'error');
            }
            
        } catch (error) {
            console.error('Error removiendo admin:', error);
            window.authManager?.showMessage('Error: ' + error.message, 'error');
        }
    }

    // ============================================
    // GESTIÓN DE BASE DE INSCRIPTOS
    // ============================================

    async loadBaseUsuariosTab() {
        try {
            // console.log removed
            
            // Inicializar el manager si no existe
            if (!window.baseInscriptosManager) {
                console.error('❌ BaseInscriptosManager no está disponible');
                return;
            }
            
            // Activar el tab
            await window.baseInscriptosManager.activateTab();
            
            // Cargar los datos de la colección base_inscriptos
            await window.baseInscriptosManager.cargarBaseInscriptos();
            
            // console.log removed
            
        } catch (error) {
            console.error('❌ Error cargando base de inscriptos:', error);
        }
    }

    async handleSincronizarSheet() {
        try {
            // Mostrar confirmación
            if (!confirm('¿Deseas sincronizar todos los datos con Google Sheets?\n\nEsto creará/actualizará el libro "Registros Club de Cocina" con los datos actuales de cursos e inscripciones.')) {
                return;
            }

            // Mostrar loading
            const loadingEl = document.createElement('div');
            loadingEl.className = 'admin__loading-sync';
            loadingEl.innerHTML = `
                <div class="loading-sync">
                    <div class="loading-sync__spinner"></div>
                    <p>Sincronizando con Google Sheets...</p>
                    <small>Esto puede tomar unos momentos</small>
                </div>
            `;
            document.body.appendChild(loadingEl);

            // Deshabilitar botón temporalmente
            const btn = document.getElementById('sincronizar-sheet-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';

            // Obtener datos de Firestore
            const [cursosData, inscripcionesData] = await Promise.all([
                this.obtenerCursosParaSheet(),
                this.obtenerInscripcionesParaSheet()
            ]);

            // Ejecutar sincronización usando el Apps Script existente
            const resultado = await this.enviarDatosAlAppsScript({
                tipo: 'sincronizar_sheets',
                cursos: cursosData,
                inscripciones: inscripcionesData,
                nombreLibro: 'Registros Club de Cocina'
            });

            // Remover loading
            document.body.removeChild(loadingEl);

            // Restaurar botón
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-table"></i> Sincronizar a Sheet';

            if (resultado.success) {
                // Mostrar resultado exitoso
                let mensaje = 'Sincronización completada exitosamente!\n\n';
                
                if (resultado.cursosSync?.registros) {
                    mensaje += `📚 Cursos: ${resultado.cursosSync.registros} registros\n`;
                }
                if (resultado.inscripcionesSync?.registros) {
                    mensaje += `👥 Inscripciones: ${resultado.inscripcionesSync.registros} registros\n`;
                }
                
                if (resultado.spreadsheetUrl) {
                    mensaje += '\n¿Deseas abrir el libro de Google Sheets?';
                    if (confirm(mensaje)) {
                        window.open(resultado.spreadsheetUrl, '_blank');
                    }
                } else {
                    alert(mensaje);
                }

                window.authManager?.showMessage('Datos sincronizados con Google Sheets', 'success');

            } else {
                // Mostrar error
                let errorMsg = 'Error en la sincronización:\n' + (resultado.error || 'Error desconocido');
                
                if (resultado.error?.includes('Apps Script no configurado')) {
                    errorMsg += '\n\nVe a Configuración → Apps Script para configurar la URL.';
                }
                
                alert(errorMsg);
                window.authManager?.showMessage('Error sincronizando con Google Sheets', 'error');
            }

        } catch (error) {
            // Limpiar UI en caso de error
            const loadingEl = document.querySelector('.admin__loading-sync');
            if (loadingEl) {
                document.body.removeChild(loadingEl);
            }

            const btn = document.getElementById('sincronizar-sheet-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-table"></i> Sincronizar a Sheet';
            }

            console.error('Error en handleSincronizarSheet:', error);
            alert('Error inesperado durante la sincronización:\n' + error.message);
            window.authManager?.showMessage('Error en sincronización', 'error');
        }
    }

    async obtenerCursosParaSheet() {
        try {
            // Cargar cursos
            const cursosQuery = query(
                collection(db, 'cursos'),
                orderBy('fechaHora', 'desc')
            );
            const cursosSnapshot = await getDocs(cursosQuery);
            
            // Cargar inscripciones para calcular estadísticas
            const inscripcionesQuery = query(collection(db, 'inscripciones'));
            const inscripcionesSnapshot = await getDocs(inscripcionesQuery);
            
            // Procesar inscripciones
            const inscripciones = [];
            inscripcionesSnapshot.forEach(doc => {
                inscripciones.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Procesar cursos con estadísticas
            const cursos = [];
            cursosSnapshot.forEach(doc => {
                const data = doc.data();
                
                // Calcular estadísticas del curso
                const inscripcionesCurso = inscripciones.filter(i => i.cursoId === doc.id);
                const inscriptosActuales = inscripcionesCurso.filter(i => 
                    ['pendiente', 'pagado', 'confirmado'].includes(i.estado)
                ).length || 0;
                
                const capacidadMaxima = data.capacidadMaxima || 999;
                const porcentajeOcupacion = capacidadMaxima > 0 ? 
                    ((inscriptosActuales / capacidadMaxima) * 100).toFixed(1) : '0.0';
                
                // Calcular estado del cupo
                const fechaCurso = new Date(data.fechaHora.seconds * 1000);
                const ahora = new Date();
                
                let estadoCupo = 'Disponible';
                if (fechaCurso < ahora) {
                    estadoCupo = 'Finalizado';
                } else if (inscriptosActuales >= capacidadMaxima) {
                    estadoCupo = 'Completo';
                } else if (porcentajeOcupacion >= 80) {
                    estadoCupo = 'Próximo a llenarse';
                }
                
                cursos.push({
                    id: doc.id,
                    nombre: data.nombre || '',
                    fecha: data.fechaHora ? data.fechaHora.toDate().toISOString() : '',
                    horario: data.fechaHora ? 
                        data.fechaHora.toDate().toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : '',
                    precio: data.costo || 0,
                    cupos: capacidadMaxima,
                    inscriptos: inscriptosActuales,
                    estadoCupo: estadoCupo,
                    ocupacion: `${porcentajeOcupacion}%`,
                    instructor: data.instructor || '',
                    sede: data.ubicacion || '',
                    estado: data.estado || 'activo',
                    descripcion: data.descripcion || '',
                    fechaCreacion: data.fechaCreacion ? data.fechaCreacion.toDate().toISOString() : '',
                    fechaActualizacion: data.fechaActualizacion ? data.fechaActualizacion.toDate().toISOString() : ''
                });
            });

            // console.log removed
            return cursos;

        } catch (error) {
            console.error('❌ Error obteniendo cursos:', error);
            return [];
        }
    }

    async obtenerInscripcionesParaSheet() {
        try {
            const inscripcionesQuery = query(
                collection(db, 'inscripciones'),
                orderBy('fechaInscripcion', 'desc')
            );
            
            const snapshot = await getDocs(inscripcionesQuery);
            const inscripciones = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                inscripciones.push({
                    id: doc.id,
                    cursoId: data.cursoId || '',
                    usuarioNombre: data.usuarioNombre || '',
                    usuarioEmail: data.usuarioEmail || '',
                    telefono: data.telefono || '',
                    estado: data.estado || 'pendiente',
                    fechaInscripcion: data.fechaInscripcion ? data.fechaInscripcion.toDate().toISOString() : '',
                    metodoPago: data.metodoPago || '',
                    montoAbonado: data.montoAbonado || 0,
                    comprobante: data.comprobante ? 'Adjunto' : 'Sin comprobante',
                    fechaConfirmacion: data.fechaConfirmacion ? data.fechaConfirmacion.toDate().toISOString() : '',
                    notas: data.notas || ''
                });
            });

            // console.log removed
            return inscripciones;

        } catch (error) {
            console.error('❌ Error obteniendo inscripciones:', error);
            return [];
        }
    }

    async enviarDatosAlAppsScript(payload) {
        try {
            // Obtener URL del Apps Script desde configuración
            const configDoc = await getDoc(doc(db, 'configuraciones', 'apps_script'));
            if (!configDoc.exists() || !configDoc.data().activo) {
                throw new Error('Apps Script no configurado. Configure la URL en Configuración.');
            }

            const scriptUrl = configDoc.data().url;
            
            // console.log removed

            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain', // Para evitar preflight CORS
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // console.log removed
            
            return result;

        } catch (error) {
            console.error('❌ Error comunicándose con Apps Script:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setupAdminFilters() {
        document.getElementById('filter-curso-admin')?.addEventListener('change', (e) => {
            this.applyInscripcionFilters();
        });

        document.getElementById('filter-estado')?.addEventListener('change', (e) => {
            this.applyInscripcionFilters();
        });
    }
    
    setupInscripcionesTable() {
        // Filtro de búsqueda por inscripto
        document.getElementById('filter-inscripto')?.addEventListener('input', (e) => {
            this.applyInscripcionFilters();
        });

        // Filtro por fecha
        document.getElementById('filter-fecha')?.addEventListener('change', (e) => {
            this.applyInscripcionFilters();
        });

        // Botón limpiar filtros
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Botón exportar CSV
        document.getElementById('export-inscripciones-btn')?.addEventListener('click', () => {
            this.exportInscripcionesToCSV();
        });

        // Ordenamiento de tabla
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.sortInscripciones(column);
            });
        });

        // Paginación
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderInscripcionesTable();
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredInscripciones.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderInscripcionesTable();
            }
        });
    }

    async loadAdminData() {
        if (!window.authManager.isCurrentUserAdmin()) return;

        try {
            window.authManager.showLoading();
            
            // Migración inicial de datos bancarios si es necesario
            await this.migrateInitialBankAccount();
            
            // Configurar listeners para actualizaciones en tiempo real
            this.setupInscripcionesListener();
            
            // Cargar datos estáticos en paralelo
            await Promise.all([
                this.loadAdminCursos(),
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

    // Migración inicial de cuenta bancaria
    async migrateInitialBankAccount() {
        try {
            // Verificar si ya existen cuentas bancarias
            const accountsRef = collection(db, 'bankAccounts');
            const snapshot = await getDocs(accountsRef);
            
            if (snapshot.empty) {
                // Crear cuenta inicial con datos de ejemplo
                const initialAccount = {
                    cvu: '2850590940090418135201', // CVU de ejemplo
                    alias: 'COLMENA.COCINA.CLUB',
                    cuit: '20-12345678-9',
                    titular: 'Club de Cocina Colmena',
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                
                await addDoc(accountsRef, initialAccount);
                // console.log removed
            }
        } catch (error) {
            console.error('Error en migración de cuenta bancaria:', error);
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

    setupInscripcionesListener() {
        try {
            // Limpiar listener anterior si existe
            if (this.inscripcionesListener) {
                this.inscripcionesListener();
            }
            
            // Configurar listener para inscripciones
            const inscripcionesQuery = query(collection(db, 'inscripciones'), orderBy('fechaInscripcion', 'desc'));
            this.inscripcionesListener = onSnapshot(inscripcionesQuery, (snapshot) => {
                // console.log removed
                this.handleInscripcionesUpdate(snapshot);
            }, (error) => {
                console.error('Error en listener de inscripciones:', error);
                window.authManager.showMessage('Error escuchando cambios en inscripciones', 'error');
            });
            
            // Configurar listener para cursos (para datos completos)
            this.setupCursosListener();
            
        } catch (error) {
            console.error('Error configurando listener de inscripciones:', error);
            window.authManager.showMessage('Error configurando actualizaciones automáticas', 'error');
        }
    }

    setupCursosListener() {
        try {
            // Limpiar listener anterior si existe
            if (this.cursosListener) {
                this.cursosListener();
            }
            
            // Configurar listener para cursos
            const cursosQuery = query(collection(db, 'cursos'));
            this.cursosListener = onSnapshot(cursosQuery, (snapshot) => {
                // console.log removed
                this.handleCursosUpdate(snapshot);
            }, (error) => {
                console.error('Error en listener de cursos:', error);
            });
            
        } catch (error) {
            console.error('Error configurando listener de cursos:', error);
        }
    }

    handleInscripcionesUpdate(snapshot) {
        this.inscripciones = [];
        snapshot.forEach((doc) => {
            const inscripcionData = { id: doc.id, ...doc.data() };
            this.inscripciones.push(inscripcionData);
        });
        
        // Enriquecer datos con información de cursos
        this.enrichInscripcionesWithCursos();
        
        // Re-renderizar tabla
        this.renderAdminInscripciones();
        
        // Actualizar filtros para mantener sincronización
        this.updateAdminFilters();
        
        // Actualizar tab de Estado de Cursos si está activo
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'estado-cursos-admin') {
            this.renderEstadoCursos();
        }
        
        // console.log removed
    }

    handleCursosUpdate(snapshot) {
        // Crear mapa actualizado de cursos
        const cursosMap = {};
        snapshot.forEach((doc) => {
            cursosMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        this.cursosMap = cursosMap;
        
        // Re-enriquecer inscripciones con datos actualizados de cursos
        this.enrichInscripcionesWithCursos();
        
        // Re-renderizar tabla
        this.renderAdminInscripciones();
        
        // Actualizar filtros para mantener sincronización
        this.updateAdminFilters();
        
        // Actualizar tab de Estado de Cursos si está activo
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'estado-cursos-admin') {
            this.renderEstadoCursos();
        }
        
        // console.log removed
    }

    enrichInscripcionesWithCursos() {
        if (!this.cursosMap) return;
        
        this.inscripciones.forEach(inscripcion => {
            if (inscripcion.cursoId && this.cursosMap[inscripcion.cursoId]) {
                const curso = this.cursosMap[inscripcion.cursoId];
                inscripcion.cursoNombre = curso.nombre; // ✅ Agregado para filtros
                inscripcion.cursoFecha = curso.fechaHora;
                inscripcion.cursoHorario = curso.horario;
                inscripcion.cursoUbicacion = curso.ubicacion;
            }
        });
    }

    // Método de compatibilidad para mantener código existente
    async loadAdminInscripciones() {
        // Este método ahora solo inicializa el listener si no existe
        if (!this.inscripcionesListener) {
            this.setupInscripcionesListener();
        }
    }

    // Método para limpiar listeners al salir del admin
    cleanupListeners() {
        if (this.inscripcionesListener) {
            this.inscripcionesListener();
            this.inscripcionesListener = null;
        }
        if (this.cursosListener) {
            this.cursosListener();
            this.cursosListener = null;
        }
        // console.log removed
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
        
        // Aplicar configuración de columnas inicial
        setTimeout(() => {
            this.columnManager.applyColumnVisibility();
            this.columnManager.updateColumnIndicator();
        }, 100);
    }

    switchTab(tabId) {
        // Limpiar managers de pestañas anteriores
        if (tabId !== 'cuentas-admin' && this.contabilidadManager) {
            this.contabilidadManager.destroy();
            this.contabilidadManager = null;
        }

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

        // Cargar datos específicos según la pestaña
        switch(tabId) {
            case 'cuentas-admin':
                if (window.bankAccountManager) {
                    window.bankAccountManager.loadAccounts();
                }
                this.initializeContabilidadManager();
                break;
            case 'notas-admin':
                this.initializeNotasManager();
                break;
        }
    }

    initializeContabilidadManager() {
        if (!this.contabilidadManager) {
            // console.log removed
            
            // Verificar que ContabilidadManager esté disponible
            if (window.ContabilidadManager) {
                this.contabilidadManager = new window.ContabilidadManager();
                // console.log removed
            } else {
                console.error('❌ ContabilidadManager no está disponible');
                setTimeout(() => this.initializeContabilidadManager(), 500);
            }
        }
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
    renderAdminInscripciones() {
        this.filteredInscripciones = [...this.inscripciones];
        this.applyInscripcionFilters();
        this.updateInscripcionStats();
        this.renderInscripcionesTable();
    }

    updateInscripcionStats() {
        const total = this.inscripciones.length;
        const confirmadas = this.inscripciones.filter(i => i.estado === 'confirmado').length;
        const pendientes = this.inscripciones.filter(i => i.estado === 'pendiente').length;

        document.getElementById('total-inscripciones').textContent = total;
        document.getElementById('inscripciones-confirmadas').textContent = confirmadas;
        document.getElementById('inscripciones-pendientes').textContent = pendientes;
    }

    applyInscripcionFilters() {
        let filtered = [...this.inscripciones];

        // Filtro por inscripto (nombre o email)
        const inscriptoFilter = document.getElementById('filter-inscripto')?.value.toLowerCase();
        if (inscriptoFilter) {
            filtered = filtered.filter(inscripcion =>
                inscripcion.usuarioNombre.toLowerCase().includes(inscriptoFilter) ||
                inscripcion.usuarioEmail.toLowerCase().includes(inscriptoFilter)
            );
        }

        // Filtro por curso
        const cursoFilter = document.getElementById('filter-curso-admin')?.value;
        if (cursoFilter) {
            filtered = filtered.filter(inscripcion =>
                inscripcion.cursoNombre === cursoFilter
            );
        }

        // Filtro por estado
        const estadoFilter = document.getElementById('filter-estado')?.value;
        if (estadoFilter) {
            filtered = filtered.filter(inscripcion =>
                inscripcion.estado === estadoFilter
            );
        }

        // Filtro por fecha
        const fechaFilter = document.getElementById('filter-fecha')?.value;
        if (fechaFilter) {
            const filterDate = new Date(fechaFilter);
            filtered = filtered.filter(inscripcion => {
                const inscripcionDate = new Date(inscripcion.fechaInscripcion.seconds * 1000);
                return inscripcionDate.toDateString() === filterDate.toDateString();
            });
        }

        this.filteredInscripciones = filtered;
        this.currentPage = 1; // Reset page when filtering
        this.renderInscripcionesTable();
    }

    sortInscripciones(column) {
        // Toggle sort direction if same column
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update visual indicators
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });
        document.querySelector(`[data-column="${column}"]`).classList.add(this.sortDirection);

        // Sort data
        this.filteredInscripciones.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'nombre':
                    valueA = a.usuarioNombre;
                    valueB = b.usuarioNombre;
                    break;
                case 'email':
                    valueA = a.usuarioEmail;
                    valueB = b.usuarioEmail;
                    break;
                case 'curso':
                    valueA = a.cursoNombre;
                    valueB = b.cursoNombre;
                    break;
                case 'fechaCurso':
                    valueA = new Date(a.cursoFecha.seconds * 1000);
                    valueB = new Date(b.cursoFecha.seconds * 1000);
                    break;
                case 'fechaInscripcion':
                    valueA = new Date(a.fechaInscripcion.seconds * 1000);
                    valueB = new Date(b.fechaInscripcion.seconds * 1000);
                    break;
                case 'estado':
                    valueA = a.estado;
                    valueB = b.estado;
                    break;
                case 'monto':
                    valueA = a.costo;
                    valueB = b.costo;
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderInscripcionesTable();
    }

    renderInscripcionesTable() {
        const tableBody = document.getElementById('inscripciones-table-body');
        const noInscripciones = document.getElementById('no-inscripciones');
        const loading = document.getElementById('loading-inscripciones');
        
        if (!tableBody) return;

        // Hide loading
        loading.style.display = 'none';

        if (this.filteredInscripciones.length === 0) {
            tableBody.innerHTML = '';
            noInscripciones.style.display = 'block';
            this.updatePagination();
            return;
        }

        noInscripciones.style.display = 'none';

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredInscripciones.slice(startIndex, endIndex);

        // Render rows
        tableBody.innerHTML = pageData.map(inscripcion => this.createInscripcionTableRow(inscripcion)).join('');
        
        // Apply column visibility configuration
        this.columnManager.applyColumnVisibility();
        this.columnManager.updateColumnIndicator();
        
        // Setup event listeners for actions
        this.setupTableEventListeners();
        
        // Update pagination
        this.updatePagination();
    }

    createInscripcionTableRow(inscripcion) {
        const fechaInscripcion = new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleDateString('es-AR');
        
        // Debug: mostrar información de la fecha del curso
        console.log('Debug fecha curso:', {
            cursoFecha: inscripcion.cursoFecha,
            tipoFecha: typeof inscripcion.cursoFecha,
            inscripcionId: inscripcion.id
        });
        
        let fechaCurso = 'Fecha no disponible';
        if (inscripcion.cursoFecha) {
            try {
                // Intentar diferentes formatos de fecha
                if (inscripcion.cursoFecha.seconds) {
                    // Formato Firestore Timestamp
                    fechaCurso = new Date(inscripcion.cursoFecha.seconds * 1000).toLocaleDateString('es-AR');
                } else if (inscripcion.cursoFecha.toDate) {
                    // Formato Timestamp con método toDate
                    fechaCurso = inscripcion.cursoFecha.toDate().toLocaleDateString('es-AR');
                } else if (typeof inscripcion.cursoFecha === 'string') {
                    // Formato string
                    fechaCurso = new Date(inscripcion.cursoFecha).toLocaleDateString('es-AR');
                } else {
                    // Intentar convertir directamente
                    fechaCurso = new Date(inscripcion.cursoFecha).toLocaleDateString('es-AR');
                }
            } catch (error) {
                console.error('Error procesando fecha del curso:', error, inscripcion.cursoFecha);
                fechaCurso = 'Error en fecha';
            }
        }

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <strong>${inscripcion.usuarioNombre}</strong>
                    </div>
                </td>
                <td>${inscripcion.usuarioEmail}</td>
                <td>${inscripcion.telefono || 'No disponible'}</td>
                <td>${inscripcion.cursoNombre}</td>
                <td>${fechaCurso}</td>
                <td>${fechaInscripcion}</td>
                <td>
                    <span class="estado-badge ${inscripcion.estado}">
                        ${this.getEstadoText(inscripcion.estado)}
                    </span>
                </td>
                <td>$${inscripcion.costo.toLocaleString()}</td>
                <td>
                    ${inscripcion.comprobanteUrl ? `
                        <button class="btn btn--small btn--outline view-comprobante-btn" 
                                data-comprobante-url="${inscripcion.comprobanteUrl}"
                                data-inscripcion-id="${inscripcion.id}"
                                data-metadata='${JSON.stringify(inscripcion.comprobanteMetadata || {})}'>
                            <i class="fas fa-file-image"></i> Ver Comprobante
                        </button>
                    ` : '<span class="text-muted">Sin comprobante</span>'}
                </td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <!-- Estado: Confirmar -->
                        ${(inscripcion.estado === 'pagado' || inscripcion.estado === 'pendiente') ? `
                            <button class="action-btn confirm" data-inscripcion-id="${inscripcion.id}" title="Confirmar inscripción">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Estado: Marcar como Pendiente -->
                        ${inscripcion.estado !== 'pendiente' && inscripcion.estado !== 'cancelado' ? `
                            <button class="action-btn set-pending" data-inscripcion-id="${inscripcion.id}" title="Marcar como pendiente">
                                <i class="fas fa-clock"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Estado: Cancelar -->
                        ${inscripcion.estado !== 'cancelado' ? `
                            <button class="action-btn cancel" data-inscripcion-id="${inscripcion.id}" title="Cancelar inscripción">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Reactivar (si está cancelado) -->
                        ${inscripcion.estado === 'cancelado' ? `
                            <button class="action-btn reactivate" data-inscripcion-id="${inscripcion.id}" title="Reactivar inscripción">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                        
                        <!-- Editar información -->
                        <button class="action-btn edit" data-inscripcion-id="${inscripcion.id}" title="Editar información">
                            <i class="fas fa-edit"></i>
                        </button>
                        
                        <!-- Ver detalles -->
                        <button class="action-btn view" data-inscripcion-id="${inscripcion.id}" title="Ver detalles completos">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <!-- Eliminar (solo para cancelados o con confirmación) -->
                        ${inscripcion.estado === 'cancelado' || inscripcion.estado === 'pendiente' ? `
                            <button class="action-btn delete" data-inscripcion-id="${inscripcion.id}" title="Eliminar inscripción">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button class="action-btn delete-confirm" data-inscripcion-id="${inscripcion.id}" title="Eliminar (requiere confirmación)">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }

    setupTableEventListeners() {
        // Confirmar inscripciones
        document.querySelectorAll('.action-btn.confirm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.confirmInscripcion(inscripcionId);
            });
        });

        // Ver detalles
        document.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.viewInscripcionDetails(inscripcionId);
            });
        });

        // Cancelar inscripciones
        document.querySelectorAll('.action-btn.cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.cancelInscripcionAdmin(inscripcionId);
            });
        });

        // Eliminar inscripciones (directo)
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.deleteInscripcion(inscripcionId, false); // Sin confirmación extra
            });
        });

        // Eliminar con confirmación fuerte
        document.querySelectorAll('.action-btn.delete-confirm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.deleteInscripcion(inscripcionId, true); // Con confirmación extra
            });
        });

        // Marcar como pendiente
        document.querySelectorAll('.action-btn.set-pending').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.changeInscripcionStatus(inscripcionId, 'pendiente');
            });
        });

        // Reactivar inscripción cancelada
        document.querySelectorAll('.action-btn.reactivate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.changeInscripcionStatus(inscripcionId, 'pendiente');
            });
        });

        // Editar inscripción
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                this.editInscripcion(inscripcionId);
            });
        });

        // Ver comprobantes
        document.querySelectorAll('.view-comprobante-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const comprobanteUrl = e.currentTarget.dataset.comprobanteUrl;
                const inscripcionId = e.currentTarget.dataset.inscripcionId;
                const metadata = JSON.parse(e.currentTarget.dataset.metadata || '{}');
                this.showComprobanteModal(comprobanteUrl, inscripcionId, metadata);
            });
        });
    }

    updatePagination() {
        const pagination = document.getElementById('inscripciones-pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (!pagination) return;

        const totalPages = Math.ceil(this.filteredInscripciones.length / this.itemsPerPage);

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
    }

    clearAllFilters() {
        document.getElementById('filter-inscripto').value = '';
        document.getElementById('filter-curso-admin').value = '';
        document.getElementById('filter-estado').value = '';
        document.getElementById('filter-fecha').value = '';
        
        this.applyInscripcionFilters();
    }

    async confirmInscripcion(inscripcionId) {
        if (!confirm('¿Estás seguro de confirmar esta inscripción?')) return;

        try {
            window.authManager.showLoading();
            
            // Obtener datos de la inscripción antes de actualizarla
            const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
            
            await updateDoc(doc(db, 'inscripciones', inscripcionId), {
                estado: 'confirmado',
                fechaConfirmacion: new Date()
            });
            
            // Registrar ingreso automático en contabilidad
            if (inscripcion && this.contabilidadManager) {
                await this.contabilidadManager.registrarIngresoAutomatico(inscripcion);
            }

            // Enviar email de confirmación al alumno
            if (window.emailService) {
                try {
                    const emailResult = await window.emailService.procesarInscripcion(inscripcionId, 'confirmar');
                    if (emailResult.success) {
                        // console.log removed
                    } else {
                        // console.log removed
                    }
                } catch (emailError) {
                    console.error('Error enviando email de confirmación:', emailError);
                }
            }
            
            window.authManager.showMessage('Inscripción confirmada exitosamente', 'success');
            // Las actualizaciones se manejan automáticamente con onSnapshot

        } catch (error) {
            console.error('Error confirming inscripcion:', error);
            window.authManager.showMessage('Error al confirmar inscripción', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    viewInscripcionDetails(inscripcionId) {
        const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
        if (!inscripcion) return;

        const fechaInscripcion = new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleString('es-AR');
        const fechaCurso = inscripcion.cursoFecha ? 
            new Date(inscripcion.cursoFecha.seconds * 1000).toLocaleString('es-AR') : 'No definida';

        const details = `
            Inscripto: ${inscripcion.usuarioNombre}
            Email: ${inscripcion.usuarioEmail}
            Curso: ${inscripcion.cursoNombre}
            Fecha del Curso: ${fechaCurso}
            Fecha de Inscripción: ${fechaInscripcion}
            Estado: ${this.getEstadoText(inscripcion.estado)}
            Costo: $${inscripcion.costo.toLocaleString()}
            ${inscripcion.metodoPago ? `Método de Pago: ${inscripcion.metodoPago}` : ''}
        `;

        alert(details);
    }

    async cancelInscripcionAdmin(inscripcionId) {
        if (!confirm('¿Estás seguro de cancelar esta inscripción? El alumno será notificado por email.')) return;

        try {
            window.authManager.showLoading();
            
            await updateDoc(doc(db, 'inscripciones', inscripcionId), {
                estado: 'cancelado',
                fechaCancelacion: new Date(),
                canceladoPor: 'admin'
            });
            
            // TODO: Enviar email de notificación de cancelación
            
            window.authManager.showMessage('Inscripción cancelada exitosamente', 'success');
            // Las actualizaciones se manejan automáticamente con onSnapshot

        } catch (error) {
            console.error('Error canceling inscripcion:', error);
            window.authManager.showMessage('Error al cancelar inscripción', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async deleteInscripcion(inscripcionId) {
        if (!confirm('¿Estás seguro de eliminar esta inscripción? Esta acción no se puede deshacer.')) return;

        try {
            window.authManager.showLoading();
            
            // Obtener datos de la inscripción antes de eliminarla
            const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
            
            await deleteDoc(doc(db, 'inscripciones', inscripcionId));
            
            // Logging de eliminación de inscripción
            await this.logSystemAction('delete_inscription', {
                inscripcionId: inscripcionId,
                usuarioEmail: inscripcion?.usuarioEmail,
                usuarioNombre: inscripcion?.usuarioNombre,
                cursoId: inscripcion?.cursoId,
                cursoNombre: inscripcion?.cursoNombre,
                estadoAnterior: inscripcion?.estado,
                success: true
            });
            
            window.authManager.showMessage('Inscripción eliminada exitosamente', 'success');
            // Las actualizaciones se manejan automáticamente con onSnapshot

        } catch (error) {
            console.error('Error deleting inscripcion:', error);
            window.authManager.showMessage('Error al eliminar inscripción', 'error');
            
            // Logging de error en eliminación
            await this.logSystemAction('delete_inscription_error', {
                inscripcionId: inscripcionId,
                error: error.message,
                success: false
            });
        } finally {
            window.authManager.hideLoading();
        }
    }

    exportInscripcionesToCSV() {
        if (this.filteredInscripciones.length === 0) {
            window.authManager.showMessage('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Nombre', 'Email', 'Curso', 'Fecha Curso', 'Fecha Inscripción', 'Estado', 'Monto', 'Método Pago'];
        const csvContent = [
            headers.join(','),
            ...this.filteredInscripciones.map(inscripcion => {
                const fechaInscripcion = new Date(inscripcion.fechaInscripcion.seconds * 1000).toLocaleDateString('es-AR');
                const fechaCurso = inscripcion.cursoFecha ? 
                    new Date(inscripcion.cursoFecha.seconds * 1000).toLocaleDateString('es-AR') : 'N/A';
                
                return [
                    `"${inscripcion.usuarioNombre}"`,
                    `"${inscripcion.usuarioEmail}"`,
                    `"${inscripcion.cursoNombre}"`,
                    `"${fechaCurso}"`,
                    `"${fechaInscripcion}"`,
                    `"${this.getEstadoText(inscripcion.estado)}"`,
                    inscripcion.costo,
                    `"${inscripcion.metodoPago || 'N/A'}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `inscripciones_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.authManager.showMessage('CSV exportado exitosamente', 'success');
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
                ${receta.pdfUrl ? `
                    <div class="receta-pdf-preview">
                        <a href="${receta.pdfUrl}" download="${receta.nombre}.pdf" class="btn btn--outline btn--small">
                            <i class="fas fa-file-pdf"></i>
                            Descargar PDF
                        </a>
                    </div>
                ` : ''}
                <div class="card__content">
                    <div class="card__info">
                        <div class="card__info-item">
                            <i class="fas fa-chalkboard-teacher"></i>
                            <span>${receta.cursoNombre || 'Sin curso'}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${receta.fechaCreacion ? new Date(receta.fechaCreacion.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div class="card__info-item">
                            <i class="fas fa-heart"></i>
                            <span>${receta.likes ? receta.likes.length : 0} likes</span>
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
                        <label class="form__label">Archivo PDF de la receta</label>
                        <input type="file" id="receta-pdf" class="input" accept=".pdf">
                        ${receta?.pdfUrl ? `<p class="file-note">PDF actual disponible. Selecciona uno nuevo para reemplazar.</p>` : ''}
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
            
            let pdfUrl = null;
            const pdfFile = modal.querySelector('#receta-pdf').files[0];
            
            if (pdfFile) {
                pdfUrl = await this.uploadRecetaPDF(pdfFile);
            }
            
            const recetaData = {
                nombre: modal.querySelector('#receta-nombre').value,
                cursoNombre: modal.querySelector('#receta-curso').value,
                pdfUrl: pdfUrl,
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
                fechaModificacion: new Date()
            };

            const pdfFile = modal.querySelector('#receta-pdf').files[0];
            if (pdfFile) {
                recetaData.pdfUrl = await this.uploadRecetaPDF(pdfFile);
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

    async uploadRecetaPDF(file) {
        try {
            // console.log removed
            
            // Sistema Base64 para PDFs de recetas - Compatible con Firebase Spark
            
            // Validaciones
            if (file.size > 2 * 1024 * 1024) { // 2MB límite para PDFs
                throw new Error('PDF muy grande. Máximo 2MB para archivos PDF de recetas.');
            }

            // Validar que sea un PDF
            if (file.type !== 'application/pdf') {
                throw new Error('Solo se permiten archivos PDF para las recetas.');
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const base64Data = e.target.result;
                        
                        // console.log removed
                        
                        // Para recetas, retornamos directamente la data URL
                        resolve(base64Data);
                    } catch (error) {
                        console.error('❌ Error procesando PDF:', error);
                        reject(new Error('Error al procesar el PDF'));
                    }
                };
                
                reader.onerror = function(error) {
                    console.error('❌ Error leyendo PDF:', error);
                    reject(new Error('Error al leer el PDF'));
                };
                
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('Error uploading receta PDF:', error);
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
        if (filterCurso && this.inscripciones) {
            // Obtener nombres únicos de cursos, filtrando valores válidos
            const cursosNombres = [...new Set(
                this.inscripciones
                    .map(i => i.cursoNombre)
                    .filter(nombre => nombre && nombre.trim())
            )].sort();
            
            // Guardar valor seleccionado actual
            const currentValue = filterCurso.value;
            
            // Reconstruir opciones
            filterCurso.innerHTML = '<option value="">Todos los cursos</option>';
            cursosNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                filterCurso.appendChild(option);
            });
            
            // Restaurar valor seleccionado si aún existe
            if (currentValue && cursosNombres.includes(currentValue)) {
                filterCurso.value = currentValue;
            }
            
            // console.log removed
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
            'confirmado': 'Confirmado',
            'cancelado': 'Cancelado'
        };
        return estados[estado] || estado;
    }

    // Modal para ver comprobantes con opción de descarga
    showComprobanteModal(comprobanteUrl, inscripcionId, metadata = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        const fileName = metadata.originalName || `comprobante_${inscripcionId}`;
        const fileSize = metadata.size ? `(${(metadata.size / 1024).toFixed(1)}KB)` : '';
        const fileType = metadata.type || 'Archivo';
        const uploadDate = metadata.uploadDate ? new Date(metadata.uploadDate).toLocaleDateString('es-AR') : '';

        modal.innerHTML = `
            <div class="modal__content" style="max-width: 90vw; max-height: 90vh;">
                <span class="modal__close">&times;</span>
                <div class="modal__header">
                    <h2 class="modal__title">
                        <i class="fas fa-file-image"></i> Comprobante de Pago
                    </h2>
                    <div class="comprobante-info" style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        <p><strong>Archivo:</strong> ${fileName} ${fileSize}</p>
                        <p><strong>Tipo:</strong> ${fileType}</p>
                        ${uploadDate ? `<p><strong>Subido:</strong> ${uploadDate}</p>` : ''}
                        <p><strong>Inscripción:</strong> ${inscripcionId}</p>
                    </div>
                </div>
                
                <div class="modal__body" style="text-align: center; overflow: auto; max-height: 60vh; margin: 20px 0;">
                    ${this.renderComprobanteContent(comprobanteUrl, fileType)}
                </div>
                
                <div class="modal__footer" style="display: flex; gap: 10px; justify-content: center; padding-top: 20px; border-top: 1px solid #eee;">
                    <button class="btn btn--outline download-comprobante-btn">
                        <i class="fas fa-download"></i> Descargar Archivo
                    </button>
                    <button class="btn btn--secondary close-modal-btn">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        const downloadBtn = modal.querySelector('.download-comprobante-btn');
        const closeBtn = modal.querySelector('.close-modal-btn');
        const closeX = modal.querySelector('.modal__close');

        // Función de descarga
        downloadBtn.addEventListener('click', () => {
            this.downloadComprobante(comprobanteUrl, fileName);
        });

        // Funciones de cerrar
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        closeX.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    renderComprobanteContent(comprobanteUrl, fileType) {
        if (fileType && fileType.includes('pdf')) {
            return `
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: #e74c3c; margin-bottom: 10px;"></i>
                    <p><strong>Archivo PDF</strong></p>
                    <p style="color: #666;">Use el botón "Descargar" para ver el contenido completo del PDF.</p>
                </div>
            `;
        } else {
            return `
                <img src="${comprobanteUrl}" alt="Comprobante de Pago" 
                     style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; padding: 2rem; color: #666; background: #f5f5f5; border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f39c12;"></i>
                    <p><strong>Error cargando imagen</strong></p>
                    <p>Use el botón "Descargar" para obtener el archivo.</p>
                </div>
            `;
        }
    }

    downloadComprobante(dataUrl, fileName) {
        try {
            // Crear elemento de descarga temporal
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            
            // Agregar al DOM temporalmente y hacer clic
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // console.log removed
            
            // Mostrar mensaje de éxito
            window.authManager?.showMessage('Descarga iniciada correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error en descarga:', error);
            window.authManager?.showMessage('Error al descargar el archivo', 'error');
            
            // Fallback: Abrir en nueva pestaña
            try {
                const newWindow = window.open();
                newWindow.document.write(`
                    <html>
                        <head><title>${fileName}</title></head>
                        <body style="margin:0; text-align:center; background:#f5f5f5;">
                            <div style="padding:20px;">
                                <h3>Comprobante: ${fileName}</h3>
                                <img src="${dataUrl}" style="max-width:100%; height:auto;">
                                <br><br>
                                <button onclick="window.close()">Cerrar</button>
                            </div>
                        </body>
                    </html>
                `);
            } catch (fallbackError) {
                console.error('❌ Fallback también falló:', fallbackError);
            }
        }
    }

    // Cambiar estado de inscripción
    async changeInscripcionStatus(inscripcionId, newStatus) {
        try {
            const statusNames = {
                'pendiente': 'Pendiente',
                'pagado': 'Pagado',
                'confirmado': 'Confirmado',
                'cancelado': 'Cancelado'
            };

            const confirmMessage = `¿Cambiar estado a "${statusNames[newStatus]}"?`;
            if (!confirm(confirmMessage)) return;

            await this.logSystemAction('change_status', {
                inscripcionId,
                oldStatus: 'unknown', // Se actualizará en el método
                newStatus,
                adminAction: true
            });

            const inscripcionRef = doc(db, 'inscripciones', inscripcionId);
            await updateDoc(inscripcionRef, {
                estado: newStatus,
                fechaActualizacion: new Date(),
                actualizadoPor: auth.currentUser.email
            });

            // Actualizar base_inscriptos cuando cambie estado de inscripción
            try {
                const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
                if (inscripcion && window.baseInscriptosManager) {
                    // Obtener datos del curso
                    const curso = this.cursos.find(c => c.id === inscripcion.cursoId);
                    
                    // Actualizar inscripción con nuevo estado
                    const inscripcionActualizada = {
                        ...inscripcion,
                        estado: newStatus,
                        fechaActualizacion: new Date()
                    };
                    
                    await window.baseInscriptosManager.actualizarInscripto(
                        inscripcion.usuarioEmail, 
                        inscripcionActualizada, 
                        curso
                    );
                    
                    // console.log removed
                }
            } catch (baseError) {
                console.error('⚠️ Error actualizando base_inscriptos:', baseError);
                // No detener el proceso principal por este error
            }

            // Enviar emails según el nuevo estado
            if (window.emailService) {
                try {
                    let emailResult = null;
                    
                    switch (newStatus) {
                        case 'confirmado':
                            emailResult = await window.emailService.procesarInscripcion(inscripcionId, 'confirmar');
                            break;
                        case 'cancelado':
                            emailResult = await window.emailService.procesarInscripcion(inscripcionId, 'cancelar', 'Cancelado por administrador');
                            break;
                    }
                    
                    if (emailResult?.success) {
                        // console.log removed
                    } else if (emailResult) {
                        // console.log removed
                    }
                } catch (emailError) {
                    console.error('Error enviando email por cambio de estado:', emailError);
                }
            }

            window.authManager.showMessage(`Estado cambiado a "${statusNames[newStatus]}"`, 'success');
            // Las actualizaciones se manejan automáticamente con onSnapshot

        } catch (error) {
            console.error('Error cambiando estado:', error);
            window.authManager.showMessage('Error al cambiar el estado', 'error');
        }
    }

    // Editar información de inscripción
    async editInscripcion(inscripcionId) {
        try {
            // Buscar la inscripción
            const inscripcion = this.inscripciones.find(i => i.id === inscripcionId);
            if (!inscripcion) {
                window.authManager.showMessage('Inscripción no encontrada', 'error');
                return;
            }

            // Crear modal de edición
            this.showEditInscripcionModal(inscripcion);

        } catch (error) {
            console.error('Error abriendo editor:', error);
            window.authManager.showMessage('Error al abrir el editor', 'error');
        }
    }

    // Modal para editar inscripción
    showEditInscripcionModal(inscripcion) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content" style="max-width: 600px;">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">
                    <i class="fas fa-edit"></i> Editar Inscripción
                </h2>
                
                <form id="edit-inscripcion-form" class="form">
                    <div class="form__group">
                        <label>Usuario (Email)</label>
                        <input type="email" id="edit-usuario-email" value="${inscripcion.usuarioEmail}" readonly 
                               style="background: #f5f5f5;">
                    </div>

                    <div class="form__group">
                        <label>Estado</label>
                        <select id="edit-estado" required>
                            <option value="pendiente" ${inscripcion.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="pagado" ${inscripcion.estado === 'pagado' ? 'selected' : ''}>Pagado</option>
                            <option value="confirmado" ${inscripcion.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                            <option value="cancelado" ${inscripcion.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>

                    <div class="form__group">
                        <label>Método de Pago</label>
                        <select id="edit-metodo-pago">
                            <option value="transferencia" ${inscripcion.metodoPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                            <option value="efectivo" ${inscripcion.metodoPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                            <option value="tarjeta" ${inscripcion.metodoPago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                            <option value="otro" ${inscripcion.metodoPago === 'otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>

                    <div class="form__group">
                        <label>Comentarios del Pago</label>
                        <textarea id="edit-comentarios" rows="3">${inscripcion.comentariosPago || ''}</textarea>
                    </div>

                    <div class="form__group">
                        <label>Notas del Administrador</label>
                        <textarea id="edit-notas-admin" rows="3" placeholder="Notas internas...">${inscripcion.notasAdmin || ''}</textarea>
                    </div>

                    <div class="form__actions">
                        <button type="submit" class="btn btn--primary">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                        <button type="button" class="btn btn--secondary close-modal-btn">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        const form = modal.querySelector('#edit-inscripcion-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveInscripcionChanges(inscripcion.id, modal);
        });

        const closeModal = () => modal.remove();
        modal.querySelector('.modal__close').addEventListener('click', closeModal);
        modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Guardar cambios de inscripción
    async saveInscripcionChanges(inscripcionId, modal) {
        try {
            const formData = {
                estado: modal.querySelector('#edit-estado').value,
                metodoPago: modal.querySelector('#edit-metodo-pago').value,
                comentariosPago: modal.querySelector('#edit-comentarios').value,
                notasAdmin: modal.querySelector('#edit-notas-admin').value,
                fechaActualizacion: new Date(),
                actualizadoPor: auth.currentUser.email
            };

            await this.logSystemAction('edit_inscription', {
                inscripcionId,
                changes: formData,
                adminAction: true
            });

            const inscripcionRef = doc(db, 'inscripciones', inscripcionId);
            await updateDoc(inscripcionRef, formData);

            modal.remove();
            window.authManager.showMessage('Inscripción actualizada correctamente', 'success');
            // Las actualizaciones se manejan automáticamente con onSnapshot

        } catch (error) {
            console.error('Error guardando cambios:', error);
            window.authManager.showMessage('Error al guardar los cambios', 'error');
        }
    }

    // Sistema de logging mejorado
    async logSystemAction(action, details = {}) {
        try {
            // Usar el sistema de logging centralizado
            await systemLogger.logAdmin(action, {
                ...details,
                sessionId: this.getSessionId(),
                adminAction: true
            });
            
            // console.log removed

        } catch (error) {
            console.error('Error registrando acción:', error);
            // No mostrar error al usuario, es logging interno
        }
    }

    // Generar o recuperar ID de sesión
    getSessionId() {
        let sessionId = sessionStorage.getItem('admin_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('admin_session_id', sessionId);
        }
        return sessionId;
    }

    // SISTEMA DE LOGS - Gestión completa del registro del sistema
    
    async loadSystemLogs(filters = {}) {
        try {
            // console.log removed
            
            let logsQuery = collection(db, 'system_logs');
            const constraints = [];

            // Aplicar filtros
            if (filters.userType) {
                constraints.push(where('userType', '==', filters.userType));
            }
            if (filters.action) {
                constraints.push(where('action', '==', filters.action));
            }
            if (filters.dateFrom) {
                constraints.push(where('timestamp', '>=', new Date(filters.dateFrom)));
            }
            if (filters.dateTo) {
                const dateTo = new Date(filters.dateTo);
                dateTo.setHours(23, 59, 59, 999);
                constraints.push(where('timestamp', '<=', dateTo));
            }

            // Aplicar constraints y ordenar
            if (constraints.length > 0) {
                logsQuery = query(logsQuery, ...constraints, orderBy('timestamp', 'desc'), limit(100));
            } else {
                logsQuery = query(logsQuery, orderBy('timestamp', 'desc'), limit(100));
            }

            const querySnapshot = await getDocs(logsQuery);
            const logs = [];
            
            querySnapshot.forEach((doc) => {
                logs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderLogsTable(logs);
            this.updateLogsStats(logs);
            
            // console.log removed

        } catch (error) {
            console.error('❌ Error cargando logs:', error);
            window.authManager?.showMessage('Error cargando el registro del sistema', 'error');
        }
    }

    renderLogsTable(logs) {
        const tbody = document.getElementById('logs-table-body');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 2em; margin-bottom: 10px;"></i><br>
                        No se encontraron registros con los filtros aplicados
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(log => this.renderLogRow(log)).join('');
        document.getElementById('logs-info').textContent = `Mostrando ${logs.length} registros`;
    }

    renderLogRow(log) {
        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const formattedDate = timestamp.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const actionIcons = {
            'login': '<i class="fas fa-sign-in-alt" style="color: #28a745;"></i>',
            'register': '<i class="fas fa-user-plus" style="color: #007bff;"></i>',
            'inscripcion': '<i class="fas fa-calendar-plus" style="color: #17a2b8;"></i>',
            'upload_comprobante': '<i class="fas fa-file-upload" style="color: #6f42c1;"></i>',
            'change_status': '<i class="fas fa-exchange-alt" style="color: #fd7e14;"></i>',
            'edit_inscription': '<i class="fas fa-edit" style="color: #ffc107;"></i>',
            'create_course': '<i class="fas fa-plus-circle" style="color: #20c997;"></i>',
            'create_recipe': '<i class="fas fa-utensils" style="color: #e83e8c;"></i>',
            'delete': '<i class="fas fa-trash" style="color: #dc3545;"></i>'
        };

        const actionIcon = actionIcons[log.action] || '<i class="fas fa-circle" style="color: #6c757d;"></i>';
        const userTypeClass = log.userType === 'admin' ? 'admin-user' : 'student-user';
        
        const details = this.formatLogDetails(log.details);
        const sessionInfo = this.formatSessionInfo(log);

        return `
            <tr class="log-row ${userTypeClass}">
                <td>
                    <div style="font-size: 0.9em;">
                        <strong>${formattedDate}</strong>
                    </div>
                </td>
                <td>
                    <div class="user-info">
                        <span class="user-email" style="font-weight: 500;">${log.userEmail}</span>
                        <span class="user-type-badge ${log.userType}" style="font-size: 0.8em; padding: 2px 6px; border-radius: 12px; ${this.getUserTypeBadgeStyle(log.userType)}">
                            ${log.userType.toUpperCase()}
                        </span>
                    </div>
                </td>
                <td style="text-align: center;">${actionIcon}</td>
                <td>
                    <strong>${this.getActionDisplayName(log.action)}</strong>
                </td>
                <td>
                    <div class="log-details" style="max-width: 300px; font-size: 0.9em;">
                        ${details}
                    </div>
                </td>
                <td style="font-size: 0.8em; color: #666;">
                    ${sessionInfo}
                </td>
            </tr>
        `;
    }

    formatLogDetails(details) {
        if (!details) return '-';
        
        // Formatear diferentes tipos de detalles
        if (details.inscripcionId) {
            return `<strong>Inscripción:</strong> ${details.inscripcionId.substring(0, 8)}...`;
        }
        
        if (details.cursoId) {
            return `<strong>Curso:</strong> ${details.cursoNombre || details.cursoId.substring(0, 8) + '...'}`;
        }
        
        if (details.changes) {
            const changesCount = Object.keys(details.changes).length;
            return `<strong>Cambios:</strong> ${changesCount} campos modificados`;
        }
        
        if (details.oldStatus && details.newStatus) {
            return `<strong>Estado:</strong> ${details.oldStatus} → ${details.newStatus}`;
        }
        
        // Si hay otros detalles, mostrar resumen
        const detailsStr = JSON.stringify(details);
        if (detailsStr.length > 50) {
            return detailsStr.substring(0, 50) + '...';
        }
        
        return detailsStr;
    }

    formatSessionInfo(log) {
        const sessionId = log.sessionId ? log.sessionId.substring(-8) : 'N/A';
        return `
            <div>Session: ${sessionId}</div>
            <div style="margin-top: 2px;">
                ${log.userAgent ? this.getBrowserInfo(log.userAgent) : 'Browser N/A'}
            </div>
        `;
    }

    getBrowserInfo(userAgent) {
        if (userAgent.includes('Chrome')) return '<i class="fab fa-chrome"></i> Chrome';
        if (userAgent.includes('Firefox')) return '<i class="fab fa-firefox"></i> Firefox';
        if (userAgent.includes('Safari')) return '<i class="fab fa-safari"></i> Safari';
        if (userAgent.includes('Edge')) return '<i class="fab fa-edge"></i> Edge';
        return '<i class="fas fa-globe"></i> Unknown';
    }

    getUserTypeBadgeStyle(userType) {
        if (userType === 'admin') {
            return 'background: #dc3545; color: white;';
        }
        return 'background: #28a745; color: white;';
    }

    getActionDisplayName(action) {
        const actionNames = {
            'login': 'Inicio de Sesión',
            'register': 'Registro',
            'inscripcion': 'Inscripción a Curso',
            'upload_comprobante': 'Subir Comprobante',
            'change_status': 'Cambio de Estado',
            'edit_inscription': 'Editar Inscripción',
            'create_course': 'Crear Curso',
            'create_recipe': 'Crear Receta',
            'delete': 'Eliminar'
        };
        return actionNames[action] || action;
    }

    updateLogsStats(logs) {
        const totalActions = logs.length;
        const uniqueUsers = new Set(logs.map(log => log.userEmail)).size;
        const adminActions = logs.filter(log => log.userType === 'admin').length;
        const lastActivity = logs.length > 0 ? 
            new Date(logs[0].timestamp?.toDate ? logs[0].timestamp.toDate() : logs[0].timestamp)
                .toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : 'N/A';

        document.getElementById('stat-total-actions').textContent = totalActions;
        document.getElementById('stat-unique-users').textContent = uniqueUsers;
        document.getElementById('stat-admin-actions').textContent = adminActions;
        document.getElementById('stat-last-activity').textContent = lastActivity;
    }

    setupLogsEventListeners() {
        // Filtros
        document.getElementById('apply-log-filters')?.addEventListener('click', () => {
            const filters = {
                userType: document.getElementById('filter-user-type').value,
                action: document.getElementById('filter-action-type').value,
                dateFrom: document.getElementById('filter-date-from').value,
                dateTo: document.getElementById('filter-date-to').value
            };
            this.loadSystemLogs(filters);
        });

        document.getElementById('clear-log-filters')?.addEventListener('click', () => {
            document.getElementById('filter-user-type').value = '';
            document.getElementById('filter-action-type').value = '';
            document.getElementById('filter-date-from').value = '';
            document.getElementById('filter-date-to').value = '';
            this.loadSystemLogs();
        });

        // Exportar logs
        document.getElementById('export-logs')?.addEventListener('click', () => {
            this.exportLogs();
        });
    }

    async exportLogs() {
        try {
            const logs = await this.getAllLogsForExport();
            const csvContent = this.convertLogsToCSV(logs);
            this.downloadCSV(csvContent, 'system_logs_' + new Date().toISOString().split('T')[0] + '.csv');
        } catch (error) {
            console.error('Error exportando logs:', error);
            window.authManager?.showMessage('Error al exportar los logs', 'error');
        }
    }

    convertLogsToCSV(logs) {
        const headers = ['Fecha', 'Usuario', 'Tipo Usuario', 'Acción', 'Detalles', 'Session ID'];
        const rows = logs.map(log => [
            log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : log.timestamp,
            log.userEmail,
            log.userType,
            log.action,
            JSON.stringify(log.details || {}),
            log.sessionId || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    async getAllLogsForExport() {
        try {
            const logsQuery = query(
                collection(db, 'system_logs'),
                orderBy('timestamp', 'desc'),
                limit(1000) // Limitar a 1000 registros más recientes para exportación
            );
            
            const querySnapshot = await getDocs(logsQuery);
            const logs = [];
            
            querySnapshot.forEach((doc) => {
                logs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return logs;
            
        } catch (error) {
            console.error('Error obteniendo logs para exportar:', error);
            throw error;
        }
    }

    // ============================================
    // GESTIÓN DE NOTAS
    // ============================================
    
    initializeNotasManager() {
        if (!this.notasManager && window.notasManager) {
            // console.log removed
            this.notasManager = window.notasManager;
            // Llamar init() para cargar las notas y configurar el Kanban
            this.notasManager.init();
            // console.log removed
        } else if (!window.notasManager) {
            console.error('❌ NotasManager no está disponible');
        }
    }

    // ============================================
    // GESTIÓN DE ESTADO DE CURSOS
    // ============================================
    
    loadEstadoCursosTab() {
        // console.log removed
        this.renderEstadoCursos();
    }
    
    setupEstadoCursosTable() {
        // Filtros
        document.getElementById('filter-curso-nombre')?.addEventListener('input', () => {
            this.applyEstadoCursosFilters();
        });
        
        document.getElementById('filter-estado-curso')?.addEventListener('change', () => {
            this.applyEstadoCursosFilters();
        });
        
        document.getElementById('filter-fecha-estado')?.addEventListener('change', () => {
            this.applyEstadoCursosFilters();
        });
        
        // Botones
        document.getElementById('clear-estado-filters-btn')?.addEventListener('click', () => {
            this.clearEstadoCursosFilters();
        });
        
        document.getElementById('export-estado-cursos-btn')?.addEventListener('click', () => {
            this.exportEstadoCursosCSV();
        });
        
        // Paginación
        document.getElementById('prev-estado-page')?.addEventListener('click', () => {
            if (this.estadoCursosCurrentPage > 1) {
                this.estadoCursosCurrentPage--;
                this.renderEstadoCursosTable();
            }
        });
        
        document.getElementById('next-estado-page')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredEstadoCursos.length / this.estadoCursosItemsPerPage);
            if (this.estadoCursosCurrentPage < totalPages) {
                this.estadoCursosCurrentPage++;
                this.renderEstadoCursosTable();
            }
        });
        
        // Sorting
        document.querySelectorAll('#estado-cursos-table .sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.sortEstadoCursos(column);
            });
        });
    }
    
    calculateCursoStats() {
        if (!this.cursos || !this.inscripciones) return [];
        
        return this.cursos.map(curso => {
            const inscripcionesCurso = this.inscripciones.filter(i => i.cursoId === curso.id);
            const confirmadas = inscripcionesCurso.filter(i => i.estado === 'confirmado').length;
            const pendientes = inscripcionesCurso.filter(i => i.estado === 'pendiente').length;
            const pagadas = inscripcionesCurso.filter(i => i.estado === 'pagado').length;
            
            const recaudacionConfirmada = inscripcionesCurso
                .filter(i => ['pagado', 'confirmado'].includes(i.estado))
                .reduce((sum, i) => sum + (i.costo || 0), 0);
                
            const recaudacionPotencial = inscripcionesCurso
                .reduce((sum, i) => sum + (i.costo || 0), 0);
            
            const capacidadMaxima = curso.capacidadMaxima || 999;
            // Contar inscriptos activos dinámicamente
            const inscriptosActuales = inscripcionesCurso.filter(i => 
                ['pendiente', 'pagado', 'confirmado'].includes(i.estado)
            ).length || 0;
            const porcentajeOcupacion = capacidadMaxima > 0 ? 
                ((inscriptosActuales / capacidadMaxima) * 100).toFixed(1) : '0.0';
            
            const fechaCurso = new Date(curso.fechaHora.seconds * 1000);
            const ahora = new Date();
            
            let estadoCurso = 'disponible';
            if (fechaCurso < ahora) {
                estadoCurso = 'finalizado';
            } else if (inscriptosActuales >= capacidadMaxima) {
                estadoCurso = 'lleno';
            } else if (porcentajeOcupacion >= 80) {
                estadoCurso = 'proximo';
            }
            
            return {
                ...curso,
                inscripcionesCurso,
                totalInscriptos: inscripcionesCurso.length,
                inscriptosConfirmados: confirmadas,
                inscriptosPendientes: pendientes,
                inscriptosPagados: pagadas,
                recaudacionConfirmada,
                recaudacionPotencial,
                porcentajeOcupacion: parseFloat(porcentajeOcupacion),
                estadoCurso,
                fechaCurso
            };
        });
    }
    
    renderEstadoCursos() {
        this.filteredEstadoCursos = this.calculateCursoStats();
        this.applyEstadoCursosFilters();
        this.updateEstadoCursosStats();
        this.renderEstadoCursosTable();
    }
    
    updateEstadoCursosStats() {
        const cursosConStats = this.filteredEstadoCursos;
        
        const totalActivos = cursosConStats.filter(c => c.estadoCurso !== 'finalizado').length;
        const ocupacionPromedio = cursosConStats.length > 0 ?
            (cursosConStats.reduce((sum, c) => sum + c.porcentajeOcupacion, 0) / cursosConStats.length).toFixed(1) :
            0;
        const recaudacionTotal = cursosConStats.reduce((sum, c) => sum + c.recaudacionConfirmada, 0);
        const cursosLlenos = cursosConStats.filter(c => c.estadoCurso === 'lleno').length;
        
        document.getElementById('total-cursos-activos').textContent = totalActivos;
        document.getElementById('ocupacion-promedio').textContent = ocupacionPromedio + '%';
        document.getElementById('recaudacion-total').textContent = '$' + recaudacionTotal.toLocaleString();
        document.getElementById('cursos-llenos').textContent = cursosLlenos;
    }
    
    applyEstadoCursosFilters() {
        let filtered = [...this.calculateCursoStats()];
        
        // Filtro por nombre
        const nombreFilter = document.getElementById('filter-curso-nombre')?.value.toLowerCase();
        if (nombreFilter) {
            filtered = filtered.filter(curso =>
                curso.nombre.toLowerCase().includes(nombreFilter)
            );
        }
        
        // Filtro por estado
        const estadoFilter = document.getElementById('filter-estado-curso')?.value;
        if (estadoFilter) {
            filtered = filtered.filter(curso => curso.estadoCurso === estadoFilter);
        }
        
        // Filtro por fecha
        const fechaFilter = document.getElementById('filter-fecha-estado')?.value;
        if (fechaFilter) {
            const ahora = new Date();
            const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            
            filtered = filtered.filter(curso => {
                const fechaCurso = curso.fechaCurso;
                
                switch (fechaFilter) {
                    case 'hoy':
                        return fechaCurso >= hoy && fechaCurso < new Date(hoy.getTime() + 24 * 60 * 60 * 1000);
                    case 'esta-semana':
                        const inicioSemana = new Date(hoy);
                        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
                        const finSemana = new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return fechaCurso >= inicioSemana && fechaCurso < finSemana;
                    case 'proximo-mes':
                        const inicioProximoMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
                        const finProximoMes = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0);
                        return fechaCurso >= inicioProximoMes && fechaCurso <= finProximoMes;
                    case 'pasados':
                        return fechaCurso < hoy;
                    default:
                        return true;
                }
            });
        }
        
        this.filteredEstadoCursos = filtered;
        this.estadoCursosCurrentPage = 1;
        this.updateEstadoCursosStats();
        this.renderEstadoCursosTable();
    }
    
    sortEstadoCursos(column) {
        if (this.estadoCursosSortColumn === column) {
            this.estadoCursosSortDirection = this.estadoCursosSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.estadoCursosSortColumn = column;
            this.estadoCursosSortDirection = 'asc';
        }
        
        this.filteredEstadoCursos.sort((a, b) => {
            let valueA, valueB;
            
            switch (column) {
                case 'nombre':
                    valueA = a.nombre;
                    valueB = b.nombre;
                    break;
                case 'fechaHora':
                    valueA = a.fechaCurso;
                    valueB = b.fechaCurso;
                    break;
                case 'inscriptos':
                    valueA = a.totalInscriptos;
                    valueB = b.totalInscriptos;
                    break;
                case 'ocupacion':
                    valueA = a.porcentajeOcupacion;
                    valueB = b.porcentajeOcupacion;
                    break;
                case 'estado':
                    valueA = a.estadoCurso;
                    valueB = b.estadoCurso;
                    break;
                case 'confirmados':
                    valueA = a.inscriptosConfirmados;
                    valueB = b.inscriptosConfirmados;
                    break;
                case 'pendientes':
                    valueA = a.inscriptosPendientes;
                    valueB = b.inscriptosPendientes;
                    break;
                case 'recaudacion':
                    valueA = a.recaudacionConfirmada;
                    valueB = b.recaudacionConfirmada;
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return this.estadoCursosSortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.estadoCursosSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.renderEstadoCursosTable();
    }
    
    renderEstadoCursosTable() {
        const tbody = document.getElementById('estado-cursos-table-body');
        if (!tbody) return;
        
        if (this.filteredEstadoCursos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="no-content">
                            <i class="fas fa-search"></i>
                            <p>No se encontraron cursos</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const startIndex = (this.estadoCursosCurrentPage - 1) * this.estadoCursosItemsPerPage;
        const endIndex = Math.min(startIndex + this.estadoCursosItemsPerPage, this.filteredEstadoCursos.length);
        const cursosToShow = this.filteredEstadoCursos.slice(startIndex, endIndex);
        
        tbody.innerHTML = cursosToShow.map(curso => this.createEstadoCursoTableRow(curso)).join('');
        this.updateEstadoCursosPagination();
    }
    
    createEstadoCursoTableRow(curso) {
        const fechaFormatted = curso.fechaCurso.toLocaleString('es-AR');
        const capacidadMaxima = curso.capacidadMaxima || '∞';
        
        const estadoClass = {
            'disponible': 'success',
            'proximo': 'warning', 
            'lleno': 'danger',
            'finalizado': 'secondary'
        }[curso.estadoCurso] || 'secondary';
        
        const estadoText = {
            'disponible': 'Disponible',
            'proximo': 'Próximo a llenarse',
            'lleno': 'Completo',
            'finalizado': 'Finalizado'
        }[curso.estadoCurso] || 'Desconocido';
        
        return `
            <tr data-curso-id="${curso.id}">
                <td>
                    <div class="cell-content">
                        <strong>${curso.nombre}</strong>
                        <small class="text-muted d-block">${curso.descripcion || ''}</small>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${fechaFormatted}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>${curso.totalInscriptos}/${capacidadMaxima}</strong>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>${curso.porcentajeOcupacion}%</strong>
                    </div>
                </td>
                <td>
                    <span class="estado-badge estado-badge--${estadoClass}">
                        ${estadoText}
                    </span>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="badge badge--success">${curso.inscriptosConfirmados}</span>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="badge badge--warning">${curso.inscriptosPendientes}</span>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>$${curso.recaudacionConfirmada.toLocaleString()}</strong>
                        <small class="text-muted d-block">
                            Potencial: $${curso.recaudacionPotencial.toLocaleString()}
                        </small>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn--outline btn--small" onclick="adminManager.viewCursoDetails('${curso.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn--outline btn--small" onclick="adminManager.viewInscripcionesByCurso('${curso.id}')" title="Ver inscripciones">
                            <i class="fas fa-users"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateEstadoCursosPagination() {
        const pagination = document.getElementById('estado-cursos-pagination');
        const prevBtn = document.getElementById('prev-estado-page');
        const nextBtn = document.getElementById('next-estado-page');
        const pageInfo = document.getElementById('estado-page-info');
        
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.filteredEstadoCursos.length / this.estadoCursosItemsPerPage);
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        pageInfo.textContent = `Página ${this.estadoCursosCurrentPage} de ${totalPages}`;
        
        prevBtn.disabled = this.estadoCursosCurrentPage === 1;
        nextBtn.disabled = this.estadoCursosCurrentPage === totalPages;
    }
    
    clearEstadoCursosFilters() {
        document.getElementById('filter-curso-nombre').value = '';
        document.getElementById('filter-estado-curso').value = '';
        document.getElementById('filter-fecha-estado').value = '';
        
        this.applyEstadoCursosFilters();
    }
    
    exportEstadoCursosCSV() {
        const cursosConStats = this.filteredEstadoCursos;
        
        if (cursosConStats.length === 0) {
            window.authManager.showMessage('No hay datos para exportar', 'warning');
            return;
        }
        
        const headers = [
            'Curso', 'Fecha/Hora', 'Inscriptos', 'Capacidad Máxima', 'Ocupación (%)',
            'Estado', 'Confirmados', 'Pendientes', 'Pagados', 'Recaudación Confirmada'
        ];
        
        const rows = cursosConStats.map(curso => [
            curso.nombre,
            curso.fechaCurso.toLocaleString('es-AR'),
            curso.totalInscriptos,
            curso.capacidadMaxima || 'Sin límite',
            curso.porcentajeOcupacion + '%',
            curso.estadoCurso,
            curso.inscriptosConfirmados,
            curso.inscriptosPendientes,
            curso.inscriptosPagados,
            '$' + curso.recaudacionConfirmada.toLocaleString()
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `estado-cursos-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.authManager.showMessage('Estado de cursos exportado exitosamente', 'success');
    }
    
    viewCursoDetails(cursoId) {
        const curso = this.cursos.find(c => c.id === cursoId);
        if (!curso) return;
        
        const stats = this.calculateCursoStats().find(c => c.id === cursoId);
        const fechaCurso = new Date(curso.fechaHora.seconds * 1000).toLocaleString('es-AR');
        
        const details = `📚 ${curso.nombre}

📅 ${fechaCurso}
📍 ${curso.ubicacion || 'No especificada'}
💰 $${curso.costo.toLocaleString()}
👥 ${curso.capacidadMaxima || 'Sin límite'} personas

📊 ESTADÍSTICAS
• Estado: ${stats.estadoCurso}
• Ocupación: ${stats.porcentajeOcupacion}%
• Inscripciones: ${stats.totalInscriptos}
• Confirmados: ${stats.inscriptosConfirmados}
• Pendientes: ${stats.inscriptosPendientes}

💰 RECAUDACIÓN
• Confirmada: $${stats.recaudacionConfirmada.toLocaleString()}
• Potencial: $${stats.recaudacionPotencial.toLocaleString()}`;
        
        alert(details);
    }
    
    viewInscripcionesByCurso(cursoId) {
        const curso = this.cursos.find(c => c.id === cursoId);
        if (!curso) return;
        
        // Cambiar al tab de inscripciones
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector('[data-tab="inscripciones-admin"]').classList.add('active');
        document.getElementById('inscripciones-admin').classList.add('active');
        
        // Aplicar filtro por curso
        setTimeout(() => {
            const filtroSelect = document.getElementById('filter-curso-admin');
            if (filtroSelect) {
                filtroSelect.value = curso.nombre;
                this.applyInscripcionFilters();
            }
        }, 100);
        
        window.authManager.showMessage(`Mostrando inscripciones para: ${curso.nombre}`, 'info');
    }
}

// Crear instancias globales
window.adminManager = new AdminManager();
window.bankAccountManager = new BankAccountManager();

// Importar módulo de configuraciones
import('./configuracion.js').then(({ default: ConfiguracionManager }) => {
    // console.log removed
}).catch(error => {
    console.error('❌ Error cargando módulo de configuraciones:', error);
});

export default AdminManager;