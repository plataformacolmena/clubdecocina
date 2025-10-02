// Módulo de autenticación
import { auth, db, ADMIN_EMAIL } from './firebase-config.js';
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
    collection,
    addDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.initAuthStateListener();
        this.setupEventListeners();
    }

    initAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            
            if (user) {
                // Verificar si es administrador
                this.isAdmin = user.email === ADMIN_EMAIL;
                
                // Crear/actualizar documento de usuario
                await this.createUserDocument(user);
                
                // Crear administrador si es necesario
                if (this.isAdmin) {
                    await this.createAdminDocument(user);
                }
                
                this.updateUI(true);
            } else {
                this.isAdmin = false;
                this.updateUI(false);
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
                message = 'Usuario no encontrado';
                break;
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

    // Método para verificar si el usuario actual es admin
    isCurrentUserAdmin() {
        return this.isAdmin;
    }

    // Método para obtener el usuario actual
    getCurrentUser() {
        return this.currentUser;
    }
}

// Crear instancia global del AuthManager
window.authManager = new AuthManager();

export default AuthManager;