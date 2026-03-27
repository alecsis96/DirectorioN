# ✅ TESTING CHECKLIST - Admin Panel Incremental

## 🚀 Pre-Deploy Testing

### **1. Compilación**
```bash
□ npm run build
  └─ Sin errores TypeScript
  └─ Sin errores de importaciones
  └─ Sin errores de Tailwind
```

### **2. Layout & Navegación** 
**URL:** http://localhost:3000/admin

```bash
Desktop (>1024px):
□ Sidebar visible fijo en left
□ Logo "Admin Panel" visible
□ 6 items de navegación visibles
□ Section divider "MÁS" visible
□ Active state en item actual (fondo verde)
□ Hover state funciona (gris → verde)
□ Footer "Volver al sitio" visible

Mobile (<768px):
□ Hamburger menu visible (top-left)
□ Sidebar oculto por defecto
□ Click en hamburger abre sidebar
□ Overlay oscuro visible cuando sidebar abierto
□ Click en overlay cierra sidebar
□ Click en item cierra sidebar automáticamente
□ Animación smooth al abrir/cerrar
```

### **3. Inbox Virtual**
**URL:** http://localhost:3000/admin

```bash
Sin datos:
□ Empty state visible ("✅ ¡Todo al día!")
□ Botón "Ver todos los negocios" funciona

Con datos:
□ Header muestra "Operations Inbox"
□ Contador de items correcto (ej: "12 tareas")
□ Filtros visibles: Todos / Crítico / Atención / Pendiente
□ Contador en cada filtro correcto
□ Click en filtro funciona
□ Items agrupados por prioridad:
  └─ CRÍTICO (rojo) → primero
  └─ ATENCIÓN (amarillo) → segundo
  └─ PENDIENTE (azul) → tercero
```

### **4. Inbox Item Cards**

```bash
Visualización:
□ Icono correcto (📝/🔍/💳/⏰)
□ Nombre del negocio visible
□ Título descriptivo correcto
□ Badges de plan visible (👑/⭐/🆓)
□ Badges de categoría visible

Acciones (Applications):
□ Botón "✅ Aprobar" visible
□ Botón "❌ Rechazar" visible
□ Botón "📝 Solicitar info" visible

Acciones (Reviews):
□ Botón "✅ Publicar" visible
□ Botón "❌ Rechazar" visible

Acciones (Payments):
□ Botón "📧 Recordar" visible
□ Botón "⏸️ Suspender" visible
□ Botón "🔄 Extender" visible

Funcionalidad:
□ Click en acción muestra loading state
□ Loading state deshabilita todos los botones
□ Acción exitosa refresca la página
□ Acción fallida muestra alert
□ Item desaparece después de acción (si corresponde)
```

### **5. Acciones en Firestore**

**Aprobar Application:**
```bash
□ Navegar a /admin
□ Encontrar item tipo "application"
□ Click "✅ Aprobar"
□ Verificar en Firestore:
  └─ applications/{id}
      └─ status: "approved"
      └─ approvedAt: timestamp
□ Item desaparece del inbox
```

**Publicar Business:**
```bash
□ Navegar a /admin
□ Encontrar item tipo "review"
□ Click "✅ Publicar"
□ Verificar en Firestore:
  └─ businesses/{id}
      └─ businessStatus: "published"
      └─ publishedAt: timestamp
□ Item desaparece del inbox
```

**Rechazar:**
```bash
□ Click "❌ Rechazar"
□ Verificar status cambia a "rejected"
□ Item desaparece del inbox
```

**Extender plan:**
```bash
□ Encontrar item tipo "expiration"
□ Click "🔄 Extender"
□ Verificar en Firestore:
  └─ businesses/{id}
      └─ planExpiresAt: +30 días
      └─ extendedAt: timestamp
□ Item desaparece del inbox
```

**Suspender:**
```bash
□ Encontrar item tipo "payment"
□ Click "⏸️ Suspender"
□ Verificar en Firestore:
  └─ businesses/{id}
      └─ isActive: false
      └─ disabledReason: "payment_overdue"
      └─ suspendedAt: timestamp
```

### **6. Navegación entre rutas**

```bash
□ Click "Solicitudes" → /admin/applications
□ Click "Negocios" → /admin/businesses
□ Click "Pagos" → /admin/payments
□ Click "Reseñas" → /admin/reviews
□ Click "Analytics" → /admin/analytics
□ Click "Inbox" → /admin
□ Active state se actualiza correctamente
□ Sidebar permanece fija al navegar (desktop)
□ Content area cambia correctamente
```

### **7. Compatibilidad con rutas legacy**

```bash
□ /admin/businesses funciona (si existe)
□ /admin/applications funciona (si existe)
□ /admin/payments funciona (si existe)
□ Ninguna ruta devuelve 404
□ Layout se aplica a todas las rutas admin
```

### **8. Responsive**

**Tablet (768px - 1024px):**
```bash
□ Sidebar visible fijo
□ Content area ajusta width
□ Cards mantienen legibilidad
□ Botones no se solapan
```

**Mobile (<768px):**
```bash
□ Hamburger menu funciona
□ Sidebar drawer smooth animation
□ Cards stack verticalmente
□ Botones apilados (column) si es necesario
□ Texto no se corta
□ Touch targets >44px
```

### **9. Performance**

```bash
□ /admin carga en <2s (50 items)
□ No flash of unstyled content (FOUC)
□ No layout shift (CLS <0.1)
□ Filtros responden instantly
□ Acciones responden <500ms
□ No memory leaks (verificar DevTools)
```

### **10. Errores & Edge Cases**

```bash
□ Sin auth token → redirect a /para-negocios?auth=required
□ Token inválido → redirect a /?auth=forbidden
□ No admin role → redirect a /?auth=forbidden
□ Firestore query falla → inbox vacío (no crash)
□ API action falla → muestra alert, no crash
□ No internet → loading infinito (acceptable)
```

### **11. Console & Network**

```bash
□ No errores en console
□ No warnings críticos
□ API calls exitosos (200)
□ No requests duplicados
□ No CORS errors
□ Firestore queries optimizados (<100 reads)
```

---

## 🐛 Problemas Comunes

### **Sidebar no aparece**
```bash
1. Verificar que carpeta es (operations) con paréntesis
2. Verificar import de AdminSidebar correcto
3. Verificar Tailwind compilado (npm run dev)
4. Verificar z-index no bloqueado por otro elemento
```

### **Inbox items vacíos**
```bash
1. Verificar que existen applications con status='pending'
2. Verificar que existen businesses con businessStatus='in_review'
3. Verificar planExpiresAt tiene valores vencidos
4. Agregar logs en page.tsx:
   console.log('Applications:', applicationsSnap.size);
   console.log('In Review:', inReviewSnap.size);
   console.log('Payments:', paymentsSnap.size);
```

### **Acciones no funcionan**
```bash
1. Verificar /api/admin/inbox-action existe
2. Verificar Network tab (should be POST 200)
3. Verificar Firestore permissions
4. Verificar admin auth funciona
5. Agregar logs en API route
```

### **Active state incorrecto**
```bash
1. Verificar pathname comparison en AdminSidebar
2. Verificar href exacto (sin trailing slash)
3. Agregar debug: console.log('pathname:', pathname);
```

---

## 📊 Datos de Prueba

### **Crear Application de prueba**

```javascript
// En Firestore Console
Collection: applications
Document ID: auto
Data:
{
  businessName: "Test Negocio",
  status: "pending",
  plan: "featured",
  email: "test@example.com",
  createdAt: [timestamp actual]
}
```

### **Crear Business en revisión**

```javascript
Collection: businesses
Document ID: auto
Data:
{
  businessName: "Negocio en Revisión",
  businessStatus: "in_review",
  plan: "free",
  category: "restaurantes",
  createdAt: [timestamp actual]
}
```

### **Crear Payment vencido**

```javascript
Collection: businesses
Document ID: auto
Data:
{
  businessName: "Negocio Vencido",
  plan: "sponsor",
  planExpiresAt: [timestamp 10 días atrás],
  isActive: true
}
```

---

## ✅ Sign-off

```bash
□ Todos los tests pasaron
□ No errores en console
□ Build exitoso
□ Screenshots tomados
□ Ready para deploy

Probado por: _______________
Fecha: _______________
```

---

**Total items:** 80+  
**Tiempo estimado:** 2-3 horas de testing exhaustivo
