# 📧 Guía de Despliegue - Gmail Apps Script

## 🚀 **Pasos para Desplegar el Apps Script**

### **1. Acceder a Google Apps Script**
1. Ve a [script.google.com](https://script.google.com)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Nuevo proyecto"**

### **2. Configurar el Proyecto**
1. **Nombra el proyecto**: `Club-Cocina-Gmail-API`
2. **Elimina** el código por defecto
3. **⚠️ IMPORTANTE**: Usa el archivo `gmail-apps-script.gs` (versión optimizada)
4. **Copia y pega** todo el contenido del archivo

> **Nota**: Esta versión incluye solución definitiva para problemas CORS con GitHub Pages y debugging mejorado.

### **3. Configurar Variables (IMPORTANTE)**
Antes de desplegar, **edita estas líneas** en el script:

```javascript
const CONFIG = {
  // ⚠️ CAMBIAR ESTE EMAIL por el del administrador real
  adminEmail: 'admin@clubcolmena.com.ar',
  
  emailConfig: {
    remitente: 'Club de Cocina Colmena',
    // ⚠️ CAMBIAR ESTOS EMAILS
    noreplyEmail: 'noreply@clubcolmena.com.ar',
    logoUrl: 'https://clubcolmena.com.ar/logo.png',
    websiteUrl: 'https://clubcolmena.com.ar',
    // Colores están bien configurados
    colorPrimario: '#ff6b35',
    colorSecundario: '#2c5f2d'
  }
};
```

### **4. Desplegar como Web App**
1. **Guarda** el proyecto (Ctrl+S)
2. Haz clic en **"Desplegar"** → **"Nueva implementación"**
3. **Configuración importante**:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (tu email)
   - **Acceso**: Cualquiera
4. **Autorizar permisos** cuando se solicite
5. **Copia la URL** del deployment (termina en `/exec`)

### **5. Probar el Despliegue**
1. **Abre la URL** en el navegador
2. Deberías ver un JSON como este:
```json
{
  "status": "Gmail API Script funcionando correctamente",
  "version": "1.0.0",
  "timestamp": "2025-10-05T...",
  "endpoints": [...]
}
```

### **6. Configurar en el Sistema**
1. Ve a **Configuraciones** → **Apps Scripts**
2. **Pega la URL** del deployment
3. **Prueba** la conexión
4. Si funciona, verás: ✅ "Apps Script funcionando correctamente"

## ⚠️ **Problemas Comunes**

### **Error CORS**
```
Access to fetch ... has been blocked by CORS policy
```
**Solución**: 
- Verifica que desplegaste como "Acceso: Cualquiera"
- Redesplega con nueva implementación si es necesario

### **Error 403 Forbidden**
```
The caller does not have permission
```
**Solución**:
- Autoriza los permisos de Gmail cuando se solicite
- Ve a Permisos → Revisar permisos

### **Error 404 Not Found**
```
Script function not found
```
**Solución**:
- Verifica que copiaste TODO el código
- Guarda y redesplega

## 🧪 **Testing Manual**

### **Test 1: GET Status**
```
https://script.google.com/.../exec?test=true
```
Debería responder con status "funcionando"

### **Test 2: POST Email (Opcional)**
```javascript
fetch('https://script.google.com/.../exec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo: 'email_personalizado',
    destinatario: 'tu-email@gmail.com',
    asunto: 'Test desde Apps Script',
    titulo: 'Prueba de Email',
    contenido: 'Este es un email de prueba.'
  })
})
```

## ✅ **Checklist Final**

- [ ] Proyecto creado en Apps Script
- [ ] Código copiado completamente
- [ ] Variables CONFIG editadas (emails, URLs)
- [ ] Desplegado como Web App con acceso público
- [ ] Permisos de Gmail autorizados
- [ ] URL copiada y probada en navegador
- [ ] Configurado en sistema (Configuraciones → Apps Scripts)
- [ ] Test de conexión exitoso
- [ ] Test de envío de email (opcional)

## � **Errores Comunes y Soluciones**

### **Error: "setHeader is not a function"**
```
TypeError: ContentService.createTextOutput(...).setMimeType(...).setHeader is not a function
```

**🔧 Solución:**
- Usa el archivo `gmail-apps-script.gs` (versión actual)
- El error ocurre por encadenamiento incorrecto de métodos en Apps Script
- La versión actual elimina el encadenamiento problemático y optimiza CORS

### **Error: "Access to fetch blocked by CORS"**
```
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**🔧 Solución:**
1. Verifica que el script esté desplegado como "Web App"
2. Acceso debe ser "Cualquier persona"
3. Usa la herramienta de test: `docs/test-apps-script-cors.html`
4. Si persiste, haz un nuevo deployment

### **Error: "Authorization required"**
```
You need authorization to perform that action
```

**🔧 Solución:**
1. Ve a Apps Script → Autorizaciones
2. Ejecuta la función `testEmail()` manualmente
3. Autoriza permisos de Gmail cuando se solicite
4. Redespliega después de autorizar

### **Error: "Script function not found"**
```
Script function not found: doGet
```

**🔧 Solución:**
- El código no se guardó correctamente
- Pega de nuevo todo el código
- Guarda (Ctrl+S) antes de desplegar

## �📞 **Soporte**

Si tienes problemas:
1. **Usa la versión actual**: `gmail-apps-script.gs`
2. **Verifica** que seguiste todos los pasos
3. **Revisa** los logs en Apps Script (Ver → Registros) - incluye debugging detallado
4. **Prueba** el URL directamente en el navegador
5. **Consulta** CORS-TROUBLESHOOTING.md para errores de conexión
6. **Redesplega** con nueva implementación si es necesario

---

**¡Una vez configurado, el sistema podrá enviar emails automáticamente! 🎉**