// 🧪 Script de Prueba: Sistema de Cupos Dinámico
// Ejecutar desde la consola del navegador para probar la corrección

console.log('🧪 Iniciando pruebas del sistema de cupos dinámico...');

// Test 1: Verificar que el método existe
async function test1_metodoExiste() {
    console.log('\n📋 Test 1: Verificando método contarInscriptosActivos...');
    
    if (typeof window.cursosManager?.contarInscriptosActivos === 'function') {
        console.log('✅ Método contarInscriptosActivos existe');
        return true;
    } else {
        console.log('❌ Método contarInscriptosActivos NO existe');
        return false;
    }
}

// Test 2: Contar inscriptos de un curso específico
async function test2_contarInscriptos(cursoId) {
    console.log(`\n📋 Test 2: Contando inscriptos para curso ${cursoId}...`);
    
    try {
        const count = await window.cursosManager.contarInscriptosActivos(cursoId);
        console.log(`✅ Inscriptos activos: ${count}`);
        return count;
    } catch (error) {
        console.log('❌ Error contando inscriptos:', error);
        return null;
    }
}

// Test 3: Comparar contador legacy vs dinámico
async function test3_compararContadores() {
    console.log('\n📋 Test 3: Comparando contadores legacy vs dinámico...');
    
    if (!window.cursosManager.cursos || window.cursosManager.cursos.length === 0) {
        console.log('⚠️  No hay cursos cargados. Ejecuta window.cursosManager.loadCursos() primero');
        return;
    }
    
    for (const curso of window.cursosManager.cursos.slice(0, 3)) { // Solo primeros 3 cursos
        const contadorLegacy = curso.inscriptos || 0;
        const contadorDinamico = await window.cursosManager.contarInscriptosActivos(curso.id);
        
        const status = contadorLegacy === contadorDinamico ? '✅' : '⚠️';
        console.log(`${status} Curso "${curso.nombre}": Legacy=${contadorLegacy}, Dinámico=${contadorDinamico}`);
    }
}

// Test 4: Sincronizar un curso específico
async function test4_sincronizarCurso(cursoId) {
    console.log(`\n📋 Test 4: Sincronizando curso ${cursoId}...`);
    
    try {
        await window.cursosManager.sincronizarContadorCurso(cursoId);
        console.log('✅ Sincronización exitosa');
        return true;
    } catch (error) {
        console.log('❌ Error en sincronización:', error);
        return false;
    }
}

// Test Suite Completo
async function ejecutarTestsCompletos() {
    console.log('🚀 Ejecutando suite completa de pruebas...\n');
    
    // Test 1
    const metodoExiste = await test1_metodoExiste();
    if (!metodoExiste) {
        console.log('❌ Pruebas interrumpidas: método no existe');
        return;
    }
    
    // Test 3
    await test3_compararContadores();
    
    console.log('\n🎉 Pruebas completadas. Revisa los resultados arriba.');
    console.log('\n📖 Comandos útiles:');
    console.log('- test2_contarInscriptos("CURSO_ID") - Contar inscriptos de un curso');
    console.log('- test4_sincronizarCurso("CURSO_ID") - Sincronizar un curso específico');
    console.log('- window.cursosManager.sincronizarTodosLosContadores() - Sincronizar todos');
}

// Función de ayuda para mostrar inscripciones de un curso
async function mostrarInscripcionesCurso(cursoId) {
    console.log(`\n📊 Inscripciones del curso ${cursoId}:`);
    
    try {
        const inscripciones = await getDocs(query(
            collection(db, 'inscripciones'),
            where('cursoId', '==', cursoId)
        ));
        
        const estados = {};
        inscripciones.forEach(doc => {
            const estado = doc.data().estado;
            estados[estado] = (estados[estado] || 0) + 1;
        });
        
        console.log('Estados de inscripciones:');
        Object.entries(estados).forEach(([estado, cantidad]) => {
            const esActivo = ['pendiente', 'pagado', 'confirmado'].includes(estado);
            const icono = esActivo ? '✅' : '❌';
            console.log(`  ${icono} ${estado}: ${cantidad}`);
        });
        
        const activos = (estados.pendiente || 0) + (estados.pagado || 0) + (estados.confirmado || 0);
        console.log(`\n📈 Total activos: ${activos}`);
        console.log(`📊 Total cancelados: ${estados.cancelado || 0}`);
        
    } catch (error) {
        console.log('❌ Error consultando inscripciones:', error);
    }
}

// Exportar funciones para uso global
window.testCupos = {
    test1_metodoExiste,
    test2_contarInscriptos,
    test3_compararContadores,
    test4_sincronizarCurso,
    ejecutarTestsCompletos,
    mostrarInscripcionesCurso
};

console.log('✅ Script de pruebas cargado');
console.log('🔧 Usa: await testCupos.ejecutarTestsCompletos()');
console.log('📋 O ejecuta pruebas individuales desde testCupos.*');