# 🧪 Testing: Sistema de Controles y Pruebas

## 📋 Resumen del Sistema

### Controles (15 preguntas)
- **Paquete 1**: 5 controles por $4,900
- **Paquete 2**: 15 controles por $11,900  
- **Paquete 3**: 30 controles por $19,900

### Pruebas (45 preguntas)
- **Paquete 1**: 3 pruebas por $8,900
- **Paquete 2**: 10 pruebas por $18,900
- **Paquete 3**: 20 pruebas por $32,900

---

## 🚀 Pasos de Despliegue

### 1. Backend (Render)
```bash
cd /opt/render/project/src/backend

# Generar cliente Prisma
npx prisma generate

# Aplicar migración de base de datos
npx prisma migrate deploy

# Crear paquetes de controles
node scripts/create-control-packages.js

# Crear paquetes de pruebas
node scripts/create-exam-packages.js
```

### 2. Verificar Despliegue
- ✅ Backend: https://eunacom-backend-v3.onrender.com/health
- ✅ Frontend: https://eunacom-nuevo.vercel.app/

---

## 🎁 Otorgar Paquetes de Prueba (Para Testing)

### Opción 1: Script para otorgar paquete de controles
```bash
cd /opt/render/project/src/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'abonosaremko@gmail.com' }
    });
    
    if (!user) throw new Error('Usuario no encontrado');
    
    const controlPackage = await prisma.controlPackage.findFirst({
      where: { name: 'Paquete 5 Controles' }
    });
    
    if (!controlPackage) throw new Error('Paquete no encontrado');
    
    const purchase = await prisma.controlPurchase.create({
      data: {
        userId: user.id,
        packageId: controlPackage.id,
        controlsTotal: controlPackage.controlQty,
        controlsUsed: 0,
        status: 'ACTIVE',
      },
      include: { package: true }
    });
    
    console.log('✅ Paquete de controles otorgado:');
    console.log('   Usuario:', user.email);
    console.log('   Paquete:', purchase.package.name);
    console.log('   Controles:', purchase.controlsTotal);
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
```

### Opción 2: Script para otorgar paquete de pruebas
```bash
cd /opt/render/project/src/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'abonosaremko@gmail.com' }
    });
    
    if (!user) throw new Error('Usuario no encontrado');
    
    const examPackage = await prisma.examPackage.findFirst({
      where: { name: 'Paquete 3 Pruebas' }
    });
    
    if (!examPackage) throw new Error('Paquete no encontrado');
    
    const purchase = await prisma.examPurchase.create({
      data: {
        userId: user.id,
        packageId: examPackage.id,
        examsTotal: examPackage.examQty,
        examsUsed: 0,
        status: 'ACTIVE',
      },
      include: { package: true }
    });
    
    console.log('✅ Paquete de pruebas otorgado:');
    console.log('   Usuario:', user.email);
    console.log('   Paquete:', purchase.package.name);
    console.log('   Pruebas:', purchase.examsTotal);
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
```

---

## ✅ Checklist de Pruebas

### Controles (15 preguntas)
- [ ] Ver botón "📝 Controles (15 preguntas)" en dashboard
- [ ] Click en el botón abre ControlsDashboard
- [ ] Se muestra estadística de controles disponibles
- [ ] Se muestra la compra activa con controles restantes
- [ ] Click en "▶ Iniciar Nuevo Control" inicia un control
- [ ] Se muestran 15 preguntas con navegación
- [ ] Puedo responder preguntas (A, B, C, D)
- [ ] La barra de progreso avanza correctamente
- [ ] El navegador rápido muestra las 15 preguntas
- [ ] Click en "✓ Finalizar Control" completa el control
- [ ] Se muestran resultados con puntaje y tiempo
- [ ] Se muestra revisión detallada con explicaciones
- [ ] Respuestas correctas en verde, incorrectas en rojo
- [ ] Se muestra en el historial como completado

### Pruebas (45 preguntas)
- [ ] Ver botón "🎓 Pruebas (45 preguntas)" en dashboard
- [ ] Click en el botón abre ExamsDashboard
- [ ] Se muestra estadística de pruebas disponibles
- [ ] Se muestra la compra activa con pruebas restantes
- [ ] Click en "▶ Iniciar Nueva Prueba" inicia una prueba
- [ ] Se muestran 45 preguntas con navegación
- [ ] Puedo responder preguntas (A, B, C, D)
- [ ] La barra de progreso avanza correctamente
- [ ] El navegador rápido muestra las 45 preguntas (grid)
- [ ] Click en "✓ Finalizar Prueba" completa la prueba
- [ ] Se muestran resultados con puntaje y tiempo
- [ ] Se muestra revisión detallada con explicaciones
- [ ] Respuestas correctas en verde, incorrectas en rojo
- [ ] Se muestra en el historial como completado

### Tiendas
- [ ] Click en "+ Comprar más controles" abre ControlStore
- [ ] Se muestran los 3 paquetes de controles con precios
- [ ] Click en "+ Comprar más pruebas" abre ExamStore
- [ ] Se muestran los 3 paquetes de pruebas con precios

### Estadísticas
- [ ] ControlsDashboard muestra controles disponibles
- [ ] ControlsDashboard muestra controles completados
- [ ] ControlsDashboard muestra promedio de puntaje
- [ ] ExamsDashboard muestra pruebas disponibles
- [ ] ExamsDashboard muestra pruebas completadas
- [ ] ExamsDashboard muestra promedio de puntaje

### Navegación
- [ ] Botón "← Volver al Dashboard" funciona en controles
- [ ] Botón "← Volver al Dashboard" funciona en pruebas
- [ ] Botón "Salir" en sesión vuelve al dashboard
- [ ] Puedo navegar entre preguntas con "← Anterior" y "Siguiente →"
- [ ] Puedo navegar con el grid de números

---

## 🐛 Problemas Conocidos a Verificar

1. **Grid de 45 preguntas**: Verificar que se vea bien en diferentes tamaños de pantalla
2. **Tiempo transcurrido**: Verificar que se muestre correctamente durante la sesión
3. **Respuestas guardadas**: Verificar que al salir y volver, las respuestas persistan
4. **Resultados detallados**: Verificar que todas las explicaciones se muestren correctamente

---

## 📊 Datos de Prueba Sugeridos

### Usuario de Testing
- Email: `abonosaremko@gmail.com`
- Otorgar:
  - 1 paquete de 5 controles (para probar controles)
  - 1 paquete de 3 pruebas (para probar pruebas)

### Flujo de Prueba Completo
1. Login con usuario de testing
2. Ir a Controles y completar 1 control de 15 preguntas
3. Revisar resultados del control
4. Ir a Pruebas y completar 1 prueba de 45 preguntas
5. Revisar resultados de la prueba
6. Verificar que el historial muestre ambos
7. Verificar que las estadísticas se actualicen

---

## 🎯 Siguiente Fase (Después de Testing)

Una vez verificado que todo funciona:
1. **Implementar panel general de resultados** (histórico unificado)
2. **Integrar Flow.cl** para compra de paquetes
3. **Agregar más estadísticas** (por especialidad, tema, etc.)
4. **Implementar filtros** en el historial
5. **Agregar gráficos** de evolución de puntajes

---

## 📝 Notas

- Los controles y pruebas **NO consumen créditos**
- Son sistemas separados con sus propios paquetes de pago
- Las preguntas se seleccionan aleatoriamente de la base de datos
- Solo se muestran variaciones activas (`isVisible = true`)
- Se usa la versión más reciente de cada variación

