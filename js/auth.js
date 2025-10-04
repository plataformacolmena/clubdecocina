// Módulo de autenticación
import { auth, db, APP_CONFIG } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    addDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Gestor de administradores dinámico con Firestore
class AdminManager {
    constructor() {
        this.adminCache = new Map();
        this.cacheExpiry = APP_CONFIG.adminSystem.cacheExpiry;
    }



    // Verificar si un usuario es administrador (solo Firestore)
    async isUserAdmin(userEmail) {
        if (!userEmail) return false;

        try {
            // Verificar cache primero
            const cached = this.adminCache.get(userEmail);
            if (cached && Date.now() < cached.expiry) {
                return cached.isAdmin;
            }

            // Consultar Firestore
            const isAdmin = await this.checkFirestoreAdmin(userEmail);
            
            // Actualizar cache
            this.adminCache.set(userEmail, {
                isAdmin,
                expiry: Date.now() + this.cacheExpiry
            });

            return isAdmin;

        } catch (error) {
            console.error('❌ Error verificando admin:', error);
            return false; // Por seguridad, denegar acceso si falla Firestore
        }
    }

    // Verificar en Firestore (método interno)
    async checkFirestoreAdmin(userEmail) {
        try {
            const adminDoc = await getDoc(doc(db, APP_CONFIG.adminSystem.collection, userEmail));
            
            if (!adminDoc.exists()) {
                return false;
            }
            
            const adminData = adminDoc.data();
            return adminData.active === true && adminData.role === 'admin';
            
        } catch (error) {
            console.error('Error consultando Firestore admin:', error);
            throw error;
        }
    }

    // Agregar nuevo administrador
    async addAdmin(newAdminEmail, createdByEmail) {
        try {
            const adminDoc = doc(db, APP_CONFIG.adminSystem.collection, newAdminEmail);
            
            await setDoc(adminDoc, {
                email: newAdminEmail,
                role: 'admin',
                active: true,
                createdAt: serverTimestamp(),
                createdBy: createdByEmail,
                permissions: ['all'],
                lastLogin: null
            });

            // Limpiar cache para forzar actualización
            this.adminCache.delete(newAdminEmail);
            
            // Log de seguridad
            await this.logAdminAction('add_admin', createdByEmail, { newAdmin: newAdminEmail });
            
            return { success: true, message: 'Administrador agregado exitosamente' };
            
        } catch (error) {
            console.error('Error agregando administrador:', error);
            return { success: false, message: 'Error agregando administrador: ' + error.message };
        }
    }

    // Desactivar administrador (no eliminar para auditoría)
    async deactivateAdmin(adminEmail, deactivatedByEmail) {
        try {
            // Prevenir auto-desactivación del último admin
            const activeAdmins = await this.getActiveAdmins();
            if (activeAdmins.length <= 1 && activeAdmins[0]?.email === adminEmail) {
                return { success: false, message: 'No se puede desactivar el último administrador' };
            }

            const adminDoc = doc(db, APP_CONFIG.adminSystem.collection, adminEmail);
            
            await updateDoc(adminDoc, {
                active: false,
                deactivatedAt: serverTimestamp(),
                deactivatedBy: deactivatedByEmail
            });

            // Limpiar cache
            this.adminCache.delete(adminEmail);
            
            // Log de seguridad
            await this.logAdminAction('deactivate_admin', deactivatedByEmail, { deactivatedAdmin: adminEmail });
            
            return { success: true, message: 'Administrador desactivado exitosamente' };
            
        } catch (error) {
            console.error('Error desactivando administrador:', error);
            return { success: false, message: 'Error desactivando administrador: ' + error.message };
        }
    }

    // Obtener lista de administradores activos (solo para otros admins)
    async getActiveAdmins() {
        try {
            // Consulta simplificada para evitar índice compuesto
            const adminsQuery = query(
                collection(db, APP_CONFIG.adminSystem.collection),
                where('active', '==', true)
            );
            
            const querySnapshot = await getDocs(adminsQuery);
            const admins = [];
            
            querySnapshot.forEach((doc) => {
                admins.push({ id: doc.id, ...doc.data() });
            });
            
            // Ordenar en memoria por fecha de creación
            admins.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
            
            return admins;
            
        } catch (error) {
            console.error('Error obteniendo administradores:', error);
            return [];
        }
    }

    // Registrar acciones de administración para auditoría
    async logAdminAction(action, performedBy, details = {}) {
        try {
            await addDoc(collection(db, 'admin_security_logs'), {
                action: action,
                performedBy: performedBy,
                details: details,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                ip: null // Se podría obtener del cliente si es necesario
            });
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    // Limpiar cache (útil para pruebas o actualizaciones forzadas)
    clearCache() {
        this.adminCache.clear();
        console.log('🧹 Cache de administradores limpiado');
    }

    // Obtener estadísticas del cache (para debugging)
    getCacheStats() {
        const now = Date.now();
        const entries = Array.from(this.adminCache.entries());
        
        return {
            total: entries.length,
            expired: entries.filter(([, data]) => now >= data.expiry).length,
            valid: entries.filter(([, data]) => now < data.expiry).length
        };
    }
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.userData = null;
        this.adminManager = new AdminManager();
        
        // Mostrar loading inmediatamente al inicializar
        this.showLoading();
        
        this.initAuthStateListener();
        this.setupEventListeners();
    }

    initAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            // Mostrar loading durante verificación de estado
            this.showLoading();
            
            try {
                this.currentUser = user;
                
                if (user) {
                    // Verificar si es administrador usando Firestore
                    this.isAdmin = await this.adminManager.isUserAdmin(user.email);
                    
                    // Crear/actualizar documento de usuario
                    await this.createUserDocument(user);
                    
                    // Actualizar último login si es admin
                    if (this.isAdmin) {
                        await this.updateAdminLastLogin(user.email);
                    }
                    
                    this.updateUI(true);
                } else {
                    this.isAdmin = false;
                    this.updateUI(false);
                }
            } catch (error) {
                console.error('Error en verificación de estado de autenticación:', error);
                // En caso de error, mostrar como no logueado
                this.isAdmin = false;
                this.updateUI(false);
            } finally {
                // Ocultar loading al completar verificación (siempre)
                this.hideLoading();
            }
        });
    }

    setupEventListeners() {
        // Botones de login/registro
        document.getElementById('login-btn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('home-login-btn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('home-register-btn')?.addEventListener('click', () => this.showRegisterModal());
        
        // Botón de logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        
        // Formularios
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Autenticación social
        document.getElementById('google-login')?.addEventListener('click', () => this.loginWithGoogle());
        document.getElementById('google-register')?.addEventListener('click', () => this.loginWithGoogle());
        document.getElementById('microsoft-login')?.addEventListener('click', () => this.loginWithMicrosoft());
        document.getElementById('microsoft-register')?.addEventListener('click', () => this.loginWithMicrosoft());
        
        // Enlaces para cambiar entre login y registro
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideLoginModal();
            this.showRegisterModal();
        });
        
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideRegisterModal();
            this.showLoginModal();
        });
        
        // Cerrar modales
        document.querySelectorAll('.modal__close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideAllModals());
        });
        
        // Cerrar modal al hacer click fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            this.showLoading();
            await signInWithEmailAndPassword(auth, email, password);
            this.hideLoginModal();
            this.showMessage('¡Bienvenido de vuelta!', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Actualizar perfil del usuario
            await updateProfile(userCredential.user, {
                displayName: name
            });
            
            // Crear documento de usuario con información adicional
            await this.createUserDocument(userCredential.user, { phone });
            
            this.hideRegisterModal();
            this.showMessage('¡Cuenta creada exitosamente!', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        
        try {
            this.showLoading();
            await signInWithPopup(auth, provider);
            this.hideAllModals();
            this.showMessage('¡Autenticación exitosa con Google!', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async loginWithMicrosoft() {
        const provider = new OAuthProvider('microsoft.com');
        
        try {
            this.showLoading();
            await signInWithPopup(auth, provider);
            this.hideAllModals();
            this.showMessage('¡Autenticación exitosa con Microsoft!', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.showMessage('Sesión cerrada correctamente', 'success');
        } catch (error) {
            this.showMessage('Error al cerrar sesión', 'error');
        }
    }

    async createUserDocument(user, additionalData = {}) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                createdAt: new Date(),
                ...additionalData
            };
            
            await setDoc(userRef, userData);
        }
    }

    async createAdminDocument(user) {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        
        if (!adminSnap.exists()) {
            const adminData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Administrador',
                createdAt: new Date()
            };
            
            await setDoc(adminRef, adminData);
        }
    }

    updateUI(isLoggedIn) {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const userSections = document.querySelectorAll('.user-section');
        const adminSections = document.querySelectorAll('.admin-section');
        
        if (isLoggedIn) {
            loginBtn?.classList.add('hidden');
            userMenu?.classList.remove('hidden');
            userName.textContent = this.currentUser?.displayName || this.currentUser?.email || 'Usuario';
            
            // Mostrar secciones de usuario
            userSections.forEach(section => {
                section.style.display = 'block';
            });
            
            // Mostrar secciones de admin si es administrador
            adminSections.forEach(section => {
                section.style.display = this.isAdmin ? 'block' : 'none';
            });
            
            // Ocultar la sección home y mostrar cursos por defecto
            this.showSection('cursos');
        } else {
            loginBtn?.classList.remove('hidden');
            userMenu?.classList.add('hidden');
            
            // Ocultar todas las secciones de usuario
            userSections.forEach(section => {
                section.style.display = 'none';
            });
            
            adminSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Mostrar solo la sección home
            this.showSection('home');
        }
    }

    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar la sección solicitada
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav__link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    showLoginModal() {
        document.getElementById('login-modal').classList.add('active');
    }

    hideLoginModal() {
        document.getElementById('login-modal').classList.remove('active');
    }

    showRegisterModal() {
        document.getElementById('register-modal').classList.add('active');
    }

    hideRegisterModal() {
        document.getElementById('register-modal').classList.remove('active');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showMessage(message, type = 'info') {
        // Crear elemento de mensaje
        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.textContent = message;
        
        // Estilos del mensaje
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '4000',
            animation: 'slideInRight 0.3s ease'
        });
        
        // Color según el tipo
        if (type === 'success') {
            messageEl.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            messageEl.style.backgroundColor = '#dc3545';
        } else {
            messageEl.style.backgroundColor = '#17a2b8';
        }
        
        document.body.appendChild(messageEl);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    handleAuthError(error) {
        let message = 'Error de autenticación';
        
        switch (error.code) {
            case 'auth/user-not-found':
                this.handleUserNotFound();
                return; // No mostrar mensaje genérico
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta';
                break;
            case 'auth/email-already-in-use':
                message = 'El email ya está en uso';
                break;
            case 'auth/weak-password':
                message = 'La contraseña debe tener al menos 6 caracteres';
                break;
            case 'auth/invalid-email':
                message = 'Email inválido';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Autenticación cancelada';
                break;
            default:
                message = error.message;
        }
        
        this.showMessage(message, 'error');
    }

    // Manejar caso específico de usuario no encontrado
    handleUserNotFound() {
        // Mostrar mensaje amigable con opción de registro
        this.showMessage('📧 Este email no está registrado. Te abriremos el formulario de registro...', 'info');
        
        // Cerrar modal de login y abrir registro después de mostrar el mensaje
        setTimeout(() => {
            this.hideLoginModal();
            
            // Esperar un momento antes de abrir el registro para mejor UX
            setTimeout(() => {
                this.showRegisterModal();
                
                // Pre-llenar el email en el formulario de registro
                const loginEmail = document.getElementById('login-email').value;
                if (loginEmail) {
                    const registerEmailField = document.getElementById('register-email');
                    if (registerEmailField) {
                        registerEmailField.value = loginEmail;
                        // Mostrar mensaje adicional en el registro
                        this.showMessage('✨ Email pre-completado. Solo completa los demás campos', 'success');
                    }
                }
            }, 300);
        }, 2500);
    }

    // Método para verificar si el usuario actual es admin
    isCurrentUserAdmin() {
        return this.isAdmin;
    }

    // Actualizar último login del administrador
    async updateAdminLastLogin(userEmail) {
        try {
            const adminDoc = doc(db, APP_CONFIG.adminSystem.collection, userEmail);
            await updateDoc(adminDoc, {
                lastLogin: serverTimestamp()
            });
        } catch (error) {
            console.log('Error actualizando último login admin:', error);
            // No es crítico, continuar sin error
        }
    }

    // Método público para verificar admin (compatible con código existente)
    async checkAdminStatus(userEmail = null) {
        const emailToCheck = userEmail || this.currentUser?.email;
        if (!emailToCheck) return false;
        
        return await this.adminManager.isUserAdmin(emailToCheck);
    }

    // Métodos públicos para gestión de administradores (solo para admins)
    async addNewAdmin(newAdminEmail) {
        if (!this.isAdmin) {
            throw new Error('Solo administradores pueden agregar nuevos administradores');
        }
        
        return await this.adminManager.addAdmin(newAdminEmail, this.currentUser.email);
    }

    async removeAdmin(adminEmail) {
        if (!this.isAdmin) {
            throw new Error('Solo administradores pueden remover administradores');
        }
        
        if (adminEmail === this.currentUser.email) {
            throw new Error('No puedes removerte a ti mismo como administrador');
        }
        
        return await this.adminManager.deactivateAdmin(adminEmail, this.currentUser.email);
    }

    async getAdminList() {
        if (!this.isAdmin) {
            throw new Error('Solo administradores pueden ver la lista de administradores');
        }
        
        return await this.adminManager.getActiveAdmins();
    }

    // Limpiar cache de administradores (para debugging)
    clearAdminCache() {
        if (this.isAdmin) {
            this.adminManager.clearCache();
        }
    }

    // Método para obtener el usuario actual
    getCurrentUser() {
        return this.currentUser;
    }
}

// Crear instancia global del AuthManager
window.authManager = new AuthManager();

export default AuthManager;