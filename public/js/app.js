// Archivo principal de la aplicación
import AuthManager from './auth.js';
import CursosManager from './cursos.js';
import InscripcionesManager from './inscripciones.js';
import RecetasManager from './recetas.js';
import AdminManager from './admin.js';

class App {
    constructor() {
        this.setupNavigationListeners();
        this.setupResponsiveMenu();
        this.initializeApp();
    }

    initializeApp() {
        // Los managers se inicializan automáticamente al importarse
        console.log('🎉 Club de Cocina Colmena - Aplicación iniciada');
        
        // Agregar estilos CSS adicionales dinámicamente
        this.addDynamicStyles();
    }

    setupNavigationListeners() {
        // Navegación principal
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                
                if (sectionId === 'admin' && !window.authManager?.isCurrentUserAdmin()) {
                    window.authManager?.showMessage('No tienes permisos de administrador', 'error');
                    return;
                }
                
                this.showSection(sectionId);
                this.updateActiveNavigation(sectionId);
            });
        });

        // Navegación responsiva
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav__menu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('nav__menu--active');
            });
        }
    }

    setupResponsiveMenu() {
        // Crear botón de menú para móviles si no existe
        const nav = document.querySelector('.nav');
        if (nav && !document.querySelector('.menu-toggle')) {
            const menuToggle = document.createElement('button');
            menuToggle.className = 'menu-toggle';
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            
            nav.appendChild(menuToggle);
            
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav__menu');
                navMenu.classList.toggle('nav__menu--active');
            });
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
        
        // Cargar datos específicos según la sección
        this.loadSectionData(sectionId);
    }

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'cursos':
                window.cursosManager?.loadCursos();
                break;
            case 'inscripciones':
                window.inscripcionesManager?.loadInscripciones();
                break;
            case 'recetario':
                window.recetasManager?.loadRecetas();
                break;
            case 'admin':
                if (window.authManager?.isCurrentUserAdmin()) {
                    window.adminManager?.loadAdminData();
                }
                break;
        }
    }

    updateActiveNavigation(sectionId) {
        // Remover clase activa de todos los links
        document.querySelectorAll('.nav__link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Agregar clase activa al link correspondiente
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    addDynamicStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Estilos adicionales para mejorar la experiencia */
            .hidden {
                display: none !important;
            }
            
            .no-content {
                text-align: center;
                padding: 3rem;
                color: var(--text-light);
            }
            
            .no-content i {
                font-size: 4rem;
                margin-bottom: 1rem;
                opacity: 0.5;
            }
            
            .no-content p {
                font-size: 1.1rem;
                margin-bottom: 1rem;
            }
            
            .payment-info {
                padding: 1rem 0;
            }
            
            .bank-details {
                background-color: var(--light-gray);
                padding: 1rem;
                border-radius: var(--border-radius);
                margin: 1rem 0;
            }
            
            .bank-details h3 {
                margin-bottom: 0.5rem;
                color: var(--text-dark);
            }
            
            .bank-details p {
                margin: 0.25rem 0;
                font-family: monospace;
                background-color: var(--white);
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                border: 1px solid var(--border-color);
            }
            
            .note {
                background-color: #e7f3ff;
                border: 1px solid #b8daff;
                border-radius: var(--border-radius);
                padding: 1rem;
                margin: 1rem 0;
                font-size: 0.9rem;
            }
            
            .note i {
                color: #0056b3;
                margin-right: 0.5rem;
            }
            
            .modal__content--large {
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 1rem;
            }
            
            .receta-full {
                padding: 1rem 0;
            }
            
            .receta-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .receta-title {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .curso-tag {
                background-color: var(--accent-color);
                color: var(--white);
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            
            .receta-image-full img {
                width: 100%;
                max-height: 300px;
                object-fit: cover;
                border-radius: var(--border-radius);
                margin-bottom: 2rem;
            }
            
            .receta-info-full {
                display: flex;
                justify-content: center;
                gap: 2rem;
                margin-bottom: 2rem;
                flex-wrap: wrap;
            }
            
            .receta-section {
                margin-bottom: 2rem;
            }
            
            .receta-section h3 {
                color: var(--primary-color);
                margin-bottom: 1rem;
                border-bottom: 2px solid var(--primary-color);
                padding-bottom: 0.5rem;
            }
            
            .ingredientes-list p,
            .instrucciones-list p {
                margin: 0.5rem 0;
                line-height: 1.6;
            }
            
            .tips {
                background-color: var(--light-gray);
                padding: 1rem;
                border-radius: var(--border-radius);
                border-left: 4px solid var(--accent-color);
            }
            
            .receta-image img {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: var(--border-radius);
                margin-bottom: 1rem;
            }
            
            .receta-description {
                margin-bottom: 1rem;
                color: var(--text-light);
            }
            
            .receta-info {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
            }
            
            .info-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .info-item i {
                color: var(--primary-color);
            }
            
            .receta-interactions {
                display: flex;
                gap: 0.5rem;
            }
            
            .comment-form {
                margin-bottom: 2rem;
                padding: 1rem;
                background-color: var(--light-gray);
                border-radius: var(--border-radius);
            }
            
            .comments-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .comment {
                background-color: var(--white);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: 1rem;
                margin-bottom: 1rem;
            }
            
            .comment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .comment-date {
                font-size: 0.8rem;
                color: var(--text-light);
            }
            
            .no-comments {
                text-align: center;
                color: var(--text-light);
                padding: 2rem;
            }
            
            .btn--small {
                padding: 6px 12px;
                font-size: 0.8rem;
            }
            
            .admin-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .receta-image-small img {
                width: 100%;
                height: 120px;
                object-fit: cover;
                border-radius: var(--border-radius);
                margin-bottom: 1rem;
            }
            
            .file-note {
                font-size: 0.8rem;
                color: var(--text-light);
                margin-top: 0.5rem;
            }
            
            .menu-toggle {
                display: none;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--primary-color);
                cursor: pointer;
            }
            
            /* Animaciones mejoradas */
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            /* Responsive adicional */
            @media (max-width: 768px) {
                .menu-toggle {
                    display: block;
                }
                
                .nav__menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: var(--white);
                    box-shadow: var(--shadow);
                    transform: translateY(-10px);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                
                .nav__menu--active {
                    transform: translateY(0);
                    opacity: 1;
                    visibility: visible;
                }
                
                .nav__list {
                    flex-direction: column;
                    padding: 1rem;
                }
                
                .nav__auth {
                    padding: 0 1rem 1rem;
                }
                
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .receta-info-full {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .receta-interactions {
                    flex-direction: column;
                }
                
                .modal__content--large {
                    width: 95%;
                    margin: 1rem;
                }
            }
            
            @media (max-width: 480px) {
                .card__actions {
                    flex-direction: column;
                }
                
                .card__actions .btn {
                    width: 100%;
                    justify-content: center;
                }
                
                .admin-actions {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// Exportar para uso global si es necesario
window.App = App;