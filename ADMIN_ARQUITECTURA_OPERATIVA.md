# Arquitectura Admin: Torre de Control Operativa

> **Diseñado como:** Staff Product Designer experto en dashboards operativos SaaS  
> **Objetivo:** Panel operativo para gestionar 200+ negocios sin caos  
> **Principio:** Reducir carga cognitiva, maximizar velocidad, minimizar clics

---

## 🎯 Filosofía de Diseño

**NO es:** Dashboard bonito con gráficas decorativas  
**SÍ es:** Torre de control operativa centrada en acciones rápidas

**Principios Core:**
1. **Jerarquía por frecuencia de uso** - Lo más usado, siempre visible
2. **Zero clicks innecesarios** - Acciones inline donde sea posible
3. **Información útil, no bonita** - Tablas densas > cards amplios
4. **Estados claros** - Colores funcionales solo para alertas
5. **Keyboard-first** - Todo debe ser navegable por teclado

---

## 📐 Nueva Estructura de Navegación

### Arquitectura de 3 Capas

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Sidebar Fijo (siempre visible)                   │
│  ├─ 🏠 Dashboard Ejecutivo                                  │
│  ├─ 📥 Solicitudes (badge: pendientes)                      │
│  ├─ 🏪 Negocios                                             │
│  ├─ 💰 Facturación (badge: vencidos)                        │
│  ├─ 📦 Inventario Premium                                   │
│  └─ ⚠️ Alertas (badge: críticas)                            │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Área de Trabajo (contenido principal)            │
│  - Vista de tabla/kanban según módulo                       │
│  - Filtros persistentes en sticky header                    │
│  - Acciones inline rápidas                                  │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: Panel Lateral (contextual)                        │
│  - Aparece al seleccionar registro                          │
│  - Acciones rápidas sin modal                               │
│  - Historial y notas inline                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Módulos Detallados

### 1️⃣ Dashboard Ejecutivo (`/admin`)

**Propósito:** Vista de 5 segundos del estado del negocio sin scroll.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  KPIs Críticos (4 columnas grid)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 🏪 47   │ │ ⭐ 12   │ │ 👑 3    │ │ 💰 $4.2K │       │
│  │ Activos │ │Featured │ │Sponsor  │ │  MRR     │       │
│  │ +2 mes  │ │ 3 disp. │ │ 2 disp. │ │ +12%     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├──────────────────────────────────────────────────────────┤
│  Alertas Críticas (solo si existen)                       │
│  🔴 3 negocios vencen en <7 días                         │
│  🟡 5 espacios featured disponibles (Centro)             │
├──────────────────────────────────────────────────────────┤
│  Actividad Hoy                                           │
│  • 2 solicitudes nuevas → Ver                            │
│  • 1 pago pendiente confirmación → Revisar               │
│  • 4 negocios sin actividad >30 días → Contactar         │
├──────────────────────────────────────────────────────────┤
│  Accesos Rápidos (botones grandes)                       │
│  [Aprobar Solicitudes] [Ver Vencimientos] [Inventario]  │
└──────────────────────────────────────────────────────────┘
```

**Datos mostrados:**
- Negocios activos (por plan)
- MRR (Monthly Recurring Revenue)
- Espacios premium disponibles (por zona)
- Renovaciones próximas (7/14/30 días)
- Solicitudes pendientes aprobación
- Alertas críticas (solo si existen)

**Acciones rápidas inline:**
- Click en "Activos" → Tabla de negocios filtrada
- Click en "3 disp." → Inventario de esa zona
- Click en alertas → Vista filtrada del problema

**Implementación:**
```tsx
// app/admin/page.tsx
- Server Component que calcula KPIs
- Sin gráficas decorativas, solo números
- Grid responsive: 4 cols desktop, 2 cols mobile
- Colores: solo rojo/amarillo para alertas
```

---

### 2️⃣ Solicitudes (`/admin/solicitudes`)

**Propósito:** Kanban operativo para aprobar negocios en segundos.

**Layout Kanban:**
```
┌─────────────┬─────────────┬──────────────┐
│ 📥 NUEVAS   │ ⏳ PROCESO  │ ✅ LISTAS    │
│    (5)      │    (2)      │    (3)       │
├─────────────┼─────────────┼──────────────┤
│ [Card 1]    │ [Card 4]    │ [Card 7]     │
│             │             │              │
│ [Card 2]    │ [Card 5]    │ [Card 8]     │
│             │             │              │
│ [Card 3]    │             │ [Card 9]     │
│             │             │              │
│ ...         │ ...         │ ...          │
└─────────────┴─────────────┴──────────────┘
        👆 Drag & drop para mover
```

**Card Compacto (diseño funcional):**
```
┌────────────────────────────────────┐
│ 🍕 Pizzería Don Carlo              │
│ Centro • pizza@ejemplo.com         │
│ Plan: Featured • Alta Asistida    │
│                                    │
│ [Ver Detalles] [✅ Aprobar] [❌]   │
└────────────────────────────────────┘
```

**Columnas del Kanban:**
1. **Nuevas** - Solicitudes sin revisar
2. **En Proceso** - Revisión en curso (falta info)
3. **Listas para publicar** - Aprobadas, listas para activar

**Acciones inline:**
- ✅ Aprobar y publicar (1 click)
- 👁️ Ver detalles en panel lateral
- 📝 Solicitar más información
- ❌ Rechazar con motivo
- 🔄 Mover entre columnas (drag & drop)

**Filtros sticky:**
- Plan solicitado
- Zona
- Alta asistida (sí/no)
- Fecha solicitud

**Panel Lateral (al seleccionar card):**
```
┌──────────────────────────────┐
│ Pizzería Don Carlo           │
├──────────────────────────────┤
│ • Nombre: [editable]         │
│ • Categoría: Restaurantes    │
│ • Dirección: Calle...        │
│ • Teléfono: 919...           │
│ • Fotos: 3 subidas           │
│ • Horarios: Lun-Dom 10-22    │
├──────────────────────────────┤
│ Plan: Featured - $99/mes     │
│ Pago: Transferencia          │
│ Comprobante: [ver imagen]    │
├──────────────────────────────┤
│ Acciones:                    │
│ [✅ Aprobar y Publicar]      │
│ [📝 Solicitar Info]          │
│ [❌ Rechazar]                │
├──────────────────────────────┤
│ Notas internas:              │
│ [Textarea para el admin]     │
│ [Guardar]                    │
└──────────────────────────────┘
```

**Implementación:**
```tsx
// app/admin/solicitudes/page.tsx
- Client Component con react-beautiful-dnd
- Fetch desde /api/admin/applications?status=all
- Estado local para drag & drop
- Mutate optimista para UX rápida
- Panel lateral con Radix UI Drawer
```

---

### 3️⃣ Negocios (`/admin/negocios`)

**Propósito:** Base de datos maestra de negocios publicados con acciones rápidas.

**Layout Tabla Densa:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Filtros: [Plan ▼] [Zona ▼] [Categoría ▼] [Status ▼] [Buscar...]   │
├──────────────────────────────────────────────────────────────────────┤
│ Nombre        │ Plan    │ Vence    │ Zona   │ Status  │ Acciones  │
├───────────────┼─────────┼──────────┼────────┼─────────┼───────────┤
│ Pizzería DC   │ ⭐ Feat │ 5d 🔴   │ Centro │ ✅ Activ│ [...▼]   │
│ Café Luna     │ 👑 Spon │ 23d ✅  │ Norte  │ ✅ Activ│ [...▼]   │
│ Taller Auto   │ 🆓 Free │ -       │ Sur    │ ✅ Activ│ [...▼]   │
│ Tienda Ropa   │ ⭐ Feat │ 3d 🟡   │ Centro │ ⚠️ Susp │ [...▼]   │
│ ...           │ ...     │ ...     │ ...    │ ...     │ ...       │
└──────────────────────────────────────────────────────────────────────┘
       👆 Click en fila para abrir panel lateral
```

**Indicadores visuales funcionales:**
- 🔴 Vence en <7 días
- 🟡 Vence en 7-14 días
- ✅ Vence en >14 días
- ⚠️ Suspendido/Pago pendiente
- 🆓 Free / ⭐ Featured / 👑 Sponsor

**Acciones inline (menú dropdown [...]):**
```
Acciones rápidas:
├─ 📈 Upgrade a Featured
├─ 👑 Upgrade a Sponsor
├─ 📉 Downgrade a Free
├─ ✅ Marcar como pagado
├─ ⭐ Destacar temporalmente
├─ ⏸️ Suspender
├─ ✏️ Editar
├─ 📊 Ver estadísticas
└─ 🗑️ Eliminar
```

**Filtros persistentes (sticky):**
- Plan: All / Free / Featured / Sponsor
- Vencimiento: Todos / <7d / 7-14d / 14-30d / >30d
- Status: Activo / Suspendido / Por vencer
- Categoría: (lista completa)
- Zona: (lista completa)
- Búsqueda: Por nombre, email, teléfono

**Panel Lateral Detallado:**
```
┌──────────────────────────────┐
│ [Foto negocio]               │
│ Pizzería Don Carlo           │
│ ⭐ Featured • Centro          │
├──────────────────────────────┤
│ Propietario:                 │
│ Juan Pérez                   │
│ juan@pizza.com               │
│ 919-123-4567                 │
├──────────────────────────────┤
│ Plan Actual: Featured        │
│ Vence: 15/02/2026 (5 días)🔴│
│ Último pago: 15/01/2026      │
│ Próximo pago: $99            │
│                              │
│ [💰 Marcar como pagado]      │
│ [📈 Upgrade a Sponsor]       │
│ [📉 Downgrade]               │
├──────────────────────────────┤
│ Métricas (último mes):       │
│ 234 vistas                   │
│ 18 clicks WhatsApp           │
│ 12 clicks mapa               │
│ 4.8⭐ (15 reseñas)           │
├──────────────────────────────┤
│ Historial:                   │
│ • 15/01 - Pago $99 recibido  │
│ • 10/01 - Upgrade a Featured │
│ • 05/12 - Creado (Free)      │
├──────────────────────────────┤
│ Notas admin:                 │
│ [Textarea]                   │
│ [Guardar nota]               │
└──────────────────────────────┘
```

**Acciones masivas (selección múltiple):**
- Enviar recordatorio de pago
- Exportar seleccionados
- Cambiar plan en lote
- Suspender en lote

**Implementación:**
```tsx
// app/admin/negocios/page.tsx
- Server Component con RSC
- Paginación server-side (50 por página)
- Filtros en URL params para shareability
- Panel lateral: Radix Drawer
- Acciones: Server Actions
- Tabla: TanStack Table o custom con virtualization
```

---

### 4️⃣ Facturación (`/admin/facturacion`)

**Propósito:** Control de ingresos aunque sea manual.

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Resumen Financiero (3 cards)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ MRR Actual  │ │ Por Cobrar  │ │ Vencen <7d  │         │
│  │   $4,245    │ │   $1,287    │ │     3       │         │
│  │   +12% mes  │ │   12 negoc. │ │   [Ver]     │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
├────────────────────────────────────────────────────────────┤
│  Pestañas: [Por Cobrar] [Pagados] [Vencidos] [Todos]     │
├────────────────────────────────────────────────────────────┤
│  Negocio      │ Plan   │ Vence     │ Monto  │ Estado     │ Acción      │
├───────────────┼────────┼───────────┼────────┼────────────┼─────────────┤
│ Pizzería DC   │ Feat.  │ 5d 🔴    │ $99    │ Pendiente  │ [Confirmar] │
│ Café Luna     │ Spons. │ 3d 🔴    │ $249   │ Pendiente  │ [Confirmar] │
│ Taller Auto   │ Feat.  │ -2d ⚠️   │ $99    │ VENCIDO    │ [Cobrar]    │
│ Tienda Ropa   │ Feat.  │ 12d 🟡   │ $99    │ Por vencer │ [Recordar]  │
└────────────────────────────────────────────────────────────────────────┘
```

**Estados financieros:**
- ✅ **Pagado** - Pago confirmado
- ⏳ **Pendiente** - Esperando pago
- ⚠️ **VENCIDO** - Fecha pasada sin pago
- 🔔 **Por vencer** - <7 días para vencimiento

**Acciones inline:**
```
├─ ✅ Confirmar pago recibido
├─ 📷 Subir comprobante
├─ 📧 Enviar recordatorio
├─ ⏸️ Suspender por falta de pago
├─ 📅 Extender vencimiento
├─ 🔄 Renovar automáticamente
└─ 📄 Ver historial de pagos
```

**Panel de comprobantes:**
```
┌──────────────────────────────┐
│ Comprobante de Pago          │
├──────────────────────────────┤
│ Negocio: Pizzería Don Carlo  │
│ Monto: $99                   │
│ Fecha: 15/01/2026            │
│ Método: Transferencia        │
├──────────────────────────────┤
│ [Imagen del comprobante]     │
│                              │
│ Datos de transferencia:      │
│ Ref: 1234567890              │
│ Banco: BBVA                  │
├──────────────────────────────┤
│ [✅ Confirmar Pago]          │
│ [❌ Rechazar]                │
│ [📧 Solicitar Aclaración]    │
└──────────────────────────────┘
```

**Vistas rápidas (tabs):**
1. **Por Cobrar** - Negocios premium sin pago confirmado
2. **Pagados** - Histórico de pagos recibidos (útil para reportes)
3. **Vencidos** - Requieren acción inmediata
4. **Todos** - Vista completa

**Reportes simples:**
- Ingresos del mes actual
- Proyección próximos 30 días
- Tasa de renovación
- Export a CSV para contabilidad

**Implementación:**
```tsx
// app/admin/facturacion/page.tsx
- Tabs con Radix UI
- Tabla con filtros por estado
- Acciones: Server Actions
- Upload de comprobantes: uploadthing o similar
- Cálculos en real-time desde Firestore
```

---

### 5️⃣ Inventario Premium (`/admin/inventario`)

**Propósito:** Vista clara de espacios premium disponibles para manejar escasez.

**Layout Grid por Zona:**
```
┌──────────────────────────────────────────────────────────┐
│  📍 CENTRO                                                │
│  ┌──────────────────────┬──────────────────────┐        │
│  │ 👑 PATROCINADOS      │ ⭐ DESTACADOS        │        │
│  │ 2 / 3 ocupados       │ 7 / 10 ocupados      │        │
│  │ 🟢 1 disponible      │ 🟡 3 disponibles     │        │
│  │                      │                      │        │
│  │ [Ver Ocupados]       │ [Ver Ocupados]       │        │
│  │ [Ofrecer Espacio]    │ [Ofrecer Espacio]    │        │
│  └──────────────────────┴──────────────────────┘        │
├──────────────────────────────────────────────────────────┤
│  📍 NORTE                                                 │
│  ┌──────────────────────┬──────────────────────┐        │
│  │ 👑 PATROCINADOS      │ ⭐ DESTACADOS        │        │
│  │ 1 / 3 ocupados       │ 4 / 10 ocupados      │        │
│  │ 🟢 2 disponibles     │ 🟢 6 disponibles     │        │
│  └──────────────────────┴──────────────────────┘        │
├──────────────────────────────────────────────────────────┤
│  📍 SUR                                                   │
│  ...similar...                                           │
└──────────────────────────────────────────────────────────┘
```

**Por Categoría (vista alternativa en tabs):**
```
┌──────────────────────────────────────────────────┐
│ Tabs: [Por Zona] [Por Categoría]                │
├──────────────────────────────────────────────────┤
│ 🍕 RESTAURANTES                                  │
│ Featured: 8/15 ocupados (7 disponibles) 🟢      │
│ Sponsor: 2/5 ocupados (3 disponibles) 🟢        │
│                                                  │
│ ☕ CAFETERÍAS                                    │
│ Featured: 12/15 ocupados (3 disponibles) 🟡     │
│ Sponsor: 5/5 ocupados (0 disponibles) 🔴        │
│ ⚠️ Categoría saturada - considerar aumentar     │
│                                                  │
│ 🛍️ TIENDAS                                       │
│ Featured: 5/15 ocupados (10 disponibles) 🟢     │
│ Sponsor: 1/5 ocupados (4 disponibles) 🟢        │
└──────────────────────────────────────────────────┘
```

**Indicadores:**
- 🔴 **Sin espacios** (saturado)
- 🟡 **Pocos espacios** (<30% disponible)
- 🟢 **Espacios disponibles** (>30%)

**Acciones rápidas:**
```
├─ 👀 Ver negocios ocupando espacios
├─ 📧 Ofrecer upgrade a negocios Free de la zona
├─ 📊 Ver histórico de ocupación
├─ ⚙️ Ajustar límites de espacios
└─ 📈 Ver demanda vs oferta
```

**Panel de Ocupación Detallada (al expandir):**
```
┌────────────────────────────────────────┐
│ Centro - Featured (7/10)               │
├────────────────────────────────────────┤
│ ✅ Pizzería Don Carlo (vence: 5d)     │
│ ✅ Café Luna (vence: 23d)             │
│ ✅ Taller Auto (vence: 45d)           │
│ ✅ Tienda Ropa (vence: 12d) ⚠️        │
│ ✅ Ferretería XYZ (vence: 8d)         │
│ ✅ Farmacia ABC (vence: 30d)          │
│ ✅ Gym Fitness (vence: 60d)           │
├────────────────────────────────────────┤
│ 🔓 3 espacios disponibles              │
│ [Ofrecer a negocios Free de Centro]   │
└────────────────────────────────────────┘
```

**Datos críticos mostrados:**
- Total de espacios por plan/zona
- Espacios ocupados
- Espacios disponibles
- Tasa de ocupación
- Ingresos potenciales de espacios vacíos
- Próximos vencimientos que liberarán espacios

**Alertas automáticas:**
- 🔴 Categoría saturada (0 espacios disponibles)
- 🟡 Zona saturada (0 espacios, pero otras zonas tienen)
- 📈 Oportunidad: 5+ negocios Free en zona con espacios disponibles

**Implementación:**
```tsx
// app/admin/inventario/page.tsx
- Cálculo en real-time desde Firestore
- Grid responsive (2 cols desktop, 1 col mobile)
- Expandible con Radix Collapsible
- Gráficas simples con recharts (optional)
```

---

### 6️⃣ Alertas Operativas (`/admin/alertas`)

**Propósito:** Sistema proactivo que muestre problemas antes de que escalen.

**Layout por Prioridad:**
```
┌────────────────────────────────────────────────────────┐
│ 🔴 CRÍTICO (requieren acción inmediata)                │
├────────────────────────────────────────────────────────┤
│ • 3 negocios premium vencen en <48h sin pago          │
│   [Ver negocios] [Enviar recordatorio masivo]         │
│                                                        │
│ • Cafeterías Sponsor saturado (0 espacios)            │
│   [Ver inventario] [Aumentar límite]                  │
│                                                        │
│ • 2 comprobantes de pago esperan confirmación >5d     │
│   [Revisar pagos]                                     │
├────────────────────────────────────────────────────────┤
│ 🟡 IMPORTANTE (acción en 7 días)                       │
├────────────────────────────────────────────────────────┤
│ • 8 negocios vencen en 7-14 días                      │
│   [Ver lista] [Programar recordatorios]               │
│                                                        │
│ • 5 solicitudes pendientes >3 días                    │
│   [Ir a solicitudes]                                  │
│                                                        │
│ • Centro Featured tiene solo 2 espacios disponibles   │
│   [Ver quiénes vencen pronto]                         │
├────────────────────────────────────────────────────────┤
│ 🔵 INFO (oportunidades)                                │
├────────────────────────────────────────────────────────┤
│ • 12 negocios Free en Centro (zona con espacios)      │
│   [Enviar oferta upgrade]                             │
│                                                        │
│ • 4 negocios sin actividad >30 días                   │
│   [Contactar para verificar]                          │
└────────────────────────────────────────────────────────┘
```

**Tipos de alertas:**

**🔴 Críticas (acción <48h):**
- Pagos vencidos
- Negocios premium por suspenderse
- Comprobantes sin revisar >5 días
- Categorías saturadas completamente
- Errores del sistema

**🟡 Importantes (acción <7d):**
- Vencimientos en 7-14 días
- Solicitudes pendientes >3 días 
- Espacios premium quedando pocos (<30%)
- Negocios reportados sin revisar

**🔵 Informativas (oportunidades):**
- Negocios Free en zonas con espacios disponibles
- Negocios inactivos >30 días
- Tendencias de crecimiento por categoría
- Oportunidades de upsell

**Acciones inline:**
```
Cada alerta tiene botones para:
├─ Ver afectados (link directo a vista filtrada)
├─ Acción rápida (ej: enviar email, aprobar)
├─ Posponer X días
├─ Marcar como resuelta
└─ Desactivar alerta (si no aplica)
```

**Configuración de alertas:**
```
┌────────────────────────────────────┐
│ Configurar Alertas               │
├────────────────────────────────────┤
│ Vencimientos:                      │
│ [x] Alertar <48h                   │
│ [x] Alertar 7 días                 │
│ [x] Alertar 14 días                │
│                                    │
│ Inventario:                        │
│ [x] Alertar si <30% disponible     │
│ [x] Alertar si categoría saturada  │
│                                    │
│ Solicitudes:                       │
│ [x] Alertar si >3 días sin revisar │
│                                    │
│ Notificaciones:                    │
│ [x] Email diario con resumen       │
│ [x] WhatsApp para críticas         │
└────────────────────────────────────┘
```

**Dashboard de métricas (bottom):**
```
Últimos 30 días:
├─ Alertas generadas: 47
├─ Alertas resueltas: 42 (89%)
├─ Tiempo promedio de resolución: 1.2 días
└─ Alertas críticas escaladas: 2
```

**Implementación:**
```tsx
// app/admin/alertas/page.tsx
- Sistema de reglas configurable
- Cron job diario que genera alertas
- Store en Firestore con prioridad
- Real-time updates con subscriptions
- Notificaciones: email + WhatsApp
```

---

## 🗂️ Nueva Estructura de Carpetas

```
app/admin/
├── page.tsx                          # 1️⃣ Dashboard Ejecutivo
├── layout.tsx                        # Sidebar + Header compartido
│
├── solicitudes/
│   ├── page.tsx                      # 2️⃣ Kanban de solicitudes
│   └── [id]/
│       └── page.tsx                  # Detalle de solicitud (optional)
│
├── negocios/
│   ├── page.tsx                      # 3️⃣ Tabla de negocios
│   ├── [id]/
│   │   └── page.tsx                  # Detalle de negocio
│   └── nuevo/
│       └── page.tsx                  # Crear negocio manual
│
├── facturacion/
│   ├── page.tsx                      # 4️⃣ Control de pagos
│   └── comprobantes/
│       └── [id]/
│           └── page.tsx              # Ver comprobante
│
├── inventario/
│   └── page.tsx                      # 5️⃣ Inventario premium
│
├── alertas/
│   ├── page.tsx                      # 6️⃣ Sistema de alertas
│   └── configuracion/
│       └── page.tsx                  # Config de alertas
│
└── [DEPRECATED]/                     # Carpeta temporal
    ├── applications/                 # Mover a solicitudes
    ├── pending-businesses/           # Mover a solicitudes
    ├── payments/                     # Ya hay facturacion/
    ├── analytics/                    # Integrar en dashboard
    ├── stats/                        # Integrar en dashboard
    ├── reports/                      # Integrar en alertas
    └── reviews/                      # Mover a moderacion/ (futuro)
```

**Limpieza necesaria:**
- ✅ Unificar `solicitudes/`, `applications/`, `pending-businesses/`
- ✅ Reemplazar `payments/` con `facturacion/`
- ✅ Integrar `stats/` y `analytics/` en dashboard ejecutivo
- ✅ Mover `reports/` a sistema de alertas
- ⏸️ `reviews/` mantener temporal (futuro módulo de moderación)

---

## 🎨 Layout Principal

### Estructura de Layout

```tsx
// app/admin/layout.tsx

┌─────────────────────────────────────────────────────────────┐
│  [Logo] Directorio Admin              [User] [Salir]        │ ← Header
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ SIDEBAR  │  MAIN CONTENT AREA                              │
│ (fijo)   │  (scrollable)                                   │
│          │                                                  │
│ 🏠 Dash  │  ┌─────────────────────────────────────────┐   │
│ 📥 Solic │  │                                         │   │
│ 🏪 Nego  │  │   Contenido del módulo actual           │   │
│ 💰 Factu │  │                                         │   │
│ 📦 Inven │  │                                         │   │
│ ⚠️ Alert │  │                                         │   │
│          │  └─────────────────────────────────────────┘   │
│          │                                                  │
│ [Sitio]  │                                                  │
└──────────┴──────────────────────────────────────────────────┘
  200px       Resto (calc(100vw - 200px))
```

### Sidebar Specification

**Desktop (≥1024px):**
```tsx
- Width: 200px fijo
- Position: sticky
- Items: Icon + Label
- Active state: background + border-left
- Badges: número en esquina superior derecha
- Footer: Link "Volver al sitio"
```

**Mobile (<1024px):**
```tsx
- Hamburger menu (top-left)
- Full-screen overlay cuando abierto
- Cierra al seleccionar item
- Swipe desde edge para abrir
```

### Navegación con Badges

```tsx
// Sidebar con indicadores dinámicos
const navItems = [
  { 
    href: '/admin', 
    icon: '🏠', 
    label: 'Dashboard',
    badge: null 
  },
  { 
    href: '/admin/solicitudes', 
    icon: '📥', 
    label: 'Solicitudes',
    badge: pendingCount,        // Rojo si >0
    badgeColor: 'red' 
  },
  { 
    href: '/admin/negocios', 
    icon: '🏪', 
    label: 'Negocios',
    badge: null 
  },
  { 
    href: '/admin/facturacion', 
    icon: '💰', 
    label: 'Facturación',
    badge: overdueCount,         // Rojo si >0
    badgeColor: 'red'
  },
  { 
    href: '/admin/inventario', 
    icon: '📦', 
    label: 'Inventario',
    badge: null 
  },
  { 
    href: '/admin/alertas', 
    icon: '⚠️', 
    label: 'Alertas',
    badge: criticalCount,        // Rojo si >0
    badgeColor: 'red'
  },
];
```

### Header Specification

```tsx
┌─────────────────────────────────────────────────────┐
│ [Logo] Panel Admin    [Buscar...]  [👤] [🔔] [⚙️]  │
└─────────────────────────────────────────────────────┘
  Logo + Title        Búsqueda    User  Notif Config
```

**Componentes:**
- Logo + Título
- Búsqueda global (cmd+k para abrir)
- Notificaciones (dropdown con últimas alertas)
- Menú de usuario (perfil, config, salir)

---

## 🔄 Migración desde Sistema Actual

### Plan de Migración en 3 Fases

**FASE 1: Layout Base (Week 1)**
```
✅ Crear nuevo layout.tsx con sidebar
✅ Crear Dashboard Ejecutivo (/admin)
✅ Migrar AdminQuickNav a Sidebar fijo
✅ Actualizar navegación en todas las páginas existentes
```

**FASE 2: Módulos Core (Week 2-3)**
```
✅ Unificar Solicitudes (kanban operativo)
✅ Optimizar Negocios (tabla densa)
✅ Crear Facturación (reemplaza payments)
```

**FASE 3: Features Avanzados (Week 4)**
```
✅ Crear Inventario Premium
✅ Crear Sistema de Alertas
✅ Limpiar páginas deprecated
```

### Compatibilidad durante migración

```tsx
// Mantener ambas rutas temporalmente
app/admin/
├── solicitudes/          # NUEVO
├── negocios/            # NUEVO (ruta actualizada)
├── facturacion/         # NUEVO
├── inventario/          # NUEVO
├── alertas/             # NUEVO
│
└── [OLD]/               # Mantener 2 semanas
    ├── applications/    # Redirect a solicitudes
    ├── businesses/      # Redirect a negocios
    └── payments/        # Redirect a facturacion
```

**Redirects automáticos:**
```tsx
// app/admin/applications/page.tsx
export default function OldApplicationsPage() {
  redirect('/admin/solicitudes');
}
```

---

## 🎯 Mejores Prácticas SaaS

### 1. Jerarquía de Información

```
Prioridad 1: Acciones críticas (siempre visibles)
  └─ Dashboard KPIs
  └─ Badges en sidebar
  └─ Alertas críticas

Prioridad 2: Operación diaria (1 click)
  └─ Aprobar solicitudes
  └─ Confirmar pagos
  └─ Ver vencimientos

Prioridad 3: Gestión (2-3 clicks)
  └─ Editar negocio
  └─ Ver estadísticas
  └─ Configuración
```

### 2. Optimización de Velocidad

**Keyboard Shortcuts:**
```
cmd/ctrl + k  → Búsqueda global
cmd/ctrl + 1  → Dashboard
cmd/ctrl + 2  → Solicitudes
cmd/ctrl + 3  → Negocios
cmd/ctrl + 4  → Facturación
g + s         → Ir a solicitudes
g + n         → Ir a negocios
/             → Focus en búsqueda
```

**Acciones en 1 click:**
- Aprobar solicitud
- Confirmar pago
- Marcar alerta como resuelta
- Abrir panel lateral

**Evitar modals pesados:**
- Usar panel lateral deslizable
- Drawer para detalles rápidos
- Modals solo para confirmaciones críticas

### 3. Carga Cognitiva Mínima

**Colores funcionales:**
- Solo usar color para estados que requieren acción
- 🔴 Rojo: Crítico (requiere acción <48h)
- 🟡 Amarillo: Importante (requiere acción <7d)
- 🟢 Verde: Confirmación (acción exitosa)
- ⚫ Gris: Neutral/inactivo

**Tipografía:**
- Sans-serif legible (Inter, SF Pro)
- Tamaños: 12px (small), 14px (base), 16px (titles), 20px (headers)
- Peso: 400 (normal), 600 (semibold), 700 (bold)

**Espaciado:**
- Denso pero respirable
- Gap mínimo: 8px
- Gap estándar: 16px
- Gap secciones: 32px

### 4. Datos en Tiempo Real

**Actualización automática:**
```tsx
// Polling cada 30s para datos críticos
const { data } = useSWR('/api/admin/stats', fetcher, {
  refreshInterval: 30000,
  revalidateOnFocus: true,
});
```

**Invalidación optimista:**
```tsx
// Actualizar UI inmediatamente, sync después
mutate('/api/admin/businesses', 
  async (current) => {
    // Optimistic update
    return [...current, newBusiness];
  },
  { revalidate: false }
);
```

### 5. Accesibilidad Operativa

**Focus management:**
- Keyboard navigation completa
- Focus visible siempre
- Skip links para usuarios de teclado

**Loading states:**
- Skeleton loaders (no spinners)
- Indicadores de progreso inline
- Feedback inmediato en acciones

**Error handling:**
- Mensajes claros y accionables
- Retry automático para errores de red
- Rollback automático en errores

---

## 📊 Métricas de Éxito

### KPIs del Admin Panel

**Velocidad operativa:**
- ⏱️ Tiempo promedio para aprobar solicitud: <30s
- ⏱️ Tiempo para confirmar pago: <15s
- ⏱️ Clics para upgrade de plan: 2 clics
- ⏱️ Tiempo de resolución de alerta: <24h

**Eficiencia:**
- 📈 Negocios procesados por hora
- 📈 Reducción de errores operativos
- 📈 Tiempo activo en el panel (menos = mejor)

**Satisfacción del admin:**
- 😊 NPS del panel (mensual)
- 🐛 Bugs reportados
- 💡 Feature requests

---

## 🚀 Plan de Implementación

### Roadmap Sugerido

**Sprint 1 (Week 1): Base**
```
├─ Crear app/admin/layout.tsx (sidebar + header)
├─ Crear app/admin/page.tsx (dashboard ejecutivo)
├─ Crear components/AdminSidebar.tsx
├─ Crear components/AdminHeader.tsx
└─ Testing básico de navegación
```

**Sprint 2 (Week 2): Solicitudes**
```
├─ Crear app/admin/solicitudes/page.tsx (kanban)
├─ Crear components/SolicitudKanbanBoard.tsx
├─ Crear components/SolicitudCard.tsx
├─ Crear components/SolicitudDrawer.tsx (panel lateral)
├─ Integrar drag & drop
└─ Testing de flujo de aprobación
```

**Sprint 3 (Week 3): Negocios + Facturación**
```
├─ Recrear app/admin/negocios/page.tsx (tabla densa)
├─ Crear components/NegociosTable.tsx
├─ Crear components/NegocioDrawer.tsx
├─ Crear app/admin/facturacion/page.tsx
├─ Crear components/FacturacionTable.tsx
└─ Testing de acciones inline
```

**Sprint 4 (Week 4): Features Avanzados**
```
├─ Crear app/admin/inventario/page.tsx
├─ Crear app/admin/alertas/page.tsx
├─ Crear sistema de notificaciones
├─ Crear keyboard shortcuts
└─ Testing completo del flujo
```

**Sprint 5 (Week 5): Polish + Migración**
```
├─ Optimización de performance
├─ Responsive mobile
├─ Accessibility audit
├─ Migrar páginas antiguas
├─ Crear redirects
└─ Deploy a producción
```

---

## 📦 Stack Tecnológico Sugerido

### Core
- **Framework:** Next.js 16 (App Router RSC)
- **UI:** React 19
- **Styling:** Tailwind CSS
- **Database:** Firestore (actual)

### Componentes UI
- **Headless:** Radix UI (Drawer, Dropdown, Dialog)
- **Tablas:** TanStack Table v8
- **Drag & Drop:** @dnd-kit (más ligero que react-beautiful-dnd)
- **Forms:** React Hook Form + Zod
- **Dates:** date-fns (más ligero que moment)

### Estado & Data Fetching
- **Client:** SWR o TanStack Query
- **Server:** React Server Components
- **Real-time:** Firestore subscriptions

### Dev Tools
- **TypeScript:** Strict mode
- **Linting:** ESLint + Prettier
- **Testing:** Vitest + Testing Library

---

## 🎬 Conclusión

Este rediseño transforma el admin de:

❌ **Antes:**
- Páginas dispersas sin estructura clara
- Duplicación de funcionalidades
- Muchos clics para operaciones comunes
- Difícil saber qué requiere atención

✅ **Después:**
- Torre de control con jerarquía clara
- 6 módulos operativos bien definidos
- Acciones rápidas inline
- Alertas proactivas que guían acción
- Diseñado para escalar a 200+ negocios

**Siguiente paso:** Revisar este documento con el equipo y priorizar sprints.

---

**Preguntas para refinamiento:**
1. ¿Cuántos admins usarán el panel? (afecta permisos/roles)
2. ¿Hay operaciones específicas muy frecuentes? (optimizar más)
3. ¿Qué reportes necesita contabilidad? (para facturación)
4. ¿Límites de espacios premium son fijos o dinámicos?
5. ¿Preferencia de notificaciones? (email, WhatsApp, SMS)

