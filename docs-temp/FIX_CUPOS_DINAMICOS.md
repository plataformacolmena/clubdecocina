# 🔧 FIX: Sistema de Cupos Dinámico

## 🎯 **Problema Identificado**

### ❌ **Situación Anterior**
- El sistema mantenía un contador manual `inscriptos` en cada curso
- ✅ **Al inscribirse**: Contador se incrementaba (`inscriptos + 1`)
- ❌ **Al cancelar**: Contador NO se decrementaba
- ❌ **Al eliminar**: Contador NO se decrementaba

### 🚨 **Consecuencias**
1. Los cupos disponibles se calculaban incorrectamente
2. Los cursos aparecían "completos" cuando tenían cupos reales
3. El contador se volvía inexacto con el tiempo
4. Pérdida de inscripciones por falsos "sin cupos"

---

## ✅ **Solución Implementada**

### 🎯 **Estrategia: Cálculo Dinámico**
En lugar de mantener un contador manual, el sistema ahora calcula los inscriptos en tiempo real consultando las inscripciones activas.

### 📝 **Cambios Realizados**

#### **1. Nuevo Método: `contarInscriptosActivos()`**
```javascript
async contarInscriptosActivos(cursoId) {
    const q = query(
        collection(db, 'inscripciones'),
        where('cursoId', '==', cursoId),
        where('estado', 'in', ['pendiente', 'pagado', 'confirmado'])
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
}
```

**Estados que cuentan como "ocupado":**
- ✅ `pendiente` (recién inscripto)
- ✅ `pagado` (comprobante subido)
- ✅ `confirmado` (admin confirmó)
- ❌ `cancelado` (no cuenta como ocupado)

#### **2. Actualización de `createCursoCard()`**
```javascript
// ANTES
const inscriptosActuales = curso.inscriptos || 0;

// AHORA
const inscriptosActuales = await this.contarInscriptosActivos(curso.id);
```

#### **3. Actualización de `inscribirseACurso()`**
```javascript
// ANTES
const inscriptosActuales = curso.inscriptos || 0;
await updateDoc(cursoRef, {
    inscriptos: inscriptosActuales + 1
});

// AHORA
const inscriptosActuales = await this.contarInscriptosActivos(cursoId);
// Ya no se actualiza manualmente el contador
```

#### **4. Actualización del Panel Admin**
```javascript
// ANTES
const inscriptosActuales = curso.inscriptos || 0;

// AHORA
const inscriptosActuales = inscripcionesPorCurso[curso.id]?.filter(i => 
    ['pendiente', 'pagado', 'confirmado'].includes(i.estado)
).length || 0;
```

---

## 🛠️ **Métodos de Migración**

### **Sincronización Individual**
```javascript
// Sincronizar un curso específico
await window.cursosManager.sincronizarContadorCurso(cursoId);
```

### **Sincronización Masiva**
```javascript
// Sincronizar todos los cursos (desde consola de admin)
await window.cursosManager.sincronizarTodosLosContadores();
```

---

## 🎉 **Beneficios de la Solución**

### ✅ **Ventajas**
1. **Precisión absoluta**: Los cupos siempre reflejan la realidad
2. **Auto-corrección**: No requiere mantenimiento manual
3. **Robustez**: Resistente a errores de sincronización
4. **Transparencia**: Los usuarios ven cupos reales disponibles
5. **Migración suave**: Mantiene compatibilidad con contador legacy

### 📊 **Flujo Actualizado**
```
INSCRIPCIÓN:
Usuario se inscribe → Se crea inscripción "pendiente" → 
Cupos se calculan dinámicamente → Vista se actualiza

CANCELACIÓN:
Usuario cancela → Estado = "cancelado" → 
Cupos se calculan dinámicamente → Cupo se libera automáticamente

ELIMINACIÓN:
Admin elimina → Inscripción se elimina → 
Cupos se calculan dinámicamente → Cupo se libera automáticamente
```

---

## 🧪 **Casos de Prueba**

### **Test 1: Verificación de Cupos**
1. Crear curso con 5 cupos
2. Inscribir 5 usuarios
3. Verificar que aparece "Completo"
4. Cancelar 1 inscripción
5. ✅ **Debe mostrar "1 cupo disponible"**

### **Test 2: Estados Mixtos**
1. Curso con 3 cupos
2. 1 inscripción `pendiente`
3. 1 inscripción `pagado`
4. 1 inscripción `cancelado`
5. ✅ **Debe mostrar "1 cupo disponible" (solo cuenta 2 activos)**

### **Test 3: Sincronización Legacy**
1. Ejecutar `sincronizarTodosLosContadores()`
2. ✅ **Campo `inscriptos` debe coincidir con conteo real**

---

## 📈 **Rendimiento**

### **Consideraciones**
- **Consultas adicionales**: Cada tarjeta de curso hace 1 query extra
- **Optimización**: Las consultas son simples y están indexadas
- **Caché**: Firebase maneja caché automático de consultas recientes
- **Escalabilidad**: Viable hasta ~1000 inscripciones por curso

### **Monitoreo**
```javascript
// Los logs muestran el rendimiento
console.log(`✅ Cupos calculados para ${cursoId}: ${inscriptos} activos`);
```

---

## 🚀 **Próximos Pasos**

1. **Desplegar cambios** y monitorear funcionamiento
2. **Ejecutar sincronización masiva** en producción
3. **Verificar casos edge** con cursos existentes
4. **Considerar eliminar** campo `inscriptos` legacy en futuro
5. **Implementar caché local** si es necesario por rendimiento

---

## 🔍 **Rollback Plan**

Si surge algún problema, se puede revertir fácilmente:

```javascript
// Restaurar lógica anterior
const inscriptosActuales = curso.inscriptos || 0;
```

El campo `inscriptos` se mantiene como respaldo durante la transición.