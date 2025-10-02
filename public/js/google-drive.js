// Módulo para Google Drive API - Alternativa a Firebase Storage
import { GOOGLE_DRIVE_CONFIG } from './firebase-config.js';

class GoogleDriveManager {
    constructor() {
        this.apiKey = GOOGLE_DRIVE_CONFIG.apiKey;
        this.folderId = GOOGLE_DRIVE_CONFIG.folderId;
        this.folders = GOOGLE_DRIVE_CONFIG.folders;
        this.isInitialized = false;
        this.initializeGoogleAPI();
    }

    async initializeGoogleAPI() {
        try {
            // Cargar Google API dinámicamente
            await this.loadScript('https://apis.google.com/js/api.js');
            
            // Inicializar Google API
            await new Promise((resolve) => {
                gapi.load('client', resolve);
            });

            await gapi.client.init({
                apiKey: this.apiKey,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            });

            this.isInitialized = true;
            console.log('✅ Google Drive API inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Google Drive API:', error);
            this.isInitialized = false;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async uploadFile(file, folder = 'general', fileName = null) {
        if (!this.isInitialized) {
            throw new Error('Google Drive API no está inicializada');
        }

        try {
            // Determinar carpeta de destino
            const folderId = this.folders[folder] || this.folderId;
            
            // Generar nombre único si no se proporciona
            const finalFileName = fileName || `${Date.now()}_${file.name}`;

            // Mostrar modal de progreso
            this.showUploadProgress();

            // Crear metadata del archivo
            const metadata = {
                name: finalFileName,
                parents: [folderId]
            };

            // Convertir archivo a base64
            const base64Data = await this.fileToBase64(file);
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            let body = delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                base64Data +
                close_delim;

            // Subir archivo
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: body
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            // Hacer el archivo público y obtener enlace
            await this.makeFilePublic(result.id);
            const publicUrl = this.getPublicUrl(result.id);

            this.hideUploadProgress();

            return {
                id: result.id,
                name: result.name,
                url: publicUrl,
                webViewLink: `https://drive.google.com/file/d/${result.id}/view`
            };

        } catch (error) {
            this.hideUploadProgress();
            console.error('Error uploading to Google Drive:', error);
            throw error;
        }
    }

    async makeFilePublic(fileId) {
        try {
            await gapi.client.drive.permissions.create({
                fileId: fileId,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        } catch (error) {
            console.warn('No se pudo hacer público el archivo:', error);
        }
    }

    getPublicUrl(fileId) {
        return `https://drive.google.com/uc?id=${fileId}&export=download`;
    }

    async deleteFile(fileId) {
        if (!this.isInitialized) {
            throw new Error('Google Drive API no está inicializada');
        }

        try {
            await gapi.client.drive.files.delete({
                fileId: fileId
            });
            return true;
        } catch (error) {
            console.error('Error deleting file from Google Drive:', error);
            throw error;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remover el prefijo "data:...;base64,"
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    showUploadProgress() {
        // Crear modal de progreso si no existe
        let progressModal = document.getElementById('upload-progress-modal');
        
        if (!progressModal) {
            progressModal = document.createElement('div');
            progressModal.id = 'upload-progress-modal';
            progressModal.className = 'modal active';
            progressModal.innerHTML = `
                <div class="modal__content">
                    <h3>Subiendo archivo a Google Drive</h3>
                    <div class="upload-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <p>Por favor espera mientras se sube el archivo...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(progressModal);

            // Agregar estilos para la barra de progreso
            const style = document.createElement('style');
            style.textContent = `
                .upload-progress {
                    text-align: center;
                    padding: 2rem 0;
                }
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 1rem 0;
                }
                .progress-fill {
                    height: 100%;
                    background-color: var(--primary-color);
                    width: 0%;
                    animation: progressAnimation 2s ease-in-out infinite;
                }
                @keyframes progressAnimation {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        progressModal.style.display = 'flex';
    }

    hideUploadProgress() {
        const progressModal = document.getElementById('upload-progress-modal');
        if (progressModal) {
            progressModal.remove();
        }
    }

    // Método para autenticar usuario con Google
    async authenticateUser() {
        try {
            // Cargar Google Sign-In
            await this.loadScript('https://accounts.google.com/gsi/client');
            
            return new Promise((resolve, reject) => {
                google.accounts.id.initialize({
                    client_id: GOOGLE_DRIVE_CONFIG.clientId,
                    callback: resolve,
                    error_callback: reject
                });

                google.accounts.id.prompt();
            });
        } catch (error) {
            console.error('Error en autenticación Google:', error);
            throw error;
        }
    }

    // Verificar si la API está lista
    isReady() {
        return this.isInitialized && window.gapi && gapi.client;
    }

    // Método para obtener información de un archivo
    async getFileInfo(fileId) {
        if (!this.isInitialized) {
            throw new Error('Google Drive API no está inicializada');
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id,name,size,mimeType,createdTime,modifiedTime,webViewLink'
            });

            return response.result;
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }

    // Método para listar archivos en una carpeta
    async listFiles(folderId = null, pageSize = 100) {
        if (!this.isInitialized) {
            throw new Error('Google Drive API no está inicializada');
        }

        const targetFolder = folderId || this.folderId;

        try {
            const response = await gapi.client.drive.files.list({
                q: `'${targetFolder}' in parents and trashed=false`,
                pageSize: pageSize,
                fields: 'files(id,name,size,mimeType,createdTime,webViewLink)'
            });

            return response.result.files || [];
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }
}

// Crear instancia global
window.googleDriveManager = new GoogleDriveManager();

export default GoogleDriveManager;