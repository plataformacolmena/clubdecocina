# Configuración Inicial - Club de Cocina Colmena

## 🚨 IMPORTANTE: Pasos Obligatorios Antes de Usar

### 1. Configurar Firebase (CRÍTICO)

**Debes reemplazar las credenciales de Firebase en:**
`public/js/firebase-config.js`

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

### 2. Configurar Email de Administrador

En el mismo archivo, cambiar:
```javascript
export const ADMIN_EMAIL = 'info@plataformacolmena.com';
```

### 3. Configurar Datos Bancarios

Actualizar la información de pago:
```javascript
export const APP_CONFIG = {
    currency: 'ARS',
    dateFormat: 'es-AR', 
    bankInfo: {
        account: '6557575/67',
        cbu: '22222222222222222',
        alias: 'TU.ALIAS.BANCARIO',
        bank: 'Banco'
    }
};
```

## 🏗️ Configuración de Firebase

### Crear Proyecto Firebase
1. Ve a https://console.firebase.google.com/
2. Crear nuevo proyecto
3. Habilitar Google Analytics (opcional)

### Configurar Authentication
1. En el panel de Firebase → Authentication
2. Pestaña "Sign-in method" 
3. Habilitar:
   - **Email/Password**
   - **Google** (configurar OAuth consent)
   - **Microsoft** (configurar con Azure AD)

### Configurar Firestore Database
1. En el panel de Firebase → Firestore Database
2. Crear base de datos
3. Modo: "Iniciar en modo de prueba" (temporal)
4. Las reglas se actualizarán automáticamente con el archivo `firestore.rules`

### ⚠️ Storage DESHABILITADO (Plan Spark)
Firebase Storage requiere plan Blaze. Como alternativa:

**Opción A: Google Drive (Recomendada) - PASO A PASO**

### 🔸 Paso 1: Crear Carpetas en Google Drive
1. **Abrir Google Drive**: Ve a https://drive.google.com/
2. **Crear carpeta principal**:
   - Clic derecho en área vacía → "Nueva carpeta"
   - Nombre: `ClubCocina_Archivos`
3. **Crear subcarpetas dentro**:
   - Entrar a la carpeta → Crear subcarpeta "Comprobantes"
   - Crear subcarpeta "Recetas"
4. **Hacer públicas las carpetas**:
   - Clic derecho en cada carpeta → "Compartir"
   - Cambiar a "Cualquiera con el enlace puede ver"
   - Copiar enlace de cada carpeta

### 🔸 Paso 2: Obtener IDs de Carpetas
**Para cada carpeta creada:**

1. **Abrir la carpeta** en Google Drive
2. **Copiar la URL** de la barra de direcciones
3. **Extraer el ID** de la URL:

**Ejemplo práctico:**
```
URL completa: https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q?usp=sharing
                                            ↑_________________________________↑
                                            ESTO es el ID que necesitas
```

**📝 Plantilla para anotar tus IDs:**
```
✏️ Carpeta Principal (ClubCocina_Archivos): ___________________________________
✏️ Subcarpeta Comprobantes:                 ___________________________________  
✏️ Subcarpeta Recetas:                      ___________________________________
```

**💡 Tip**: Los IDs son strings largos alfanuméricos de ~33 caracteres

### 🔸 Paso 3: Google Cloud Console (Crear Proyecto)
1. **Ir a**: https://console.cloud.google.com/
2. **Crear nuevo proyecto**:
   - Clic en selector de proyecto (arriba izquierda)
   - "Nuevo proyecto" → Nombre: "ClubCocina-API"
   - Clic "Crear"
3. **Seleccionar el proyecto** recién creado

### 🔸 Paso 4: Habilitar Google Drive API
1. **En el menú lateral** → "APIs y servicios" → "Biblioteca"
2. **Buscar**: "Google Drive API"
3. **Clic en "Google Drive API"** → "Habilitar"
4. **Esperar** que se active (puede tardar 1-2 minutos)

### 🔸 Paso 5: Crear API Key
1. **Ir a**: "APIs y servicios" → "Credenciales"
2. **Clic**: "+ CREAR CREDENCIALES" → "Clave de API"
3. **Copiar la API Key** generada: `AIza...`
4. **Opcional pero recomendado**:
   - Clic en la API Key → "Restringir clave"
   - "Restricciones de API" → Seleccionar "Google Drive API"
   - Guardar

### 🔸 Paso 6: Configurar en tu Aplicación
**Editar archivo**: `public/js/firebase-config.js`

**Reemplazar esta sección**:
```javascript
export const GOOGLE_DRIVE_CONFIG = {
    folderId: 'TU_CARPETA_ID_GOOGLE_DRIVE', // ← CAMBIAR
    apiKey: 'TU_API_KEY_GOOGLE_DRIVE',      // ← CAMBIAR
    folders: {
        comprobantes: 'CARPETA_COMPROBANTES_ID', // ← CAMBIAR
        recetas: 'CARPETA_RECETAS_ID'            // ← CAMBIAR
    }
};
```

**Por tus datos reales**:
```javascript
export const GOOGLE_DRIVE_CONFIG = {
    folderId: '1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q',        // ← Tu ID carpeta principal
    apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890',   // ← Tu API Key
    folders: {
        comprobantes: '2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r',   // ← Tu ID comprobantes  
        recetas: '3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s'        // ← Tu ID recetas
    }
};
```

### 🔸 Paso 7: Verificar que Funciona
1. **Reiniciar el servidor local** (Ctrl+C → `python3 -m http.server 3000`)
2. **Abrir la aplicación** → Registrarse como admin
3. **Crear una receta** con imagen → Si Google Drive está bien configurado, verás "✅ Archivo subido a Google Drive"
4. **Verificar en Google Drive** → La imagen debería aparecer en la carpeta "Recetas"

### 🆘 Solución de Problemas Google Drive

**❌ Error: "Google Drive API no está inicializada"**
- ✅ Verificar que la API Key es correcta
- ✅ Confirmar que Google Drive API está habilitada
- ✅ Refrescar la página del navegador

**❌ Error: "403 Forbidden"**  
- ✅ Verificar que las carpetas son públicas ("Cualquiera con el enlace")
- ✅ Confirmar que los IDs de carpetas son correctos

**❌ Error: "CORS"**
- ✅ Asegurar que estás usando el servidor local (puerto 3000)
- ✅ No abrir directamente el archivo HTML

## 📊 Comparación de Opciones

| Característica | Google Drive (Opción A) | Base64 (Opción B) |
|---|---|---|
| **Configuración** | ⚙️ 15-20 min setup | ✅ Inmediato |
| **Tamaño archivos** | 🚀 Sin límite prático | ⚠️ 1MB máximo |
| **Rendimiento** | ⚡ Excelente | 🐌 Más lento |
| **Costo** | 💰 Gratis hasta 15GB | 💰 Gratis |
| **Administración** | 📁 Carpetas organizadas | 📊 Mezclado en DB |
| **Escalabilidad** | 📈 Para producción | 🧪 Solo pruebas |

### 🎯 **Recomendación:**
- **Para probar rápido**: Usar Opción B (funciona de inmediato)
- **Para uso real**: Configurar Opción A (mejor a largo plazo)

---

**Opción B: Método alternativo (Sin Google Drive)**
- Los archivos se convierten a base64
- Solo para archivos pequeños (< 1MB)  
- Almacenamiento en Firestore directamente
- ✅ **Funciona inmediatamente sin configuración**
- ⚠️ **Limitado para uso de prueba únicamente**

### Obtener Configuración
1. En Configuración del proyecto → General
2. Sección "Tus apps" → Web
3. Copiar objeto `firebaseConfig`
4. Pegarlo en `firebase-config.js`

## 🌐 Despliegue

### Opción 1: GitHub Pages (Recomendado)
1. Subir código a repositorio GitHub
2. Ir a Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: `main` → `/root` o `/public`
5. Acceder desde `https://tu-usuario.github.io/tu-repo`

### Opción 2: Firebase Hosting
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login a Firebase
firebase login

# Inicializar hosting
firebase init hosting

# Desplegar
firebase deploy
```

## 🔐 Configuración de Seguridad

### Reglas de Firestore
Las reglas en `firestore.rules` ya están configuradas para:
- ✅ Solo usuarios autenticados pueden leer/escribir
- ✅ Administradores tienen acceso total
- ✅ Usuarios solo ven sus propios datos
- ✅ Seguridad por tipo de documento

### Reglas de Storage  
Las reglas en `storage.rules` protegen:
- ✅ Comprobantes: solo el usuario y admin
- ✅ Imágenes recetas: lectura pública, escritura admin

### Configurar Dominios Autorizados
En Firebase Console → Authentication → Settings:
- Agregar dominio de GitHub Pages
- Agregar dominio personalizado si tienes
- Mantener localhost para desarrollo

## 🧪 Testing Local

### Servidor Local Actual
El servidor está corriendo en: **http://localhost:3000**

### Firebase Emulators (Opcional)
Para desarrollo avanzado:
```bash
# Instalar emulators
firebase init emulators

# Ejecutar emulators
firebase emulators:start
```

## 📋 Lista de Verificación

- [ ] Firebase proyecto creado
- [x] Credenciales configuradas en `firebase-config.js`
- [x] Email de admin configurado
- [x] Datos bancarios actualizados
- [ ] Authentication habilitado (Email, Google, Microsoft)
- [ ] Firestore Database creado
- [ ] ⚠️ Storage OMITIDO (Plan Spark) - Configurar Google Drive como alternativa
- [ ] Google Drive API configurada (opcional pero recomendada)
- [ ] Dominios autorizados configurados
- [ ] Reglas de seguridad deployadas
- [ ] Aplicación probada localmente
- [ ] Hosting configurado (GitHub Pages o Firebase)

## 🆘 Solución de Problemas Comunes

### "Firebase config not found"
❌ **Problema**: Credenciales no configuradas
✅ **Solución**: Reemplazar config en `firebase-config.js`

### "Permission denied" 
❌ **Problema**: Reglas de Firestore muy restrictivas  
✅ **Solución**: Deployar reglas desde archivo `firestore.rules`

### "Auth domain not authorized"
❌ **Problema**: Dominio no autorizado en Firebase
✅ **Solución**: Agregar dominio en Authentication → Settings

### CORS errors en local
❌ **Problema**: Firefox/Safari bloquean file://
✅ **Solución**: Usar servidor HTTP (ya configurado en puerto 3000)

## 📞 Soporte Técnico

Si necesitas ayuda adicional:

1. **Revisar logs del browser** (F12 → Console)
2. **Verificar configuración** siguiendo esta guía
3. **Consultar documentación** de Firebase
4. **Crear issue** en el repositorio con detalles del error

## 📁 Configuración Google Drive (Recomendada)

### Paso 1: Crear Carpetas en Google Drive
1. Crear carpeta principal: `ClubCocina_Archivos`
2. Dentro crear subcarpetas:
   - `Comprobantes` (para comprobantes de pago)
   - `Recetas` (para imágenes de recetas)
3. Hacer las carpetas públicas:
   - Clic derecho → Compartir → "Cualquiera con el enlace"

### Paso 2: Obtener IDs de Carpetas
1. Abrir cada carpeta en Google Drive
2. Copiar ID de la URL: `https://drive.google.com/drive/folders/ID_AQUI`
3. Anotar los IDs

### Paso 3: Configurar Google Cloud Console
1. Ir a https://console.cloud.google.com/
2. Crear nuevo proyecto o usar existente
3. Habilitar "Google Drive API"
4. Crear credenciales → API Key
5. Anotar la API Key

### Paso 4: Actualizar Configuración
En `firebase-config.js`:
```javascript
export const GOOGLE_DRIVE_CONFIG = {
    folderId: 'ID_CARPETA_PRINCIPAL',
    apiKey: 'TU_API_KEY_GOOGLE_CLOUD',
    folders: {
        comprobantes: 'ID_CARPETA_COMPROBANTES',
        recetas: 'ID_CARPETA_RECETAS'
    }
};
```

### Sin Google Drive
Si no configuras Google Drive:
- ⚠️ Solo archivos < 1MB (comprobantes)
- ⚠️ Solo imágenes < 500KB (recetas)
- ✅ Funciona sin configuración adicional
- ❌ Rendimiento limitado

## 🎯 Próximos Pasos

Una vez configurado correctamente:

1. **Registrar cuenta admin** con el email configurado
2. **Crear primeros cursos** desde panel admin
3. **Probar inscripción** como alumno
4. **Subir recetas** con imágenes
5. **Configurar Google Drive** (opcional pero recomendado)
6. **Configurar dominio personalizado** (opcional)

---

**¡La aplicación está lista para usar! 🎉**

*Recuerda: El primer usuario que se registre con el ADMIN_EMAIL tendrá permisos de administrador automáticamente.*

### 🔄 Método Alternativo Sin Google Drive
El sistema funciona sin Google Drive con limitaciones:
- Comprobantes y recetas se almacenan como base64 en Firestore
- Límite de tamaño reducido por restricciones de Firestore
- Rendimiento menor pero funcional para empezar