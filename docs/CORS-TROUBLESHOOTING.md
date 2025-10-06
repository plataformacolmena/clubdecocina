# 🔧 GUÍA DE SOLUCIÓN DE PROBLEMAS CORS - Google Apps Script

## 📋 Problema Actual

**Error CORS observado:**
```
Access to fetch at 'https://script.google.com/macros/s/[ID]/exec?test=true' from origin 'https://plataformacolmena.github.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🎯 Soluciones Paso a Paso

### 1. ✅ VERIFICAR DEPLOYMENT DEL APPS SCRIPT

#### Paso 1.1: Acceder a tu Apps Script
- Ve a https://script.google.com
- Abre tu proyecto "Gmail API Universal Script"

#### Paso 1.2: Verificar el Código
- Asegúrate que el código tenga las funciones `doOptions()` y `doGet()` con headers CORS
- **IMPORTANTE:** El código debe ser exactamente como está en `docs/gmail-apps-script.gs`

#### Paso 1.3: Hacer un Nuevo Deployment
1. **Crear nueva versión:**
   - Haz clic en "Implementar" > "Nueva implementación"
   - Selecciona "Aplicación web"

2. **Configurar permisos:**
   ```
   ✅ Ejecutar como: Yo (tu email)
   ✅ Quien tiene acceso: Cualquier persona
   ```

3. **Desplegar:**
   - Haz clic en "Implementar"
   - **COPIA LA NUEVA URL** (será diferente a la anterior)

### 2. 🔄 ACTUALIZAR URL EN EL SISTEMA

#### Paso 2.1: Usar la Nueva URL
- La nueva URL debe terminar en `/exec`
- Ejemplo: `https://script.google.com/macros/s/[NUEVO_ID]/exec`

#### Paso 2.2: Probar Manualmente
Antes de usar el sistema, prueba la URL directamente:

```bash
# En tu navegador, visita:
https://script.google.com/macros/s/[TU_ID]/exec?test=true
```

**Respuesta esperada:**
```json
{
  "status": "Gmail API Script funcionando correctamente",
  "version": "1.0.0",
  "timestamp": "2025-01-05T...",
  "test": true,
  "message": "Test de conexión exitoso",
  "cors": "Configurado correctamente"
}
```

### 3. 🔍 DIAGNÓSTICO AVANZADO

#### Si aún tienes errores CORS:

**Opción A: Verificar Headers en el Navegador**
1. Abre Herramientas de Desarrollador (F12)
2. Ve a la pestaña "Network"
3. Haz la prueba de conexión
4. Busca la petición a script.google.com
5. Verifica que tenga estos headers en la respuesta:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```

**Opción B: Verificar Status de la Petición**
- Si ves "Status: 200 OK" pero error CORS = problema de headers
- Si ves "Status: 302 Redirect" = problema de autenticación/permisos

### 4. 🚨 SOLUCIONES DE EMERGENCIA

#### Solución A: Re-deployment Completo
```bash
1. Elimina el deployment actual
2. Espera 2-3 minutos
3. Crea un deployment completamente nuevo
4. Usa la nueva URL
```

#### Solución B: Verificar Código doOptions()
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

#### Solución C: Test con CURL
```bash
# Prueba desde terminal:
curl -X GET "https://script.google.com/macros/s/[TU_ID]/exec?test=true" \
     -H "Accept: application/json"
```

### 5. 📱 PASOS DE VERIFICACIÓN FINAL

#### Checklist de Deployment ✅
- [ ] Apps Script desplegado como "Web App"
- [ ] Acceso configurado como "Cualquier persona"
- [ ] URL termina en `/exec`
- [ ] Funciones `doGet()`, `doPost()`, y `doOptions()` presentes
- [ ] Headers CORS configurados correctamente
- [ ] Test manual desde navegador funciona

#### Checklist del Sistema ✅
- [ ] URL actualizada en configuración
- [ ] Import `addDoc` agregado a configuracion.js
- [ ] Prueba de conexión exitosa desde el panel
- [ ] No hay errores en consola del navegador

## 🔧 COMANDOS DE AYUDA

### Verificar Firebase Functions (alternativa)
Si Apps Script sigue fallando, podemos configurar Firebase Functions:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login y configurar
firebase login
firebase init functions
```

### Verificar Estado del Proyecto
```bash
# Ver logs del servidor local
python3 -m http.server 3000

# Verificar archivos
ls -la js/
cat js/configuracion.js | grep -A 5 "addDoc"
```

## 📞 CONTACTO PARA SOPORTE

Si después de seguir todos estos pasos aún tienes problemas:

1. **Comparte estos datos:**
   - URL completa del Apps Script
   - Mensaje de error exacto
   - Screenshot de la consola del navegador

2. **Información del entorno:**
   - Navegador utilizado
   - Si funciona el test manual de la URL
   - Status code de la respuesta

---

💡 **Tip**: El problema CORS es muy común con Apps Script. En el 90% de los casos se resuelve con un re-deployment correcto del script.