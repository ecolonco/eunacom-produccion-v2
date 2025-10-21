# Estado Baseline - ANTES de Optimizaciones SEO

**Fecha**: 18 de Enero 2025
**Commit**: `78f75fa` (main)
**Tag respaldo**: `backup-pre-seo-2025`
**Branch de trabajo**: `feature/seo-optimization`

---

## Verificación de Build

### ✅ Build Status: FUNCIONAL

```bash
npx vite build
```

**Resultado**:
- ✅ Build completa exitosamente
- ⚠️ Advertencias de TypeScript (preexistentes, no bloquean build)
- ⚠️ Chunk > 500KB detectado

**Archivos generados** (`dist/`):
- `index.html`: 3.88 kB (gzip: 1.25 kB)
- `assets/index-B04WqRgw.css`: 47.44 kB (gzip: 8.60 kB)
- `assets/vendor-D6dulaxt.js`: 11.89 kB (gzip: 4.24 kB)
- `assets/query-O8X2bcnq.js`: 35.53 kB (gzip: 10.67 kB)
- `assets/index-Cg8kv_Oc.js`: **593.02 kB** (gzip: 146.57 kB) ⚠️

**Problemas identificados**:
1. **Bundle demasiado grande**: 593 KB en un solo archivo JavaScript
2. **No hay code splitting**: Todo el código se carga de inmediato
3. **Errores TypeScript**: 44 errores (no bloquean build, pero deberían corregirse)

---

## Estructura Actual del Proyecto

### Páginas HTML estáticas existentes (indexables):
- ✅ `/public/index.html` - Landing page (pero contenido en React, no visible para crawlers)
- ✅ `/public/faq.html` - 764 líneas, Schema.org FAQPage ⭐
- ✅ `/public/about.html` - 664 líneas, Schema.org AboutPage
- ✅ `/public/terminos.html` - 427 líneas

### Imágenes sociales:
- ❌ `/public/og-image.png` - NO EXISTE
- ❌ `/public/twitter-image.png` - NO EXISTE
- ❌ `/public/logo.png` - NO EXISTE
- ❌ `/public/apple-touch-icon.png` - NO EXISTE

### Meta tags en index.html:
- ✅ Title optimizado
- ✅ Meta description
- ✅ Open Graph tags (pero imágenes no existen)
- ✅ Twitter Cards (pero imágenes no existen)
- ✅ Canonical tags
- ✅ Schema.org EducationalOrganization

### Sitemap y Robots:
- ✅ `/public/sitemap.xml` - Bien estructurado
- ✅ `/public/robots.txt` - Configurado para LLM crawlers ⭐

---

## Problema Crítico Identificado

### 🔴 SPA sin SSR/SSG

**El contenido principal NO es indexable por crawlers.**

Al hacer "Ver código fuente" en el navegador, los crawlers ven:

```html
<!DOCTYPE html>
<html lang="es-CL">
  <head>
    <!-- Meta tags excelentes ✓ -->
  </head>
  <body>
    <div id="root"></div> <!-- VACÍO -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

El contenido rico (hero, features, testimonials, sección EUNACOM, etc.) solo aparece **DESPUÉS** de que JavaScript se ejecuta en el navegador.

**Impacto**:
- Google/Bing ven una página vacía
- No indexan el contenido textual principal
- Solo indexan meta tags (que sí están en HTML)

---

## Métricas Baseline (Pre-optimización)

### Bundle Size
- **Total JavaScript**: 640.44 KB (sin comprimir)
- **Total JavaScript (gzip)**: 161.48 KB
- **Total CSS**: 47.44 KB (sin comprimir)
- **Total CSS (gzip)**: 8.60 KB

**Total página completa**: ~688 KB sin comprimir, ~170 KB comprimido

### Lighthouse (Pendiente)

> **ACCIÓN REQUERIDA**: El usuario debe ejecutar Lighthouse manualmente:
>
> ```bash
> npm install -g lighthouse
> lighthouse https://eunacom-nuevo.vercel.app/ \
>   --output html \
>   --output-path ./docs/lighthouse/baseline-2025-01-18.html \
>   --only-categories=performance,seo,accessibility,best-practices
> ```

**Métricas esperadas** (según análisis previo):
- Performance: ~65/100 (móvil)
- SEO: ~85/100
- Accessibility: ~80/100
- Best Practices: ~85/100

### Core Web Vitals (Estimado)
- **LCP**: ~3.2s (móvil) - 🔴 Necesita mejorar (objetivo: <2.5s)
- **FID**: ~150ms (móvil) - 🟡 Aceptable (objetivo: <100ms)
- **CLS**: ~0.05 - ✅ Bueno (objetivo: <0.1)

---

## Puntuación SEO Baseline

### Según análisis ANALISIS-SEO-2025.md:

| Categoría | Puntuación | Estado |
|-----------|------------|--------|
| Meta Tags & OG | 9/10 | ✅ Excelente |
| Structured Data | 8/10 | ✅ Muy bueno |
| Robots.txt & Sitemap | 10/10 | ✅ Perfecto |
| **Contenido Indexable** | **3/10** | ❌ **CRÍTICO** |
| Performance | 6/10 | ⚠️ Mejorable |
| Imágenes | 2/10 | ❌ Requiere atención |
| Arquitectura SEO | 4/10 | ❌ Problema estructural |

**PUNTUACIÓN TOTAL**: **6.5/10**

---

## Componentes React Principales

### Detectados en src/:
- `App.tsx` - Componente principal con landing
- `main.tsx` - Entry point
- `components/Dashboard.tsx` - Dashboard de usuario
- `components/ExerciseFactory.tsx` - Fábrica de ejercicios
- `components/admin/QASweep2Panel.tsx` - Panel QA Sweep
- `components/student/MockExamSession.tsx` - Sesiones de examen
- `components/TaxonomyAdmin.tsx` - Admin de taxonomía
- Muchos más...

**Total de módulos transformados en build**: 511 módulos

---

## Próximos Pasos (ETAPA 1)

### Quick Wins a implementar:
1. Crear 4 imágenes sociales
2. Agregar fallback `<noscript>`
3. Convertir landing a HTML semántico (header, nav, main, section, footer)
4. Actualizar referencias de imágenes en meta tags

**Impacto esperado**: +0.5 puntos SEO (6.5 → 7.0)

---

## Notas Técnicas

### Errores TypeScript detectados (no bloquean build):
- MockExamResults.tsx: Variables no usadas, propiedades faltantes
- TaxonomyAdmin.tsx: Índices implícitos any
- AuthContext.tsx: Respuestas no usadas
- ExerciseFactory.tsx: Variables no usadas
- main.tsx: Imports no usados (apps de testing)
- TestApp4.tsx, WorkingApp.tsx: Errores de tipos

**Recomendación**: Corregir estos errores en una sesión separada (no urgente para SEO).

### Advertencia de Vite:
```
Some chunks are larger than 500 kB after minification.
Consider:
- Using dynamic import() to code-split
- Use manualChunks to improve chunking
```

**Resolución planeada**: ETAPA 5 (Performance optimization con lazy loading)

---

**Documento generado**: 18 Enero 2025, 23:25
**Autor**: Claude Code
**Propósito**: Registro del estado del proyecto antes de implementar optimizaciones SEO
