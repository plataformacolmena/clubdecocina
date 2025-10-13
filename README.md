# Club de Cocina Colmena 🍳

Sistema web de inscripciones a cursos de cocina con frontend en GitHub Pages y backend en Firebase.

## 🌟 Características

- **Autenticación múltiple**: Email manual, Gmail y Microsoft  
- **Dos tipos de usuarios**: Administrador (constante) y Alumnos
- **Gestión completa de cursos**: Creación, edición, inscripciones
- **Sistema de pagos**: Carga de comprobantes y verificación
- **Recetario interactivo**: Comentarios y reacciones
- **Panel de administración** completo
- **Diseño responsivo** para móviles y desktop
- **Notificaciones por email**: Gmail Apps Script integrado
- **Gestión bancaria dinámica**: Configuración desde panel admin

## 🏗️ Arquitectura

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Email Service**: Google Apps Script
- **Hosting**: GitHub Pages / Firebase Hosting
- **Plan**: Firebase Spark (sin Cloud Functions)

## 📱 Funcionalidades

### Para Alumnos
- ✅ Registro e inicio de sesión
- ✅ Ver cursos disponibles con filtros
- ✅ Inscribirse a cursos (verificación de cupos)
- ✅ Subir comprobantes de pago
- ✅ Ver estado de inscripciones
- ✅ Acceder al recetario
- ✅ Comentar y dar "like" a recetas

### Para Administradores
- ✅ Gestión completa de cursos (CRUD)
- ✅ Ver y gestionar inscripciones
- ✅ Verificar comprobantes de pago
- ✅ Confirmar inscripciones
- ✅ Gestión de recetas (CRUD)
- ✅ Subida de imágenes para recetas

## 🚀 Configuración e Instalación

### 🚨 IMPORTANTE: Pasos Obligatorios Antes de Usar

### 1. 🔥 Configurar Firebase (CRÍTICO)

1. **Crear proyecto en [Firebase Console](https://console.firebase.google.com/)**
2. **Habilitar servicios**:
   - **Authentication** (Email, Google, Microsoft)
   - **Firestore Database** (modo prueba inicial)
   - **Storage**
3. **Obtener configuración del proyecto**
4. **Reemplazar credenciales en `js/firebase-config.js`**:

```javascript
// REEMPLAZAR ESTAS LÍNEAS CON TUS CREDENCIALES REALES:
const firebaseConfig = {
    apiKey: "AIzaSyDg8Aefy62FWdwrG978Z6Es2VZ78Wa0Fc0",
    authDomain: "clubdecocina-colmena.firebaseapp.com",
    projectId: "clubdecocina-colmena",
    storageBucket: "clubdecocina-colmena.firebasestorage.app",
    messagingSenderId: "968450410721",
    appId: "1:968450410721:web:8656b34cefc0d88da48fa0",
    measurementId: "G-D0SWJQW237"
};
```

### 2. 👤 Configurar Email de Administrador

En el mismo archivo, cambiar:
```javascript
export const ADMIN_EMAIL = 'tu-email-admin@ejemplo.com';
```

### 3. 🏦 Sistema de Cuentas Bancarias Dinámico

**🎉 ¡Ya no necesitas configurar datos bancarios en el código!**

Los datos bancarios ahora se gestionan dinámicamente desde el **Panel de Administración**:

1. **Registra tu cuenta admin** (paso anterior)
2. **Accede al Panel** → Pestaña **"Cuentas"**
3. **Configura tu cuenta bancaria** con:
   - **CVU/CBU**: Tu clave bancaria uniforme (22 dígitos)
   - **Alias**: Tu alias bancario  
   - **CUIT**: CUIT del titular (formato XX-XXXXXXXX-X)
   - **Titular**: Nombre completo del titular

✅ **Ventajas del nuevo sistema:**
- Cambios sin tocar código
- Múltiples cuentas bancarias
- Activar/desactivar cuentas
- Validaciones automáticas

### 4. 📧 Configurar Gmail Apps Script (Email Service)

#### Paso 1: Crear Apps Script
1. Ve a [script.google.com](https://script.google.com)
2. Crear **"Nuevo proyecto"**
3. Nombrar: `Club-Cocina-Gmail-API`

#### Paso 2: Copiar Código
1. **Elimina** el código por defecto
2. **Copia y pega** todo el contenido de `docs/gmail-apps-script.gs`
3. **Configura variables importantes**:

```javascript
const CONFIG = {
  // ⚠️ CAMBIAR ESTE EMAIL por el del administrador real
  adminEmail: 'admin@clubcolmena.com.ar',
  
  emailConfig: {
    remitente: 'Club de Cocina Colmena',
    // ⚠️ CAMBIAR ESTOS EMAILS Y URLs
    noreplyEmail: 'noreply@clubcolmena.com.ar',
    logoUrl: 'https://clubcolmena.com.ar/logo.png',
    websiteUrl: 'https://clubcolmena.com.ar',
    colorPrimario: '#ff6b35',
    colorSecundario: '#2c5f2d'
  }
};
```

#### Paso 3: Desplegar como Web App
1. **Guardar** el proyecto (Ctrl+S)
2. **"Desplegar"** → **"Nueva implementación"**
3. **Configuración crítica**:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (tu email)
   - **Acceso**: **Cualquier persona** ⚠️
4. **Autorizar permisos** cuando se solicite
5. **Copiar la URL** del deployment (termina en `/exec`)

#### Paso 4: Probar el Despliegue
Abrir la URL en navegador, debe responder:
```json
{
  "status": "Apps Script funcionando correctamente",
  "version": "2.0.0-cors-definitivo",
  "timestamp": "2025-01-05T...",
  "deployment": "Público con CORS automático"
}
```

#### Paso 5: Configurar URL en el Sistema
1. **Acceder al Panel de Administración**
2. Pestaña **"Configuración"**
3. **Ingresar URL del Apps Script**
4. **Probar conexión**

### 5. 💻 Desarrollo Local

```bash
# Servir con Live Server de VS Code o cualquier servidor local
# El proyecto es estático, no requiere Node.js

# Alternativa: Python
python -m http.server 3000

# Alternativa: Node.js
npx serve . -p 3000

# Acceder en: http://localhost:3000
```

## 🚀 Guía de Despliegue

### 📋 Opción 1: GitHub Pages (Recomendada)

#### 🔸 Paso 1: Preparar el Repositorio

1. **Crear repositorio en GitHub**:
   - Ve a https://github.com/new
   - Nombre: `clubdecocina-colmena`
   - Público ✅ (requerido para GitHub Pages gratuito)

2. **Subir tu código**:
```bash
# En tu carpeta del proyecto
git init
git add .
git commit -m "Inicial: Sistema de inscripciones Club de Cocina"

# Conectar con GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/clubdecocina-colmena.git
git branch -M main
git push -u origin main
```

#### 🔸 Paso 2: Configurar GitHub Pages

1. **En tu repositorio GitHub**:
   - Ir a "Settings" (pestaña)
   - Scroll down a "Pages" (menú lateral izquierdo)

2. **Configurar Source**:
   - **Source**: "Deploy from a branch"
   - **Branch**: `main` 
   - **Folder**: `/ (root)` ← IMPORTANTE: NO `/public`

3. **Esperar despliegue** (2-3 minutos)
   - GitHub mostrará: "Your site is published at https://TU_USUARIO.github.io/clubdecocina-colmena"

#### 🔸 Paso 3: Configurar Firebase para GitHub Pages

**⚠️ IMPORTANTE**: Debes autorizar tu dominio de GitHub Pages en Firebase

1. **Firebase Console** → Tu proyecto → Authentication
2. **Sign-in method** → pestaña "Settings"
3. **Authorized domains** → "Add domain"
4. **Agregar**: `TU_USUARIO.github.io`
5. **Save**

**URL final**: `https://TU_USUARIO.github.io/clubdecocina-colmena`

### 📋 Opción 2: Firebase Hosting

#### 🔸 Ventajas de Firebase Hosting
- ✅ SSL automático
- ✅ CDN global
- ✅ Integración nativa con Firebase
- ✅ Dominio personalizado fácil

#### 🔸 Pasos para Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login a Firebase
firebase login

# En tu carpeta del proyecto
firebase init

# Seleccionar:
# - Hosting: Configure files for Firebase Hosting
# - Use an existing project: [tu-proyecto]
# - Public directory: . (root)
# - Single-page app: No
# - Set up automatic builds: No

# Desplegar
firebase deploy

# URL final: https://tu-proyecto.web.app
```

## 📊 Estructura de Base de Datos

### Colecciones en Firestore

#### `users`
```javascript
{
  uid: "string",
  email: "string", 
  displayName: "string",
  photoURL: "string",
  phone: "string", // opcional
  createdAt: "timestamp"
}
```

#### `admins`
```javascript
{
  uid: "string",
  email: "string",
  displayName: "string", 
  createdAt: "timestamp"
}
```

#### `cursos`
```javascript
{
  nombre: "string",
  descripcion: "string", // opcional
  fechaHora: "timestamp",
  costo: "number",
  capacidadMaxima: "number",
  inscriptos: "number",
  fechaCreacion: "timestamp"
}
```

#### `inscripciones`
```javascript
{
  usuarioId: "string",
  usuarioEmail: "string",
  usuarioNombre: "string",
  cursoId: "string", 
  cursoNombre: "string",
  costo: "number",
  fechaInscripcion: "timestamp",
  estado: "pendiente|pagado|confirmado",
  metodoPago: "string", // opcional
  comprobanteUrl: "string", // opcional
  comentariosPago: "string", // opcional
  fechaSubidaComprobante: "timestamp", // opcional
  fechaConfirmacion: "timestamp" // opcional
}
```

#### `recetas`
```javascript
{
  nombre: "string",
  cursoNombre: "string", // opcional
  descripcion: "string", // opcional
  tiempoPreparacion: "string",
  porciones: "string", 
  dificultad: "Fácil|Media|Difícil",
  ingredientes: "string", // separados por línea
  instrucciones: "string", // separados por línea
  tips: "string", // opcional
  imagenUrl: "string", // opcional
  fechaCreacion: "timestamp",
  likes: ["array de userIds"]
}
```

#### `comentarios`
```javascript
{
  recetaId: "string",
  usuarioId: "string",
  usuarioNombre: "string",
  texto: "string",
  fecha: "timestamp"
}
```

## 🔧 Configuraciones Adicionales

### Reglas de Seguridad - Firestore
Las reglas están configuradas en `firestore.rules` para:
- Usuarios pueden leer/escribir sus propios datos
- Administradores tienen acceso completo
- Inscripciones: usuarios ven las suyas, admin ve todas
- Cursos y recetas: lectura pública, escritura solo admin

### Reglas de Seguridad - Storage  
Las reglas están en `storage.rules` para:
- Comprobantes: solo el usuario y admin
- Imágenes de recetas: lectura pública, escritura admin

### Proveedores de Autenticación

#### Google
1. En Firebase Console → Authentication → Sign-in method
2. Habilitar Google
3. Configurar dominio autorizado

#### Microsoft  
1. En Firebase Console → Authentication → Sign-in method
2. Habilitar Microsoft
3. Configurar aplicación en Azure AD

## 🎨 Personalización

### Colores del Tema
En `public/css/styles.css`:

```css
:root {
    --primary-color: #ff6b35;    /* Naranja principal */
    --secondary-color: #2c5f2d;  /* Verde secundario */
    --accent-color: #97bc62;     /* Verde acento */
    --text-dark: #2d2d2d;        /* Texto oscuro */
    --text-light: #666;          /* Texto claro */
}
```

### Agregar Nuevas Secciones
1. Crear HTML en `index.html`
2. Agregar estilos en `styles.css`
3. Crear manager en `js/`
4. Importar en `app.js`

## 📱 Uso de la Aplicación

### Flujo del Alumno
1. **Registro/Login** → Email, Google o Microsoft
2. **Explorar Cursos** → Ver disponibles, filtrar por fecha/nombre
3. **Inscribirse** → Seleccionar curso, verificar cupo
4. **Pagar** → Ver datos bancarios, realizar transferencia
5. **Subir Comprobante** → Upload de archivo en "Mis Inscripciones"
6. **Recetario** → Ver recetas, comentar, dar likes

### Flujo del Administrador
1. **Login** → Con email definido como admin
2. **Gestionar Cursos** → Crear, editar, eliminar
3. **Ver Inscripciones** → Filtrar por curso/estado
4. **Verificar Pagos** → Revisar comprobantes, confirmar
5. **Gestionar Recetas** → Crear con imágenes, editar, eliminar

## 🔒 Seguridad

- Autenticación Firebase integrada
- Reglas de seguridad granulares
- Validación en frontend y backend
- Administrador definido por email constante
- Storage segmentado por usuario/función

## 🐛 Solución de Problemas

### Error: "Permission denied"
- Verificar reglas de Firestore/Storage
- Confirmar que el usuario está autenticado
- Revisar configuración de admin

### Error: "Firebase config not found"
- Verificar credenciales en `firebase-config.js`
- Confirmar que el proyecto Firebase está activo
- Revisar configuración de dominio

### Error: "Authentication failed"
- Verificar configuración de proveedores
- Confirmar dominios autorizados
- Revisar claves de API

### Problemas de Deployment
- Verificar que `public/` contiene todos los archivos
- Confirmar configuración de GitHub Pages
- Revisar rutas absolutas vs relativas

## 🚀 Roadmap Futuro

- [ ] Notificaciones email automáticas
- [ ] Sistema de descuentos/cupones
- [ ] Calendario integrado
- [ ] Chat/mensajería
- [ ] App móvil nativa
- [ ] Integración con pasarelas de pago
- [ ] Sistema de certificados
- [ ] Análisis y reportes avanzados

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 🔧 Solución de Problemas (Troubleshooting)

### 🚨 Problemas Comunes con Gmail Apps Script

#### Error CORS - Gmail Apps Script
```
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**🎯 Soluciones Paso a Paso:**

##### 1. ✅ VERIFICAR DEPLOYMENT DEL APPS SCRIPT
- Ve a https://script.google.com
- Abre tu proyecto "Gmail API Universal Script"
- **IMPORTANTE:** Verifica que uses el código de `docs/gmail-apps-script.gs`

##### 2. 🔄 HACER NUEVO DEPLOYMENT
1. **Crear nueva versión:**
   - "Implementar" > "Nueva implementación"
   - Selecciona "Aplicación web"

2. **Configurar permisos:**
   ```
   ✅ Ejecutar como: Yo (tu email)
   ✅ Quien tiene acceso: Cualquier persona
   ```

3. **Copiar la nueva URL** (será diferente)

##### 3. 🧪 PROBAR MANUALMENTE
En tu navegador, visita:
```
https://script.google.com/macros/s/[TU_ID]/exec?test=true
```

**Respuesta esperada:**
```json
{
  "status": "Apps Script funcionando correctamente",
  "version": "2.0.0-cors-definitivo",
  "timestamp": "2025-01-05T...",
  "test": true,
  "cors": "Configurado correctamente"
}
```

##### 4. 🚨 SOLUCIONES DE EMERGENCIA

**Solución A: Re-deployment Completo**
```bash
1. Elimina el deployment actual
2. Espera 2-3 minutos
3. Crea un deployment completamente nuevo
4. Usa la nueva URL
```

**Solución B: Verificar Código doOptions()**
Asegúrate que tu Apps Script tenga exactamente esto:

```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

##### 5. 📱 CHECKLIST DE VERIFICACIÓN FINAL

**Checklist de Deployment ✅**
- [ ] Apps Script desplegado como "Web App"
- [ ] Acceso configurado como "Cualquier persona"
- [ ] URL termina en `/exec`
- [ ] Funciones `doGet()`, `doPost()`, y `doOptions()` presentes
- [ ] Headers CORS configurados correctamente
- [ ] Test manual desde navegador funciona

**Checklist del Sistema ✅**
- [ ] URL actualizada en configuración del panel
- [ ] Prueba de conexión exitosa desde el panel
- [ ] No hay errores en consola del navegador

### 🔧 Otros Problemas Comunes

#### Error "Permission denied"
- Verificar reglas de Firestore/Storage
- Confirmar que el usuario está autenticado
- Revisar configuración de admin

#### Error "Firebase config not found"
- Verificar credenciales en `js/firebase-config.js`
- Confirmar que el proyecto Firebase está activo
- Revisar configuración de dominio

#### Error "Authentication failed"
- Verificar configuración de proveedores OAuth
- Confirmar dominios autorizados en Firebase
- Revisar claves de API

#### Problemas de Deployment
- Verificar que todos los archivos están en el repositorio
- Confirmar configuración de GitHub Pages
- Revisar rutas absolutas vs relativas

#### Error "addDoc is not defined"
```javascript
// Verificar que las importaciones incluyan addDoc
import { addDoc } from 'firebase/firestore';
```

### ⚠️ Errores Específicos del Apps Script

#### Error "setHeader is not a function"
```
TypeError: ContentService.createTextOutput(...).setMimeType(...).setHeader is not a function
```

**🔧 Solución:**
- Usa el archivo `docs/gmail-apps-script.gs` (versión optimizada)
- Este error se solucionó eliminando encadenamiento problemático

#### Error 403 Forbidden
```
The caller does not have permission
```
**Solución:**
- Autoriza los permisos de Gmail cuando se solicite
- Ve a Permisos → Revisar permisos

#### Error 404 Not Found
```
Script function not found
```
**Solución:**
- Verifica que copiaste TODO el código
- Guarda y redesplega

## 📞 Contacto para Soporte

Si después de seguir todos estos pasos aún tienes problemas:

### Información a Compartir:
- URL completa del Apps Script
- Mensaje de error exacto
- Screenshot de la consola del navegador
- Navegador utilizado
- Si funciona el test manual de la URL

💡 **Tip**: El problema CORS es muy común con Apps Script. En el 90% de los casos se resuelve con un re-deployment correcto del script.

---

**Desarrollado con ❤️ para Club de Cocina Colmena**