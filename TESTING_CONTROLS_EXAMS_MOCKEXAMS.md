# Guía de Testing: Controles, Pruebas y Ensayos EUNACOM

## Resumen de los Sistemas Implementados

### 1. **Controles (15 preguntas)**
- Paquetes de 5, 15, y 30 controles
- Evaluaciones rápidas para práctica continua
- Sin consumo de créditos

### 2. **Pruebas (45 preguntas)**
- Paquetes de 3, 10, y 20 pruebas
- Evaluaciones intermedias para medir preparación
- Sin consumo de créditos

### 3. **Ensayos EUNACOM (180 preguntas)**
- Paquetes de 1, 3, y 5 ensayos
- **Simulación completa del examen EUNACOM real**
- Sin consumo de créditos
- Grid de navegación optimizado para 180 preguntas

---

## Deployment Steps

### 1. Backend (Render)
El backend ya está desplegado y compilando correctamente con:
- `mock-exam.service.ts`
- `mock-exam.routes.ts`
- `admin-mock-exams.routes.ts`
- Rutas registradas en `index.ts`

### 2. Base de Datos (Render Shell)
```bash
# Conectar a Render shell y ejecutar:
cd /opt/render/project/src/backend
npx prisma migrate deploy
```

Esta migración creará las tablas:
- `mock_exam_packages`
- `mock_exam_purchases`
- `mock_exams`
- `mock_exam_questions`
- `mock_exam_answers`

### 3. Crear Paquetes Iniciales
```bash
# En Render shell, crear los 3 paquetes de ensayos:
node scripts/create-mock-exam-packages.js
```

Este script creará:
- **Paquete 1 Ensayo**: $6,900 (1 ensayo de 180 preguntas)
- **Paquete 3 Ensayos**: $14,900 (3 ensayos de 180 preguntas)
- **Paquete 5 Ensayos**: $22,900 (5 ensayos de 180 preguntas)

### 4. Otorgar Paquete de Prueba a Usuario (Opcional)
Para testing, puedes otorgar un paquete gratis a un usuario:
```bash
# Editar el script primero con el email del usuario de prueba
node scripts/grant-mock-exam-package-to-user.js
```

---

## Testing Checklist

### ✅ Fase 1: Verificación de Backend
1. [ ] Backend desplegó sin errores en Render
2. [ ] Migración de base de datos aplicada exitosamente
3. [ ] Script de paquetes ejecutado correctamente
4. [ ] Verificar en consola Render que no hay errores 500

### ✅ Fase 2: Verificación de Frontend
1. [ ] Vercel desplegó sin errores
2. [ ] Botón "🎯 Ensayos EUNACOM (180 preguntas)" visible en dashboard de estudiante
3. [ ] Al hacer clic, se muestra el MockExamsDashboard

### ✅ Fase 3: Testing de Controles (15 preguntas)
1. [ ] Ver paquetes disponibles
2. [ ] Iniciar un control
3. [ ] Responder las 15 preguntas
4. [ ] Finalizar control (sin diálogo de confirmación)
5. [ ] Ver resultados con score y revisión detallada
6. [ ] Verificar historial de controles completados

### ✅ Fase 4: Testing de Pruebas (45 preguntas)
1. [ ] Ver paquetes disponibles
2. [ ] Iniciar una prueba
3. [ ] Navegar entre las 45 preguntas
4. [ ] Responder preguntas
5. [ ] Finalizar prueba
6. [ ] Ver resultados detallados
7. [ ] Verificar historial

### ✅ Fase 5: Testing de Ensayos EUNACOM (180 preguntas) **[NUEVO]**
1. [ ] Ver paquetes de ensayos en la tienda
   - Verificar 3 paquetes con precios correctos
   - Verificar descripción "180 preguntas"
2. [ ] Verificar estadísticas en dashboard:
   - Ensayos disponibles
   - Ensayos completados
   - Promedio de puntaje
3. [ ] Iniciar un ensayo nuevo
   - Verificar que se cargan 180 preguntas
   - Verificar barra de progreso
   - Verificar contador de tiempo
4. [ ] Navegar por las preguntas:
   - Usar botones "Anterior" y "Siguiente"
   - Usar grid de navegación rápida (20 columnas × 9 filas)
   - Verificar que las preguntas respondidas se marcan en verde
5. [ ] Responder al menos 20 preguntas distribuidas
6. [ ] Finalizar el ensayo:
   - Presionar "✓ Finalizar Ensayo" en la pregunta 180
   - Verificar que se muestran resultados inmediatamente
7. [ ] Ver resultados:
   - Verificar % de puntaje
   - Verificar preguntas correctas/incorrectas
   - Verificar tiempo total transcurrido
   - Revisar cada pregunta con explicaciones
8. [ ] Verificar historial:
   - Ver ensayos completados
   - Ver puntajes y fechas
   - Poder ver resultados de ensayos anteriores

### ✅ Fase 6: Testing de Integración
1. [ ] Iniciar un control, completarlo, y luego iniciar una prueba
2. [ ] Iniciar una prueba, completarla, y luego iniciar un ensayo
3. [ ] Completar un ensayo y verificar que el contador de ensayos usados aumenta
4. [ ] Verificar que se puede iniciar otro ensayo si hay disponibles
5. [ ] Verificar que no se puede iniciar un ensayo si no hay disponibles

### ✅ Fase 7: Testing de Compra (Cuando se integre Flow.cl)
1. [ ] Intentar comprar paquete de 1 ensayo ($6,900)
2. [ ] Intentar comprar paquete de 3 ensayos ($14,900)
3. [ ] Intentar comprar paquete de 5 ensayos ($22,900)
4. [ ] Verificar que aparece mensaje "Compra próximamente disponible"

---

## Script de Prueba Rápida (Render Shell)

### Crear y otorgar paquete de ensayos a usuario de prueba:

```bash
# 1. Crear paquetes
node scripts/create-mock-exam-packages.js

# 2. Crear script para otorgar ensayo a usuario
cat > scripts/grant-mock-exam-package-to-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userEmail = 'TU_EMAIL_AQUI@gmail.com'; // <-- CAMBIAR ESTO
  
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  });
  
  if (!user) {
    console.error('Usuario no encontrado');
    return;
  }
  
  const mockExamPackage = await prisma.mockExamPackage.findFirst({
    where: { name: 'Paquete 1 Ensayo' }
  });
  
  if (!mockExamPackage) {
    console.error('Paquete no encontrado');
    return;
  }
  
  const purchase = await prisma.mockExamPurchase.create({
    data: {
      userId: user.id,
      packageId: mockExamPackage.id,
      mockExamsTotal: mockExamPackage.mockExamQty,
      mockExamsUsed: 0,
      status: 'ACTIVE'
    }
  });
  
  console.log('✅ Ensayo otorgado exitosamente');
  console.log('   Usuario:', userEmail);
  console.log('   Paquete:', mockExamPackage.name);
  console.log('   Ensayos disponibles:', purchase.mockExamsTotal);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

# 3. Ejecutar (después de editar el email)
node scripts/grant-mock-exam-package-to-user.js
```

---

## Problemas Conocidos y Soluciones

### 1. Grid de 180 preguntas no se ve completo
**Solución**: El CSS de Tailwind incluye `grid-cols-20`. Si no funciona, se puede ajustar a `grid-cols-10` con 18 filas.

### 2. Tiempo de carga largo al iniciar ensayo
**Comportamiento esperado**: 180 preguntas tardan más en cargar que 15 o 45. Considerar agregar mensaje "Preparando tu ensayo de 180 preguntas..."

### 3. "No hay suficientes preguntas disponibles"
**Solución**: Verificar que hay al menos 180 variaciones activas (`isVisible = true`) en la base de datos.

---

## Flujo de Testing Sugerido

1. **Login** como estudiante
2. **Completar 1 control** (15 preguntas) - 5 minutos
3. **Completar 1 prueba** (45 preguntas) - 15 minutos
4. **Completar 1 ensayo parcial** (responder solo 30 preguntas de 180 para testing rápido)
5. **Finalizar ensayo** y ver resultados
6. **Verificar historial** de los 3 tipos de evaluaciones

---

## Próxima Fase: Panel Estadístico Unificado

**Objetivo**: Crear un panel que muestre todas las estadísticas de:
- Controles completados (15 preguntas)
- Pruebas completadas (45 preguntas)
- Ensayos completados (180 preguntas)
- Promedio general
- Tiempo total invertido
- Gráficos de evolución

**Ubicación sugerida**: Nuevo botón en dashboard "📊 Mis Resultados"

---

## Comandos Útiles

```bash
# Verificar migraciones aplicadas
npx prisma migrate status

# Ver registros de ensayos en DB
npx prisma studio
# Navegar a mock_exams, mock_exam_packages, mock_exam_purchases

# Logs de Render en tiempo real
# (Usar UI de Render para ver logs en vivo)
```

---

## Checklist de Deployment

- [x] Schema de Prisma extendido
- [x] Migración SQL creada
- [x] Backend service implementado
- [x] Rutas de API implementadas
- [x] Frontend service (API client) implementado
- [x] Componentes de UI creados (Store, Session, Results, Dashboard)
- [x] Integración en StudentDashboard
- [x] Commits y push a GitHub
- [ ] **Aplicar migración en Render** ⬅️ **SIGUIENTE PASO**
- [ ] **Crear paquetes con script**
- [ ] **Testing completo**
- [ ] **Panel estadístico unificado** (Fase 2)

---

¡El sistema de Ensayos EUNACOM está listo para testing! 🎯

