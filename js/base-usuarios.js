// Módulo de gestión de Base de Datos de Usuarios
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
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class BaseUsuariosManager {
    constructor() {
        this.usuarios = [];
        this.filteredUsuarios = [];
        this.isLoading = false;
        this.sortConfig = { column: 'email', direction: 'asc' };
        this.initialized = false;
    }

    // Inicializar event listeners cuando el tab se activa por primera vez
    initializeEventListeners() {
        if (this.initialized) return;
        
        // Botón de actualizar
        document.getElementById('refresh-base-usuarios-btn')?.addEventListener('click', () => {
            this.cargarBaseUsuarios();
        });

        // Botón de exportar
        document.getElementById('export-base-usuarios-btn')?.addEventListener('click', () => {
            this.exportarCSV();
        });

        // Filtros
        document.getElementById('filter-email-usuario')?.addEventListener('input', (e) => {
            this.aplicarFiltros();
        });

        document.getElementById('filter-estado-usuario')?.addEventListener('change', (e) => {
            this.aplicarFiltros();
        });

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

    // Cargar todos los usuarios de la colección users
    async cargarBaseUsuarios() {
        try {
            this.isLoading = true;
            this.showLoading();

            console.log('🔄 Cargando base de datos de usuarios...');

            const usuariosQuery = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(usuariosQuery);
            this.usuarios = [];

            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                this.usuarios.push({
                    id: doc.id,
                    uid: userData.uid || doc.id,
                    email: userData.email || 'No disponible',
                    displayName: userData.displayName || userData.nombre || 'Sin nombre',
                    telefono: userData.telefono || 'No disponible',
                    createdAt: userData.createdAt,
                    lastLogin: userData.lastLogin,
                    isAdmin: userData.isAdmin || false,
                    provider: userData.provider || 'email',
                    photoURL: userData.photoURL || null,
                    emailVerified: userData.emailVerified || false,
                    // Datos adicionales que puedan existir
                    direccion: userData.direccion || 'No disponible',
                    fechaNacimiento: userData.fechaNacimiento || 'No disponible',
                    ...userData
                });
            });

            console.log(`✅ Cargados ${this.usuarios.length} usuarios`);
            
            this.filteredUsuarios = [...this.usuarios];
            this.renderTabla();
            this.updateStats();

        } catch (error) {
            console.error('❌ Error cargando base de usuarios:', error);
            this.showMessage('Error al cargar base de usuarios', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    // Aplicar filtros
    aplicarFiltros() {
        const emailFilter = document.getElementById('filter-email-usuario')?.value.toLowerCase() || '';
        const estadoFilter = document.getElementById('filter-estado-usuario')?.value || '';

        this.filteredUsuarios = this.usuarios.filter(usuario => {
            const matchEmail = !emailFilter || 
                usuario.email.toLowerCase().includes(emailFilter) ||
                usuario.displayName.toLowerCase().includes(emailFilter);

            const matchEstado = !estadoFilter || 
                (estadoFilter === 'admin' && usuario.isAdmin) ||
                (estadoFilter === 'user' && !usuario.isAdmin) ||
                (estadoFilter === 'verified' && usuario.emailVerified) ||
                (estadoFilter === 'unverified' && !usuario.emailVerified);

            return matchEmail && matchEstado;
        });

        this.renderTabla();
        this.updateStats();
    }

    // Renderizar tabla de usuarios
    renderTabla() {
        const tbody = document.getElementById('base-usuarios-tbody');
        if (!tbody) return;

        if (this.filteredUsuarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p style="color: #666;">No se encontraron usuarios</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredUsuarios.map(usuario => {
            const fechaCreacion = this.formatDate(usuario.createdAt);
            const ultimoLogin = this.formatDate(usuario.lastLogin);
            
            return `
                <tr>
                    <td>
                        <div class="user-info-cell">
                            ${usuario.photoURL ? 
                                `<img src="${usuario.photoURL}" alt="Avatar" class="user-avatar">` : 
                                `<div class="user-avatar-placeholder"><i class="fas fa-user"></i></div>`
                            }
                            <div>
                                <strong>${usuario.displayName}</strong>
                                <br>
                                <small style="color: #666;">${usuario.email}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="user-badge ${usuario.isAdmin ? 'user-badge--admin' : 'user-badge--user'}">
                            ${usuario.isAdmin ? 'Admin' : 'Usuario'}
                        </span>
                    </td>
                    <td>
                        <span class="user-badge ${usuario.emailVerified ? 'user-badge--verified' : 'user-badge--unverified'}">
                            ${usuario.emailVerified ? 'Verificado' : 'Sin verificar'}
                        </span>
                    </td>
                    <td>${usuario.telefono}</td>
                    <td>
                        <span class="provider-badge provider--${usuario.provider}">
                            <i class="fas fa-${this.getProviderIcon(usuario.provider)}"></i>
                            ${this.getProviderText(usuario.provider)}
                        </span>
                    </td>
                    <td>${fechaCreacion}</td>
                    <td>${ultimoLogin}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="window.baseUsuariosManager.editarUsuario('${usuario.id}')" title="Editar usuario">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn view" onclick="window.baseUsuariosManager.verDetallesUsuario('${usuario.id}')" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${!usuario.isAdmin ? `
                                <button class="action-btn delete" onclick="window.baseUsuariosManager.eliminarUsuario('${usuario.id}')" title="Eliminar usuario">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Actualizar estadísticas
    updateStats() {
        const totalUsuarios = this.usuarios.length;
        const admins = this.usuarios.filter(u => u.isAdmin).length;
        const verificados = this.usuarios.filter(u => u.emailVerified).length;
        const filtrados = this.filteredUsuarios.length;

        document.getElementById('total-usuarios')?.textContent = totalUsuarios;
        document.getElementById('usuarios-admins')?.textContent = admins;
        document.getElementById('usuarios-verificados')?.textContent = verificados;
        document.getElementById('usuarios-filtrados')?.textContent = filtrados;
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
            this.cargarBaseUsuarios(); // Recargar la lista

        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.showMessage('Error al eliminar usuario', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Exportar a CSV
    exportarCSV() {
        if (this.filteredUsuarios.length === 0) {
            this.showMessage('No hay datos para exportar', 'warning');
            return;
        }

        const headers = [
            'ID', 'Email', 'Nombre', 'Teléfono', 'Tipo', 'Email Verificado', 
            'Proveedor', 'Fecha Registro', 'Último Login', 'Dirección'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredUsuarios.map(usuario => [
                `"${usuario.id}"`,
                `"${usuario.email}"`,
                `"${usuario.displayName}"`,
                `"${usuario.telefono}"`,
                `"${usuario.isAdmin ? 'Admin' : 'Usuario'}"`,
                `"${usuario.emailVerified ? 'Sí' : 'No'}"`,
                `"${this.getProviderText(usuario.provider)}"`,
                `"${this.formatDate(usuario.createdAt)}"`,
                `"${this.formatDate(usuario.lastLogin)}"`,
                `"${usuario.direccion}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `base_usuarios_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('Base de usuarios exportada exitosamente', 'success');
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
        if (window.authManager?.showMessage) {
            window.authManager.showMessage(message, type);
        } else {
            // Fallback a alert si no está disponible
            alert(message);
        }
    }

    // Método para activar el tab - se llama cuando se selecciona el tab
    async activateTab() {
        this.initializeEventListeners();
        
        // Solo cargar datos si no los tenemos ya
        if (this.usuarios.length === 0) {
            await this.cargarBaseUsuarios();
        }
    }
}

// Crear instancia global
window.baseUsuariosManager = new BaseUsuariosManager();

export default BaseUsuariosManager;