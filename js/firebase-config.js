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

// Configuración de la aplicación
export const APP_CONFIG = {
    currency: 'ARS',
    dateFormat: 'es-AR',
    // Sistema de administradores dinámico (solo Firestore)
    adminSystem: {
        cacheExpiry: 5 * 60 * 1000, // Cache por 5 minutos
        collection: 'admins'
    }
};