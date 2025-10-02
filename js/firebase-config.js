// Configuración de Firebase
// IMPORTANTE: Credenciales configuradas para clubdecocina-colmena
const firebaseConfig = {
     apiKey: "AIzaSyDg8Aefy62FWdwrG978Z6Es2VZ78Wa0Fc0",
  authDomain: "clubdecocina-colmena.firebaseapp.com",
  projectId: "clubdecocina-colmena",
  storageBucket: "clubdecocina-colmena.firebasestorage.app",
  messagingSenderId: "968450410721",
  appId: "1:968450410721:web:8656b34cefc0d88da48fa0",
  measurementId: "G-D0SWJQW237"
};

// Importar las funciones necesarias de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de Firebase (SIN STORAGE - Plan Spark limitado)
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app); // DESHABILITADO - Plan Spark

// Emails de los administradores
export const ADMIN_EMAIL = 'info@plataformacolmena.com';
export const ADMIN_EMAIL1 = 'admin1@plataformacolmena.com'; 
export const ADMIN_EMAIL2 = 'admin2@plataformacolmena.com';

// Array de todos los emails de administradores para validación
export const ADMIN_EMAILS = [ADMIN_EMAIL, ADMIN_EMAIL1, ADMIN_EMAIL2];

// Configuración de Google Drive (alternativa a Firebase Storage)
export const GOOGLE_DRIVE_CONFIG = {
    // ID de la carpeta pública de Google Drive donde se subirán archivos
    folderId: '12C9grSBITz6u2pGOwa9D14rnI9g8FEwC', // Reemplazar con ID real
    apiKey: 'AIzaSyBgzze_5LbojNAxZwSGd2zkMK-IpAL8eak', // Reemplazar con API Key real
    // Carpetas específicas
    folders: {
        comprobantes: '1fSKK2BjOgy0so2gK2KJTuSqaYAS-o-Lp',
        recetas: '1Py8bW-Mxzr7J41B-SFVvaFX7DMOy4IAx'
    }
};

// Configuración de la aplicación
export const APP_CONFIG = {
    currency: 'ARS',
    dateFormat: 'es-AR',
    useGoogleDrive: true, // Usar Google Drive en lugar de Firebase Storage
    bankInfo: {
        account: '6557575/67',
        cbu: '22222222222222222',
        alias: 'COLMENA.COCINA.CLUB',
        bank: 'Banco Ejemplo'
    }
};