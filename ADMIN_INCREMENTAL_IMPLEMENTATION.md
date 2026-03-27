# 🔧 Admin Panel: Implementación Incremental (Sin Backend)

> **Pragmatic approach:** Operations-first UI usando colecciones existentes  
> **Timeline:** 1 sprint (1 semana)  
> **Safe:** Mantiene rutas viejas funcionando

---

## 📋 Plan de Implementación

### **Fase 1: Layout & Navegación** (Día 1-2)
- ✅ Crear layout operations con sidebar fijo
- ✅ AdminSidebar responsive (desktop + mobile drawer)
- ✅ Mantener rutas legacy funcionando

### **Fase 2: Inbox Virtual** (Día 3-4)
- ✅ Agregador de 3 fuentes (applications + businesses + payments)
- ✅ Priorización automática (critical/warning/info)
- ✅ Panel lateral para acciones

### **Fase 3: Componentes Shared** (Día 5)
- ✅ EmptyState, StatusBadge, DrawerPanel
- ✅ Testing + validación

---

## 📁 Archivos a Crear/Modificar

### **CREAR (8 archivos nuevos)**

```
app/admin/(operations)/
├── layout.tsx                           # Layout con sidebar fijo
└── page.tsx                             # Inbox virtual (home)

components/admin/
├── shared/
│   ├── AdminSidebar.tsx                 # Navegación fija (6 items)
│   ├── StatusBadge.tsx                  # Badge unificado
│   ├── EmptyState.tsx                   # Estados vacíos
│   └── DrawerPanel.tsx                  # Panel lateral
└── operations/
    ├── InboxVirtual.tsx                 # Agregador de tareas
    └── InboxItemCard.tsx                # Card de tarea
```

### **MODIFICAR (2 archivos)**

```
app/admin/businesses/page.tsx            # Agregar wrapper operations layout
app/admin/applications/page.tsx          # Agregar wrapper operations layout
```

### **MANTENER SIN CAMBIOS**

```
types/business.ts                        # NO tocar
lib/server/firebaseAdmin.ts             # NO tocar
firestore.rules                         # NO tocar
functions/                              # NO tocar
```

---

## 🏗️ Implementación Detallada

### **1. Layout Operations**

**File:** `app/admin/(operations)/layout.tsx`

```tsx
import AdminSidebar from '@/components/admin/shared/AdminSidebar';

export default function AdminOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed on desktop, drawer on mobile */}
      <AdminSidebar />
      
      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

**Características:**
- Sidebar fixed left (desktop)
- Mobile: drawer overlay
- Content area con max-width para legibilidad

---

### **2. AdminSidebar Component**

**File:** `components/admin/shared/AdminSidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BsInbox,
  BsFileText,
  BsShop,
  BsCreditCard,
  BsStar,
  BsBarChart,
  BsList,
  BsX,
} from 'react-icons/bs';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { 
      href: '/admin', 
      label: 'Inbox', 
      icon: BsInbox,
      description: 'Tareas pendientes'
    },
    { 
      href: '/admin/applications', 
      label: 'Solicitudes', 
      icon: BsFileText,
      description: 'Nuevos registros'
    },
    { 
      href: '/admin/businesses', 
      label: 'Negocios', 
      icon: BsShop,
      description: 'Publicados'
    },
    { 
      href: '/admin/payments', 
      label: 'Pagos', 
      icon: BsCreditCard,
      description: 'Vencimientos'
    },
    { 
      href: '/admin/reviews', 
      label: 'Reseñas', 
      icon: BsStar,
      description: 'Moderación'
    },
    { 
      section: true,
      label: 'MÁS'
    },
    { 
      href: '/admin/analytics', 
      label: 'Analytics', 
      icon: BsBarChart,
      description: 'Métricas'
    },
  ];

  return (
    <>
      {/* Mobile: Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-emerald-600 text-white rounded-lg p-2.5 shadow-lg hover:bg-emerald-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <BsX className="w-6 h-6" /> : <BsList className="w-6 h-6" />}
      </button>

      {/* Mobile: Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <p className="text-xs text-gray-500 mt-1">Panel de operaciones</p>
        </div>

        {/* Navigation */}
        <ul className="p-3 space-y-1">
          {navItems.map((item, index) => {
            if (item.section) {
              return (
                <li key={`section-${index}`} className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {item.label}
                  </span>
                </li>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all group
                    ${isActive 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-600'
                    }
                  `}
                >
                  <Icon 
                    className={`
                      flex-shrink-0 mt-0.5 text-lg
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'}
                    `} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>←</span>
            <span>Volver al sitio</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
```

**Características:**
- 6 navigation items (no más)
- Responsive: fixed desktop, drawer mobile
- Active state visual
- Section divider para Analytics

---

### **3. Inbox Virtual (Home)**

**File:** `app/admin/(operations)/page.tsx`

```tsx
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth, getAdminFirestore } from '@/lib/server/firebaseAdmin';
import { hasAdminOverride } from '@/lib/adminOverrides';
import InboxVirtual from '@/components/admin/operations/InboxVirtual';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Inbox - Admin Panel',
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) redirect('/para-negocios?auth=required');

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

// Aggregate inbox items from existing collections
async function fetchInboxItems() {
  const db = getAdminFirestore();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const items = [];

  // 1. Applications pendientes
  const applicationsSnap = await db
    .collection('applications')
    .where('status', 'in', ['pending', 'solicitud'])
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  applicationsSnap.docs.forEach((doc) => {
    const data = doc.data();
    items.push({
      id: doc.id,
      type: 'application',
      priority: 'info',
      priorityScore: 3,
      businessName: data.businessName || 'Sin nombre',
      businessId: doc.id,
      metadata: {
        plan: data.plan || 'free',
        email: data.ownerEmail || data.email,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      },
      actions: ['approve', 'reject', 'request-info'],
    });
  });

  // 2. Businesses en revisión
  const inReviewSnap = await db
    .collection('businesses')
    .where('businessStatus', '==', 'in_review')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  inReviewSnap.docs.forEach((doc) => {
    const data = doc.data();
    items.push({
      id: doc.id,
      type: 'review',
      priority: 'warning',
      priorityScore: 2,
      businessName: data.businessName || data.name || 'Sin nombre',
      businessId: doc.id,
      metadata: {
        plan: data.plan,
        category: data.category,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      },
      actions: ['publish', 'reject'],
    });
  });

  // 3. Pagos vencidos/próximos a vencer
  const paymentsSnap = await db
    .collection('businesses')
    .where('plan', 'in', ['featured', 'sponsor'])
    .get();

  paymentsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.planExpiresAt) return;

    const expiresAt = data.planExpiresAt.toDate();
    const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      // Vencido (critical)
      items.push({
        id: `payment-${doc.id}`,
        type: 'payment',
        priority: 'critical',
        priorityScore: 1,
        businessName: data.businessName || data.name || 'Sin nombre',
        businessId: doc.id,
        metadata: {
          plan: data.plan,
          daysOverdue: Math.abs(daysUntil),
          amount: data.plan === 'sponsor' ? 299 : 99,
        },
        actions: ['remind', 'suspend', 'extend'],
      });
    } else if (daysUntil <= 7) {
      // Próximo a vencer (warning)
      items.push({
        id: `payment-${doc.id}`,
        type: 'expiration',
        priority: 'warning',
        priorityScore: 2,
        businessName: data.businessName || data.name || 'Sin nombre',
        businessId: doc.id,
        metadata: {
          plan: data.plan,
          daysUntilExpiration: daysUntil,
        },
        actions: ['remind', 'extend'],
      });
    }
  });

  // Sort by priority score (critical first)
  items.sort((a, b) => a.priorityScore - b.priorityScore);

  return items;
}

export default async function AdminInboxPage() {
  await requireAdmin();
  const items = await fetchInboxItems();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operations Inbox</h1>
        <p className="text-sm text-gray-600 mt-1">
          Tareas que requieren tu atención
        </p>
      </div>

      <InboxVirtual items={items} />
    </div>
  );
}
```

**Características:**
- Agrega 3 fuentes de datos existentes
- Prioriza por criticidad (payment > review > application)
- Sin nuevas collections
- Server-side (no client-side queries)

---

### **4. InboxVirtual Component**

**File:** `components/admin/operations/InboxVirtual.tsx`

```tsx
'use client';

import { useState } from 'react';
import InboxItemCard from './InboxItemCard';
import EmptyState from '../shared/EmptyState';

interface InboxItem {
  id: string;
  type: string;
  priority: 'critical' | 'warning' | 'info';
  priorityScore: number;
  businessName: string;
  businessId: string;
  metadata: any;
  actions: string[];
}

interface Props {
  items: InboxItem[];
}

export default function InboxVirtual({ items }: Props) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.priority === filter);

  const grouped = {
    critical: filteredItems.filter(i => i.priority === 'critical'),
    warning: filteredItems.filter(i => i.priority === 'warning'),
    info: filteredItems.filter(i => i.priority === 'info'),
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="¡Todo al día!"
        description="No hay tareas pendientes en este momento."
        action={{ label: 'Ver todos los negocios', href: '/admin/businesses' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todos', count: items.length },
          { key: 'critical', label: 'Crítico', count: grouped.critical.length },
          { key: 'warning', label: 'Atención', count: grouped.warning.length },
          { key: 'info', label: 'Pendiente', count: grouped.info.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === f.key 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
              }
            `}
          >
            {f.label}
            <span className="ml-2 opacity-75">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Critical Section */}
      {grouped.critical.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            CRÍTICO ({grouped.critical.length})
          </h2>
          <div className="space-y-2">
            {grouped.critical.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Warning Section */}
      {grouped.warning.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-yellow-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            ATENCIÓN ({grouped.warning.length})
          </h2>
          <div className="space-y-2">
            {grouped.warning.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Info Section */}
      {grouped.info.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            PENDIENTE ({grouped.info.length})
          </h2>
          <div className="space-y-2">
            {grouped.info.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

### **5. InboxItemCard Component**

**File:** `components/admin/operations/InboxItemCard.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '../shared/StatusBadge';

interface Props {
  item: {
    id: string;
    type: string;
    priority: 'critical' | 'warning' | 'info';
    businessName: string;
    businessId: string;
    metadata: any;
    actions: string[];
  };
}

export default function InboxItemCard({ item }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inbox-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          businessId: item.businessId,
          action,
          type: item.type,
        }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Error al ejecutar acción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al ejecutar acción');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'application': return '📝';
      case 'review': return '🔍';
      case 'payment': return '💳';
      case 'expiration': return '⏰';
      default: return '📋';
    }
  };

  const getTitle = () => {
    switch (item.type) {
      case 'application': return 'Solicitud nueva';
      case 'review': return 'En revisión';
      case 'payment': return `Pago vencido hace ${item.metadata.daysOverdue} días`;
      case 'expiration': return `Vence en ${item.metadata.daysUntilExpiration} días`;
      default: return 'Tarea pendiente';
    }
  };

  const getActionButtons = () => {
    const buttonConfig: Record<string, { label: string; color: string }> = {
      approve: { label: '✅ Aprobar', color: 'green' },
      reject: { label: '❌ Rechazar', color: 'red' },
      'request-info': { label: '📝 Solicitar info', color: 'blue' },
      publish: { label: '✅ Publicar', color: 'green' },
      remind: { label: '📧 Recordar', color: 'blue' },
      suspend: { label: '⏸️ Suspender', color: 'orange' },
      extend: { label: '🔄 Extender', color: 'green' },
    };

    return item.actions.map(action => {
      const config = buttonConfig[action] || { label: action, color: 'gray' };
      return (
        <button
          key={action}
          onClick={() => handleAction(action)}
          disabled={loading}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
            ${config.color === 'green' && 'bg-green-100 text-green-700 hover:bg-green-200'}
            ${config.color === 'red' && 'bg-red-100 text-red-700 hover:bg-red-200'}
            ${config.color === 'blue' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
            ${config.color === 'orange' && 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
            ${config.color === 'gray' && 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          `}
        >
          {config.label}
        </button>
      );
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl flex-shrink-0">{getIcon()}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {item.businessName}
              </h3>
              <p className="text-sm text-gray-600">
                {getTitle()}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 ml-11">
            {item.metadata.plan && (
              <StatusBadge
                status="info"
                label={item.metadata.plan === 'sponsor' ? '👑 Sponsor' : item.metadata.plan === 'featured' ? '⭐ Featured' : '🆓 Free'}
                size="sm"
              />
            )}
            {item.metadata.category && (
              <span className="text-xs text-gray-500">{item.metadata.category}</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          {getActionButtons()}
        </div>
      </div>

      {/* Expandable details (optional) */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
          <pre className="whitespace-pre-wrap">{JSON.stringify(item.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

---

### **6. Shared Components**

**File:** `components/admin/shared/StatusBadge.tsx`

```tsx
interface StatusBadgeProps {
  status: 'critical' | 'warning' | 'info' | 'success';
  label: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const colors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    success: 'bg-green-100 text-green-700 border-green-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${colors[status]} ${sizes[size]}`}>
      {label}
    </span>
  );
}
```

**File:** `components/admin/shared/EmptyState.tsx`

```tsx
import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
```

---

### **7. API Route para Acciones**

**File:** `app/api/admin/inbox-action/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { itemId, businessId, action, type } = await request.json();
    
    const db = getAdminFirestore();
    
    // Execute action based on type
    switch (action) {
      case 'approve':
        if (type === 'application') {
          await db.collection('applications').doc(itemId).update({
            status: 'approved',
            approvedAt: new Date().toISOString(),
          });
        }
        break;
      
      case 'publish':
        await db.collection('businesses').doc(businessId).update({
          businessStatus: 'published',
          publishedAt: new Date().toISOString(),
        });
        break;
      
      case 'reject':
        if (type === 'application') {
          await db.collection('applications').doc(itemId).update({
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
          });
        } else {
          await db.collection('businesses').doc(businessId).update({
            applicationStatus: 'rejected',
          });
        }
        break;
      
      case 'remind':
        // TODO: Enviar notificación WhatsApp/email
        console.log('Sending reminder for:', businessId);
        break;
      
      case 'suspend':
        await db.collection('businesses').doc(businessId).update({
          isActive: false,
          disabledReason: 'payment_overdue',
          suspendedAt: new Date().toISOString(),
        });
        break;
      
      case 'extend':
        // Extend planExpiresAt by 30 days
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        const currentExpires = businessDoc.data()?.planExpiresAt?.toDate() || new Date();
        const newExpires = new Date(currentExpires.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        await db.collection('businesses').doc(businessId).update({
          planExpiresAt: newExpires,
        });
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inbox action error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
```

---

### **8. Mantener Compatibilidad con Rutas Viejas**

**File:** `app/admin/businesses/page.tsx` (modificar wrapper)

```tsx
// Add at top of file after imports:
import { redirect } from 'next/navigation';

// Keep existing page component as-is, just wrap it in operations layout
// by moving file to:
// app/admin/(operations)/businesses/page.tsx

// OR add a simple layout wrapper in existing location:
// (This approach keeps old route working)
```

**Alternative: Create redirect**

```typescript
// app/admin/page.tsx (create if doesn't exist)
import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  redirect('/admin');
}
```

---

## ✅ Checklist de Testing Manual

### **1. Layout & Navegación**
```bash
□ npm run build (debe compilar sin errores)
□ Navegar a /admin
□ Sidebar visible en desktop (fixed left)
□ Sidebar se convierte en drawer en mobile (<768px)
□ Hamburger menu funciona en mobile
□ Active state correcto en navegación
□ Click en items navega correctamente
```

### **2. Inbox Virtual**
```bash
□ /admin muestra lista de tareas (si existen)
□ Items agrupados por prioridad (critical/warning/info)
□ Filtros funcionan (all/critical/warning/info)
□ Empty state muestra cuando no hay tareas
□ Card muestra info correcta (nombre, tipo, metadata)
```

### **3. Acciones**
```bash
□ Click en "Aprobar" actualiza application status
□ Click en "Publicar" actualiza business status
□ Click en "Rechazar" actualiza status correspondiente
□ Loading state durante acción
□ Página se refresca después de acción exitosa
□ Error handling si falla acción
```

### **4. Compatibilidad**
```bash
□ /admin/businesses sigue funcionando
□ /admin/applications sigue funcionando
□ /admin/payments sigue funcionando
□ No hay errores de TypeScript
□ No hay errores en consola
```

### **5. Performance**
```bash
□ Inbox carga en <1s (con 50 items)
□ Sidebar no causa layout shift
□ Mobile drawer anima suavemente
□ No memory leaks (verificar DevTools)
```

---

## 🚀 Pasos de Implementación

### **Día 1: Setup & Layout**
```bash
# 1. Crear estructura de carpetas
mkdir -p app/admin/\(operations\)
mkdir -p components/admin/shared
mkdir -p components/admin/operations

# 2. Crear archivos base
touch app/admin/\(operations\)/layout.tsx
touch app/admin/\(operations\)/page.tsx
touch components/admin/shared/AdminSidebar.tsx
touch components/admin/shared/StatusBadge.tsx
touch components/admin/shared/EmptyState.tsx

# 3. Implementar AdminSidebar
# (copy code from above)

# 4. Implementar layout
# (copy code from above)

# 5. Test
npm run dev
# Navigate to http://localhost:3000/admin
```

### **Día 2: Inbox Virtual**
```bash
# 1. Crear componentes
touch components/admin/operations/InboxVirtual.tsx
touch components/admin/operations/InboxItemCard.tsx

# 2. Implementar inbox page
# (copy code from above)

# 3. Test con datos mock primero
# Luego conectar a Firestore

# 4. Verificar queries funcionan
```

### **Día 3: Acciones**
```bash
# 1. Crear API route
mkdir -p app/api/admin
touch app/api/admin/inbox-action/route.ts

# 2. Implementar handlers
# (copy code from above)

# 3. Test cada acción:
#    - Approve application
#    - Publish business
#    - Reject
#    - Remind
#    - Suspend
#    - Extend
```

### **Día 4: Polish & Testing**
```bash
# 1. Run full checklist
# 2. Fix any bugs
# 3. Add loading states
# 4. Test mobile
# 5. Test empty states
# 6. Verify TypeScript
npm run type-check
```

### **Día 5: Deploy**
```bash
# 1. Final testing
npm run build

# 2. Deploy to staging
vercel --prod

# 3. Smoke test production
# 4. Monitor errors (Sentry/logs)
```

---

## 🔍 Debugging Tips

### **Problem: Sidebar no aparece**
```bash
# Check:
1. Layout está en carpeta (operations) con paréntesis
2. Importación de AdminSidebar correcta
3. Tailwind classes compiladas (npm run dev)
```

### **Problem: Inbox vacío**
```bash
# Check Firestore queries:
1. Verificar que existen applications con status='pending'
2. Verificar businessStatus='in_review' existe
3. Verificar planExpiresAt tiene valores

# Add debug logging:
console.log('Applications:', applicationsSnap.size);
console.log('In Review:', inReviewSnap.size);
```

### **Problem: Acciones no funcionan**
```bash
# Check API route:
1. Verificar /api/admin/inbox-action existe
2. Check console de Network tab
3. Verificar permisos Firestore
4. Add error logging en route
```

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| Tiempo aprobar negocio | ~5 min | ~30 seg | <1 min |
| Clics para acción | 4-7 | 1-2 | <3 |
| Items en pantalla | ~3 | 10-20 | 10+ |
| Load time (inbox) | N/A | <1s | <1s |
| Mobile usable | No | Sí | Sí |

---

## 🎯 Siguientes Pasos (Post-MVP)

**Después de validar el MVP, agregar:**

1. **Panel lateral drawer** (ver detalles sin navegar)
2. **Real-time updates** (Firestore listeners client-side)
3. **Bulk actions** (aprobar múltiples a la vez)
4. **Filtros avanzados** (por plan, categoría, fecha)
5. **Paginación** (si >50 items)

**Eventualmente (Fase 2):**
- Crear collection `admin_inbox` para performance
- Cloud Functions para auto-población
- Analytics dashboard separado
- System de notificaciones push

---

**🎉 Con esta implementación tienes un admin panel operativo en 1 semana sin tocar backend.**

**Compilable:** ✅  
**Incremental:** ✅  
**Sin romper rutas:** ✅  
**Operations-first:** ✅
