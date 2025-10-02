// Módulo de gestión de recetas
import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
    where,
    arrayUnion,
    arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class RecetasManager {
    constructor() {
        this.recetas = [];
        this.comentarios = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navegación a recetario
        document.querySelector('a[href="#recetario"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadRecetas();
            window.authManager.showSection('recetario');
        });

        // Filtros de búsqueda
        document.getElementById('search-recetas')?.addEventListener('input', (e) => {
            this.filterRecetas(e.target.value);
        });
        
        document.getElementById('filter-curso')?.addEventListener('change', (e) => {
            this.filterByCurso(e.target.value);
        });
    }

    async loadRecetas() {
        try {
            window.authManager.showLoading();
            
            const q = query(
                collection(db, 'recetas'),
                orderBy('fechaCreacion', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.recetas = [];
            
            querySnapshot.forEach((doc) => {
                this.recetas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            await this.loadComentarios();
            this.renderRecetas();
            this.updateCursoFilter();
            
        } catch (error) {
            console.error('Error loading recetas:', error);
            window.authManager.showMessage('Error al cargar las recetas', 'error');
        } finally {
            window.authManager.hideLoading();
        }
    }

    async loadComentarios() {
        try {
            const querySnapshot = await getDocs(collection(db, 'comentarios'));
            this.comentarios = [];
            
            querySnapshot.forEach((doc) => {
                this.comentarios.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
        } catch (error) {
            console.error('Error loading comentarios:', error);
        }
    }

    renderRecetas(recetasToRender = this.recetas) {
        const recetasGrid = document.getElementById('recetas-grid');
        if (!recetasGrid) return;

        if (recetasToRender.length === 0) {
            recetasGrid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-book-open"></i>
                    <p>No hay recetas disponibles</p>
                </div>
            `;
            return;
        }

        recetasGrid.innerHTML = recetasToRender.map(receta => this.createRecetaCard(receta)).join('');
        
        // Agregar event listeners
        this.setupRecetaEventListeners();
    }

    createRecetaCard(receta) {
        const likes = receta.likes ? receta.likes.length : 0;
        const userLiked = receta.likes ? receta.likes.includes(window.authManager.getCurrentUser()?.uid) : false;
        const comentariosReceta = this.comentarios.filter(c => c.recetaId === receta.id);

        return `
            <div class="card receta-card">
                <div class="card__header">
                    <h3 class="card__title">${receta.nombre}</h3>
                    <div class="receta-meta">
                        <span class="curso-tag">${receta.cursoNombre || 'Curso General'}</span>
                    </div>
                </div>
                ${receta.imagenUrl ? `
                    <div class="receta-image">
                        <img src="${receta.imagenUrl}" alt="${receta.nombre}" loading="lazy">
                    </div>
                ` : ''}
                <div class="card__content">
                    ${receta.descripcion ? `
                        <p class="receta-description">${receta.descripcion}</p>
                    ` : ''}
                    
                    <div class="receta-info">
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>${receta.tiempoPreparacion || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${receta.porciones || 'N/A'} porciones</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-signal"></i>
                            <span>${receta.dificultad || 'Media'}</span>
                        </div>
                    </div>
                </div>
                <div class="card__actions">
                    <button class="btn btn--outline ver-receta-btn" data-receta-id="${receta.id}">
                        <i class="fas fa-eye"></i>
                        Ver Receta
                    </button>
                    <div class="receta-interactions">
                        <button class="btn ${userLiked ? 'btn--primary' : 'btn--outline'} like-btn" 
                                data-receta-id="${receta.id}">
                            <i class="fas fa-heart"></i>
                            <span>${likes}</span>
                        </button>
                        <button class="btn btn--outline comment-btn" data-receta-id="${receta.id}">
                            <i class="fas fa-comment"></i>
                            <span>${comentariosReceta.length}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupRecetaEventListeners() {
        // Botones de ver receta
        document.querySelectorAll('.ver-receta-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recetaId = e.target.dataset.recetaId;
                this.showRecetaModal(recetaId);
            });
        });

        // Botones de like
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recetaId = e.target.dataset.recetaId;
                this.toggleLike(recetaId);
            });
        });

        // Botones de comentario
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recetaId = e.target.dataset.recetaId;
                this.showCommentsModal(recetaId);
            });
        });
    }

    showRecetaModal(recetaId) {
        const receta = this.recetas.find(r => r.id === recetaId);
        if (!receta) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content modal__content--large">
                <span class="modal__close">&times;</span>
                <div class="receta-full">
                    <div class="receta-header">
                        <h2 class="receta-title">${receta.nombre}</h2>
                        <div class="receta-meta">
                            <span class="curso-tag">${receta.cursoNombre || 'Curso General'}</span>
                        </div>
                    </div>
                    
                    ${receta.imagenUrl ? `
                        <div class="receta-image-full">
                            <img src="${receta.imagenUrl}" alt="${receta.nombre}">
                        </div>
                    ` : ''}
                    
                    <div class="receta-content">
                        <div class="receta-info-full">
                            <div class="info-item">
                                <i class="fas fa-clock"></i>
                                <span><strong>Tiempo:</strong> ${receta.tiempoPreparacion || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-users"></i>
                                <span><strong>Porciones:</strong> ${receta.porciones || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-signal"></i>
                                <span><strong>Dificultad:</strong> ${receta.dificultad || 'Media'}</span>
                            </div>
                        </div>
                        
                        ${receta.descripcion ? `
                            <div class="receta-section">
                                <h3>Descripción</h3>
                                <p>${receta.descripcion}</p>
                            </div>
                        ` : ''}
                        
                        ${receta.ingredientes ? `
                            <div class="receta-section">
                                <h3>Ingredientes</h3>
                                <div class="ingredientes-list">
                                    ${receta.ingredientes.split('\n').map(ing => `<p>• ${ing}</p>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${receta.instrucciones ? `
                            <div class="receta-section">
                                <h3>Instrucciones</h3>
                                <div class="instrucciones-list">
                                    ${receta.instrucciones.split('\n').map((inst, index) => 
                                        `<p><strong>${index + 1}.</strong> ${inst}</p>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${receta.tips ? `
                            <div class="receta-section">
                                <h3>Tips</h3>
                                <p class="tips">${receta.tips}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showCommentsModal(recetaId) {
        const receta = this.recetas.find(r => r.id === recetaId);
        const comentariosReceta = this.comentarios.filter(c => c.recetaId === recetaId);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal__content">
                <span class="modal__close">&times;</span>
                <h2 class="modal__title">Comentarios - ${receta.nombre}</h2>
                
                <form id="add-comment-form" class="form comment-form">
                    <div class="form__group">
                        <textarea id="comment-text" 
                                  class="input" 
                                  rows="3" 
                                  placeholder="Escribe tu comentario sobre esta receta..."
                                  required></textarea>
                    </div>
                    <button type="submit" class="btn btn--primary">
                        <i class="fas fa-comment"></i>
                        Agregar Comentario
                    </button>
                </form>
                
                <div class="comments-list">
                    ${comentariosReceta.length === 0 ? `
                        <p class="no-comments">No hay comentarios aún. ¡Sé el primero en comentar!</p>
                    ` : comentariosReceta.map(comment => this.createCommentHTML(comment)).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        const form = modal.querySelector('#add-comment-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addComment(recetaId, modal);
        });

        modal.querySelector('.modal__close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    createCommentHTML(comment) {
        const fecha = new Date(comment.fecha.seconds * 1000).toLocaleDateString('es-AR');
        
        return `
            <div class="comment">
                <div class="comment-header">
                    <strong>${comment.usuarioNombre}</strong>
                    <span class="comment-date">${fecha}</span>
                </div>
                <div class="comment-content">
                    <p>${comment.texto}</p>
                </div>
            </div>
        `;
    }

    async addComment(recetaId, modal) {
        if (!window.authManager.getCurrentUser()) {
            window.authManager.showMessage('Debes iniciar sesión para comentar', 'error');
            return;
        }

        const commentText = modal.querySelector('#comment-text').value.trim();
        if (!commentText) return;

        try {
            const comentarioData = {
                recetaId: recetaId,
                usuarioId: window.authManager.getCurrentUser().uid,
                usuarioNombre: window.authManager.getCurrentUser().displayName || window.authManager.getCurrentUser().email,
                texto: commentText,
                fecha: new Date()
            };

            await addDoc(collection(db, 'comentarios'), comentarioData);
            
            modal.remove();
            window.authManager.showMessage('Comentario agregado', 'success');
            
            // Recargar comentarios y recetas
            await this.loadComentarios();
            this.renderRecetas();

        } catch (error) {
            console.error('Error adding comment:', error);
            window.authManager.showMessage('Error al agregar comentario', 'error');
        }
    }

    async toggleLike(recetaId) {
        if (!window.authManager.getCurrentUser()) {
            window.authManager.showMessage('Debes iniciar sesión para dar like', 'error');
            return;
        }

        try {
            const receta = this.recetas.find(r => r.id === recetaId);
            const userId = window.authManager.getCurrentUser().uid;
            const userLiked = receta.likes ? receta.likes.includes(userId) : false;
            
            const recetaRef = doc(db, 'recetas', recetaId);
            
            if (userLiked) {
                // Quitar like
                await updateDoc(recetaRef, {
                    likes: arrayRemove(userId)
                });
            } else {
                // Agregar like
                await updateDoc(recetaRef, {
                    likes: arrayUnion(userId)
                });
            }
            
            // Actualizar en memoria
            if (userLiked) {
                receta.likes = receta.likes.filter(id => id !== userId);
            } else {
                if (!receta.likes) receta.likes = [];
                receta.likes.push(userId);
            }
            
            // Re-renderizar solo esta receta
            this.renderRecetas();

        } catch (error) {
            console.error('Error toggling like:', error);
            window.authManager.showMessage('Error al procesar like', 'error');
        }
    }

    filterRecetas(searchTerm) {
        const filtered = this.recetas.filter(receta =>
            receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            receta.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            receta.ingredientes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderRecetas(filtered);
    }

    filterByCurso(cursoNombre) {
        if (!cursoNombre) {
            this.renderRecetas();
            return;
        }

        const filtered = this.recetas.filter(receta =>
            receta.cursoNombre === cursoNombre
        );
        this.renderRecetas(filtered);
    }

    updateCursoFilter() {
        const cursoFilter = document.getElementById('filter-curso');
        if (!cursoFilter) return;

        // Obtener nombres de cursos únicos
        const cursos = [...new Set(this.recetas.map(receta => receta.cursoNombre).filter(Boolean))];

        // Limpiar y agregar opciones
        cursoFilter.innerHTML = '<option value="">Todos los cursos</option>';
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso;
            option.textContent = curso;
            cursoFilter.appendChild(option);
        });
    }

    // Método para obtener receta por ID (usado por otros módulos)
    getRecetaById(recetaId) {
        return this.recetas.find(receta => receta.id === recetaId);
    }
}

// Crear instancia global del RecetasManager
window.recetasManager = new RecetasManager();

export default RecetasManager;