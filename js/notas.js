// Módulo de gestión de notas con Kanban
import { db, auth } from './firebase-config.js';
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
    serverTimestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class NotasManager {
    constructor() {
        this.notes = [];
        this.editingNote = null;
        this.draggedNote = null;
        this.setupEventListeners();
    }

    init() {
        if (document.getElementById('notas-admin')) {
            this.loadNotes();
            this.setupDragAndDrop();
        }
    }

    setupEventListeners() {
        // Botón nueva nota
        document.getElementById('nueva-nota-btn')?.addEventListener('click', () => {
            this.showNoteModal();
        });

        // Form de nota
        document.getElementById('nota-form')?.addEventListener('submit', (e) => {
            this.handleSaveNote(e);
        });

        // Cancelar modal
        document.getElementById('cancel-nota')?.addEventListener('click', () => {
            this.hideNoteModal();
        });

        // Cerrar modal con X
        document.querySelector('#nota-modal .modal__close')?.addEventListener('click', () => {
            this.hideNoteModal();
        });

        // Limpiar completadas
        document.getElementById('limpiar-notas-btn')?.addEventListener('click', () => {
            this.clearCompletedNotes();
        });

        // Cerrar modal al hacer click fuera
        document.getElementById('nota-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'nota-modal') {
                this.hideNoteModal();
            }
        });
    }

    async loadNotes() {
        try {
            const notesRef = collection(db, 'notes');
            const notesQuery = query(notesRef, orderBy('createdAt', 'desc'));
            
            // Usar onSnapshot para actualizaciones en tiempo real
            onSnapshot(notesQuery, (snapshot) => {
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                this.renderKanbanBoard();
                this.updateCounters();
            });

        } catch (error) {
            console.error('Error cargando notas:', error);
            window.authManager?.showMessage('Error al cargar las notas', 'error');
        }
    }

    renderKanbanBoard() {
        const todoCards = document.getElementById('kanban-todo');
        const doingCards = document.getElementById('kanban-doing');
        const doneCards = document.getElementById('kanban-done');

        if (!todoCards || !doingCards || !doneCards) return;

        // Limpiar columnas
        todoCards.innerHTML = '';
        doingCards.innerHTML = '';
        doneCards.innerHTML = '';

        // Separar notas por estado
        const notesByStatus = {
            todo: this.notes.filter(note => note.status === 'todo'),
            doing: this.notes.filter(note => note.status === 'doing'),
            done: this.notes.filter(note => note.status === 'done')
        };

        // Renderizar cada columna
        this.renderColumn(todoCards, notesByStatus.todo, 'todo');
        this.renderColumn(doingCards, notesByStatus.doing, 'doing');
        this.renderColumn(doneCards, notesByStatus.done, 'done');
    }

    renderColumn(container, notes, status) {
        if (notes.length === 0) {
            container.innerHTML = `
                <div class="kanban-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No hay notas aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => this.createNoteCard(note)).join('');
        
        // Agregar event listeners a los botones de acción
        container.querySelectorAll('.note-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.dataset.noteId;
                const action = btn.dataset.action;

                if (action === 'edit') {
                    this.editNote(noteId);
                } else if (action === 'delete') {
                    this.deleteNote(noteId);
                }
            });
        });
    }

    createNoteCard(note) {
        const createdDate = note.createdAt?.toDate ? 
            note.createdAt.toDate().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) :
            'N/A';

        const dueDate = note.dueDate ? 
            new Date(note.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) :
            null;

        const isOverdue = note.dueDate && new Date(note.dueDate) < new Date() && note.status !== 'done';
        
        const authorInitial = note.createdByName ? note.createdByName.charAt(0).toUpperCase() : 'U';

        return `
            <div class="note-card prioridad-${note.prioridad}" 
                 draggable="true" 
                 data-note-id="${note.id}"
                 data-status="${note.status}">
                <div class="note-header">
                    <h5 class="note-title">${note.titulo}</h5>
                    <div class="note-actions">
                        <button class="note-action-btn edit" data-note-id="${note.id}" data-action="edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-action-btn delete" data-note-id="${note.id}" data-action="delete" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                ${note.descripcion ? `<div class="note-description">${note.descripcion}</div>` : ''}
                
                <div class="note-meta">
                    <span class="note-priority ${note.prioridad}">
                        ${note.prioridad === 'alta' ? '🔴' : note.prioridad === 'media' ? '🟡' : '🟢'} 
                        ${note.prioridad.charAt(0).toUpperCase() + note.prioridad.slice(1)}
                    </span>
                    
                    <div class="note-date">
                        <i class="fas fa-calendar"></i>
                        <span>${createdDate}</span>
                        ${dueDate ? `
                            <span class="${isOverdue ? 'note-due-date' : ''}" title="Fecha límite">
                                | ${dueDate} ${isOverdue ? '⚠️' : ''}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="note-author">
                    <div class="note-avatar">${authorInitial}</div>
                    <span>${note.createdByName || 'Usuario'}</span>
                </div>
            </div>
        `;
    }

    updateCounters() {
        const counts = {
            todo: this.notes.filter(n => n.status === 'todo').length,
            doing: this.notes.filter(n => n.status === 'doing').length,
            done: this.notes.filter(n => n.status === 'done').length
        };

        document.getElementById('todo-count').textContent = counts.todo;
        document.getElementById('doing-count').textContent = counts.doing;
        document.getElementById('done-count').textContent = counts.done;
    }

    setupDragAndDrop() {
        // Event listeners para drag and drop
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('note-card')) {
                this.draggedNote = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('note-card')) {
                e.target.classList.remove('dragging');
                this.draggedNote = null;
            }
        });

        // Configurar drop zones (columnas kanban)
        document.querySelectorAll('.kanban-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                if (!column.contains(e.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedNote) {
                    const newStatus = column.dataset.status;
                    const noteId = this.draggedNote.dataset.noteId;
                    const currentStatus = this.draggedNote.dataset.status;

                    if (newStatus !== currentStatus) {
                        this.updateNoteStatus(noteId, newStatus);
                    }
                }
            });
        });
    }

    async updateNoteStatus(noteId, newStatus) {
        try {
            const noteRef = doc(db, 'notes', noteId);
            await updateDoc(noteRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            // Crear log de actividad
            await this.logActivity(`Nota "${this.notes.find(n => n.id === noteId)?.titulo}" movida a ${this.getStatusLabel(newStatus)}`);

            window.authManager?.showMessage(`Nota movida a ${this.getStatusLabel(newStatus)}`, 'success');

        } catch (error) {
            console.error('Error actualizando estado de nota:', error);
            window.authManager?.showMessage('Error al mover la nota', 'error');
        }
    }

    getStatusLabel(status) {
        const labels = {
            todo: 'Por Hacer',
            doing: 'En Progreso', 
            done: 'Completado'
        };
        return labels[status] || status;
    }

    showNoteModal(note = null) {
        this.editingNote = note;
        const modal = document.getElementById('nota-modal');
        const form = document.getElementById('nota-form');
        const title = document.getElementById('nota-modal-title');
        const submitText = document.getElementById('nota-submit-text');
        const statusField = document.getElementById('nota-estado');

        // Resetear formulario
        form.reset();

        if (note) {
            // Modo edición
            title.textContent = 'Editar Nota';
            submitText.textContent = 'Guardar Cambios';
            if (statusField) statusField.style.display = 'block';

            document.getElementById('nota-titulo').value = note.titulo;
            document.getElementById('nota-descripcion').value = note.descripcion || '';
            document.getElementById('nota-prioridad').value = note.prioridad;
            document.getElementById('nota-estado').value = note.status;
            
            if (note.dueDate) {
                document.getElementById('nota-fecha-vencimiento').value = new Date(note.dueDate).toISOString().split('T')[0];
            }
        } else {
            // Modo creación
            title.textContent = 'Nueva Nota';
            submitText.textContent = 'Crear Nota';
            if (statusField) statusField.style.display = 'none';
        }

        modal.classList.add('active');
        document.getElementById('nota-titulo').focus();
    }

    hideNoteModal() {
        const modal = document.getElementById('nota-modal');
        modal.classList.remove('active');
        this.editingNote = null;
    }

    async handleSaveNote(e) {
        e.preventDefault();
        
        const formData = {
            titulo: document.getElementById('nota-titulo').value.trim(),
            descripcion: document.getElementById('nota-descripcion').value.trim(),
            prioridad: document.getElementById('nota-prioridad').value,
            dueDate: document.getElementById('nota-fecha-vencimiento').value || null
        };

        if (!formData.titulo) {
            window.authManager?.showMessage('El título es obligatorio', 'error');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                window.authManager?.showMessage('No estás autenticado', 'error');
                return;
            }

            if (this.editingNote) {
                // Actualizar nota existente
                const noteRef = doc(db, 'notes', this.editingNote.id);
                const updateData = {
                    ...formData,
                    status: document.getElementById('nota-estado').value,
                    updatedAt: serverTimestamp()
                };

                await updateDoc(noteRef, updateData);
                await this.logActivity(`Nota "${formData.titulo}" actualizada`);
                window.authManager?.showMessage('Nota actualizada exitosamente', 'success');

            } else {
                // Crear nueva nota
                const notesRef = collection(db, 'notes');
                const newNote = {
                    ...formData,
                    status: 'todo',
                    createdBy: user.uid,
                    createdByName: user.displayName || user.email,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                await addDoc(notesRef, newNote);
                await this.logActivity(`Nueva nota "${formData.titulo}" creada`);
                window.authManager?.showMessage('Nota creada exitosamente', 'success');
            }

            this.hideNoteModal();

        } catch (error) {
            console.error('Error guardando nota:', error);
            window.authManager?.showMessage('Error al guardar la nota', 'error');
        }
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.showNoteModal(note);
        }
    }

    async deleteNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const confirmed = confirm(`¿Estás seguro de que quieres eliminar la nota "${note.titulo}"?`);
        if (!confirmed) return;

        try {
            const noteRef = doc(db, 'notes', noteId);
            await deleteDoc(noteRef);
            
            await this.logActivity(`Nota "${note.titulo}" eliminada`);
            window.authManager?.showMessage('Nota eliminada exitosamente', 'success');

        } catch (error) {
            console.error('Error eliminando nota:', error);
            window.authManager?.showMessage('Error al eliminar la nota', 'error');
        }
    }

    async clearCompletedNotes() {
        const completedNotes = this.notes.filter(n => n.status === 'done');
        
        if (completedNotes.length === 0) {
            window.authManager?.showMessage('No hay notas completadas para limpiar', 'info');
            return;
        }

        const confirmed = confirm(`¿Estás seguro de que quieres eliminar ${completedNotes.length} notas completadas?`);
        if (!confirmed) return;

        try {
            const deletePromises = completedNotes.map(note => {
                const noteRef = doc(db, 'notes', note.id);
                return deleteDoc(noteRef);
            });

            await Promise.all(deletePromises);
            await this.logActivity(`${completedNotes.length} notas completadas eliminadas`);
            window.authManager?.showMessage(`${completedNotes.length} notas completadas eliminadas`, 'success');

        } catch (error) {
            console.error('Error limpiando notas completadas:', error);
            window.authManager?.showMessage('Error al limpiar notas completadas', 'error');
        }
    }

    async logActivity(message) {
        try {
            // Usar el sistema centralizado de logging
            await systemLogger.logNotes('note_action', { 
                message: message,
                userId: auth.currentUser?.uid,
                userName: auth.currentUser?.displayName || auth.currentUser?.email
            });
        } catch (error) {
            console.error('Error registrando actividad:', error);
        }
    }
}

// Crear instancia global
window.notasManager = new NotasManager();

export default NotasManager;