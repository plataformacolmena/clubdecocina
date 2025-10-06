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

## 🏗️ Arquitectura

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Hosting**: GitHub Pages
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

### 1. Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar servicios:
   - **Authentication** (Email, Google, Microsoft)
   - **Firestore Database**
   - **Storage**
3. Obtener configuración del proyecto
4. Reemplazar credenciales en `public/js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};
```

### 2. Configurar Administrador

En `firebase-config.js`, cambiar el email del administrador:

```javascript
export const ADMIN_EMAIL = 'tu-email-admin@ejemplo.com';
```

### 3. Configurar Información Bancaria

En `firebase-config.js`, actualizar los datos bancarios:

```javascript
export const APP_CONFIG = {
    currency: 'ARS',
    dateFormat: 'es-AR',
    bankInfo: {
        account: 'tu-numero-cuenta',
        cbu: 'tu-cbu',
        alias: 'TU.ALIAS.BANCARIO',
        bank: 'Tu Banco'
    }
};
```

### 4. Desarrollo Local

```bash
# Instalar dependencias
npm install

# Servir localmente
npm run dev
# o
firebase serve
```

### 5. Despliegue

#### GitHub Pages
1. Subir código a repositorio de GitHub
2. Configurar GitHub Pages desde la carpeta `/public`
3. Acceder via `https://tu-usuario.github.io/tu-repositorio`

#### Firebase Hosting
```bash
# Desplegar a Firebase
npm run deploy
# o
firebase deploy
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

## � Troubleshooting

### Problemas Comunes

#### Error CORS con Gmail Apps Script
```
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**Soluciones:**
1. **Verificar deployment**: Apps Script debe estar desplegado como "Web App" con acceso "Cualquier persona"
2. **Test manual**: Usar [`docs/test-apps-script-cors.html`](docs/test-apps-script-cors.html) para debug
3. **Guía completa**: Consultar [`docs/CORS-TROUBLESHOOTING.md`](docs/CORS-TROUBLESHOOTING.md)

#### Error "addDoc is not defined"
```javascript
// Verificar que las importaciones incluyan addDoc
import { addDoc } from 'firebase/firestore';
```

#### Problemas de Autenticación
- Verificar configuración OAuth en Firebase Console
- Revisar dominios autorizados en Authentication > Settings

### Herramientas de Debug

- **Test CORS**: [`docs/test-apps-script-cors.html`](docs/test-apps-script-cors.html)
- **Test Templates**: [`docs/test-email-templates.html`](docs/test-email-templates.html)
- **Deployment Guide**: [`docs/DEPLOYMENT-GUIDE.md`](docs/DEPLOYMENT-GUIDE.md)

## �📞 Soporte

Para soporte o preguntas:
- **Issues técnicos**: Crear issue en GitHub con logs de consola
- **Problemas CORS**: Seguir guía de troubleshooting
- **Configuración Firebase**: Revisar documentación oficial
- **Contacto directo**: Administrador del sistema

### Información Útil para Soporte

Al reportar problemas, incluir:
- URL del Apps Script (si aplica)
- Mensajes de error completos de la consola
- Navegador y versión utilizada
- Pasos para reproducir el problema

---

**Desarrollado con ❤️ para Club de Cocina Colmena**