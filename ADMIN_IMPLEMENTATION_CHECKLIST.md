# ✅ Admin Panel Rewrite: Implementation Checklist

> **Tactical document** for developers  
> Companion to [ADMIN_PANEL_REWRITE_ARCHITECTURE.md](./ADMIN_PANEL_REWRITE_ARCHITECTURE.md)

---

## 📋 Sprint 1: Foundation (Week 1-2)

### **Folder Structure**

```bash
# Create new directories
mkdir -p app/admin/(operations)
mkdir -p components/admin/operations
mkdir -p components/admin/pipeline
mkdir -p components/admin/billing
mkdir -p components/admin/inventory
mkdir -p components/admin/businesses
mkdir -p components/admin/shared
```

### **Tasks**

#### ✅ **Task 1.1: Create Admin Layout**
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
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
```

**Dependencies:** None  
**Estimated time:** 30 min

---

#### ✅ **Task 1.2: Create AdminSidebar Component**
**File:** `components/admin/shared/AdminSidebar.tsx`

**Refactor from:** `components/AdminNavigation.tsx`

**Key changes:**
- Remove horizontal variant (sidebar only)
- Reduce to 6 navigation items
- Add dynamic badge counters
- Fixed positioning (not sticky)

**Code structure:**
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BsInbox,
  BsKanban,
  BsCurrencyDollar,
  BsGrid,
  BsShop,
  BsBarChart,
} from 'react-icons/bs';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [counters, setCounters] = useState({ inbox: 0, billing: 0 });

  // Real-time counter (Firestore listener)
  useEffect(() => {
    // Fetch from /api/admin/counters
    // Or set up Firestore listener
  }, []);

  const navItems = [
    { href: '/admin', label: 'Inbox', icon: BsInbox, badge: counters.inbox },
    { href: '/admin/pipeline', label: 'Pipeline', icon: BsKanban },
    { href: '/admin/billing', label: 'Billing', icon: BsCurrencyDollar, badge: counters.billing, badgeColor: 'red' },
    { href: '/admin/inventory', label: 'Inventory', icon: BsGrid },
    { href: '/admin/businesses', label: 'Businesses', icon: BsShop },
    { section: true, label: 'MORE' },
    { href: '/admin/analytics', label: 'Analytics', icon: BsBarChart },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-5 overflow-y-auto">
      {/* Logo */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
      </div>

      {/* Navigation */}
      <ul className="space-y-1">
        {navItems.map((item) => {
          if (item.section) {
            return (
              <li key={item.label} className="pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase">
                {item.label}
              </li>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                <Icon className="text-lg" />
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${item.badgeColor === 'red' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}
                  `}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

**Dependencies:** `react-icons/bs`  
**Estimated time:** 2 hours

---

#### ✅ **Task 1.3: Deploy Counter Cloud Functions**

**Already exists:** `functions/src/counterFunctions.ts`

**Action required:**
```bash
cd functions
npm run build
firebase deploy --only functions:updateBusinessCounters,functions:dailyCounterCheck,functions:resyncCounters
```

**Verification:**
```bash
# Check functions deployed
firebase functions:list | grep counter

# Expected output:
# updateBusinessCounters (onDocumentWritten)
# dailyCounterCheck (schedule)
# resyncCounters (schedule)
```

**Estimated time:** 15 min

---

#### ✅ **Task 1.4: Initialize Counters**

**Already exists:** `scripts/init-counters.ts`

**Action required:**
```bash
npx tsx scripts/init-counters.ts
```

**Verification:**
```
# Firestore Console
# Collection: counters
# Documents:
#   - business_stats (total, free, featured, sponsor, ...)
#   - scarcity (por categoría y zona)
```

**Estimated time:** 10 min

---

#### ✅ **Task 1.5: Create Shared Components**

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
      {status === 'critical' && '🔴'}
      {status === 'warning' && '🟡'}
      {status === 'info' && '🔵'}
      {status === 'success' && '🟢'}
      {label}
    </span>
  );
}
```

**File:** `components/admin/shared/EmptyState.tsx`
```tsx
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
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {action && (
        <a href={action.href} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          {action.label}
        </a>
      )}
    </div>
  );
}
```

**Estimated time:** 1 hour (both components)

---

### **Sprint 1 Validation**

```bash
# 1. Build passes
npm run build

# 2. No TypeScript errors
npm run type-check

# 3. Sidebar renders
# Navigate to http://localhost:3000/admin
# Should see new sidebar with 6 items

# 4. Counters exist in Firestore
# Firebase Console → Firestore → counters collection

# 5. Old routes still work
# /admin/businesses
# /admin/applications
# /admin/payments
```

---

## 📋 Sprint 2: Operations Inbox (Week 3-4)

### **Database Setup**

#### ✅ **Task 2.1: Create admin_inbox Collection**

**Firestore structure:**
```javascript
admin_inbox/{itemId}
  type: string              // 'application' | 'payment' | 'expiration' | 'review'
  priority: string          // 'critical' | 'warning' | 'info'
  businessId: string
  businessName: string
  metadata: {
    plan?: string
    amount?: number
    daysUntilDue?: number
    daysOverdue?: number
  }
  resolved: boolean
  createdAt: Timestamp
  resolvedAt?: Timestamp
  resolvedBy?: string
```

**Firestore Rules:**
```javascript
// Add to firestore.rules
match /admin_inbox/{itemId} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow write: if false; // Only Cloud Functions
}
```

**Índice compuesto:**
```json
// firestore.indexes.json - Add:
{
  "collectionGroup": "admin_inbox",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "resolved", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

**Estimated time:** 30 min

---

#### ✅ **Task 2.2: Cloud Function - Populate Inbox**

**File:** `functions/src/inboxFunctions.ts` (NEW)

```typescript
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

// Helper to add item to inbox
async function addToInbox(item: {
  type: string;
  priority: string;
  businessId: string;
  businessName: string;
  metadata: any;
}) {
  const db = admin.firestore();
  const inboxRef = db.collection('admin_inbox');
  
  // Check if item already exists (avoid duplicates)
  const existing = await inboxRef
    .where('businessId', '==', item.businessId)
    .where('type', '==', item.type)
    .where('resolved', '==', false)
    .get();
  
  if (!existing.empty) {
    console.log(`Inbox item already exists for ${item.businessName}`);
    return;
  }
  
  await inboxRef.add({
    ...item,
    resolved: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Trigger: New application
export const onNewApplication = onDocumentCreated(
  'applications/{appId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    
    await addToInbox({
      type: 'application',
      priority: 'info',
      businessId: event.params.appId,
      businessName: data.businessName || 'Sin nombre',
      metadata: {
        plan: data.plan || 'free',
        submittedAt: data.createdAt,
      },
    });
  }
);

// Trigger: Business expiration
export const onBusinessUpdate = onDocumentUpdated(
  'businesses/{businessId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    
    const db = admin.firestore();
    const businessId = event.params.businessId;
    
    // Check payment expiration
    if (after.planExpiresAt) {
      const expiresAt = after.planExpiresAt.toDate();
      const now = new Date();
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 7 && daysUntil >= 0) {
        // Warning: Expires soon
        await addToInbox({
          type: 'expiration',
          priority: 'warning',
          businessId,
          businessName: after.businessName || after.name || 'Sin nombre',
          metadata: {
            plan: after.plan,
            daysUntilDue: daysUntil,
            expiresAt: expiresAt.toISOString(),
          },
        });
      } else if (daysUntil < 0) {
        // Critical: Expired
        await addToInbox({
          type: 'payment',
          priority: 'critical',
          businessId,
          businessName: after.businessName || after.name || 'Sin nombre',
          metadata: {
            plan: after.plan,
            daysOverdue: Math.abs(daysUntil),
            expiredAt: expiresAt.toISOString(),
          },
        });
      }
    }
  }
);

// Export all functions
export const inboxFunctions = {
  onNewApplication,
  onBusinessUpdate,
};
```

**Add to index.ts:**
```typescript
// functions/src/index.ts
export {
  onNewApplication,
  onBusinessUpdate,
} from './inboxFunctions';
```

**Deploy:**
```bash
cd functions
npm run build
firebase deploy --only functions:onNewApplication,functions:onBusinessUpdate
```

**Estimated time:** 3 hours

---

#### ✅ **Task 2.3: Create OperationsInbox Component**

**File:** `components/admin/operations/OperationsInbox.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import ActionCard from './ActionCard';
import EmptyState from '../shared/EmptyState';

interface InboxItem {
  id: string;
  type: string;
  priority: 'critical' | 'warning' | 'info';
  businessId: string;
  businessName: string;
  metadata: any;
  createdAt: any;
}

export default function OperationsInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'admin_inbox'),
      where('resolved', '==', false),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InboxItem));
      
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.priority === filter);

  const groupedItems = {
    critical: filteredItems.filter(i => i.priority === 'critical'),
    warning: filteredItems.filter(i => i.priority === 'warning'),
    info: filteredItems.filter(i => i.priority === 'info'),
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="¡Todo al día!"
        description="No hay tareas pendientes en este momento."
        action={{ label: 'Ver todas las solicitudes', href: '/admin/businesses' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Operations Inbox</h1>
        
        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'critical', 'warning', 'info'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 opacity-75">
                ({f === 'all' ? items.length : groupedItems[f as keyof typeof groupedItems].length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Critical Items */}
      {groupedItems.critical.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-600 mb-3">🔴 CRITICAL ({groupedItems.critical.length})</h2>
          <div className="space-y-2">
            {groupedItems.critical.map(item => (
              <ActionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Warning Items */}
      {groupedItems.warning.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-yellow-600 mb-3">🟡 WARNING ({groupedItems.warning.length})</h2>
          <div className="space-y-2">
            {groupedItems.warning.map(item => (
              <ActionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Info Items */}
      {groupedItems.info.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-blue-600 mb-3">🟢 PENDING ({groupedItems.info.length})</h2>
          <div className="space-y-2">
            {groupedItems.info.map(item => (
              <ActionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Estimated time:** 3 hours

---

#### ✅ **Task 2.4: Create ActionCard Component**

**File:** `components/admin/operations/ActionCard.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuickActions from './QuickActions';

interface ActionCardProps {
  item: {
    id: string;
    type: string;
    priority: string;
    businessId: string;
    businessName: string;
    metadata: any;
  };
}

export default function ActionCard({ item }: ActionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/inbox/${item.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: item.businessId }),
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

  const icon = {
    application: '📝',
    payment: '💳',
    expiration: '⏰',
    review: '⭐',
  }[item.type] || '📋';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Icon + Title */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{item.businessName}</h3>
              <p className="text-sm text-gray-600">
                {item.type === 'application' && 'Solicitud nueva'}
                {item.type === 'payment' && `Pago vencido hace ${item.metadata.daysOverdue} días`}
                {item.type === 'expiration' && `Plan vence en ${item.metadata.daysUntilDue} días`}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex gap-3 text-sm text-gray-500 ml-10">
            {item.metadata.plan && (
              <span className="flex items-center gap-1">
                {item.metadata.plan === 'sponsor' && '👑'}
                {item.metadata.plan === 'featured' && '⭐'}
                {item.metadata.plan === 'free' && '🆓'}
                {item.metadata.plan}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <QuickActions 
          type={item.type} 
          onAction={handleAction}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

**Estimated time:** 2 hours

---

#### ✅ **Task 2.5: Create QuickActions Component**

**File:** `components/admin/operations/QuickActions.tsx`

```tsx
interface QuickActionsProps {
  type: string;
  onAction: (action: string) => void;
  loading: boolean;
}

export default function QuickActions({ type, onAction, loading }: QuickActionsProps) {
  const actions = {
    application: [
      { label: '✅ Aprobar', action: 'approve', color: 'green' },
      { label: '❌ Rechazar', action: 'reject', color: 'red' },
      { label: '📝 Más info', action: 'request-info', color: 'blue' },
    ],
    payment: [
      { label: '📧 Recordar', action: 'remind', color: 'blue' },
      { label: '⏸️ Suspender', action: 'suspend', color: 'orange' },
      { label: '💰 Registrar pago', action: 'register-payment', color: 'green' },
    ],
    expiration: [
      { label: '📧 Recordar', action: 'remind', color: 'blue' },
      { label: '🔄 Renovar', action: 'renew', color: 'green' },
    ],
  };

  const buttons = actions[type as keyof typeof actions] || [];

  return (
    <div className="flex gap-2">
      {buttons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => onAction(btn.action)}
          disabled={loading}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
            ${btn.color === 'green' && 'bg-green-100 text-green-700 hover:bg-green-200'}
            ${btn.color === 'red' && 'bg-red-100 text-red-700 hover:bg-red-200'}
            ${btn.color === 'blue' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
            ${btn.color === 'orange' && 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
          `}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
```

**Estimated time:** 1 hour

---

#### ✅ **Task 2.6: Create Operations Inbox Page**

**File:** `app/admin/(operations)/page.tsx`

```tsx
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth } from '@/lib/server/firebaseAdmin';
import { hasAdminOverride } from '@/lib/adminOverrides';
import OperationsInbox from '@/components/admin/operations/OperationsInbox';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    redirect('/para-negocios?auth=required');
  }

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

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <div>
      <OperationsInbox />
    </div>
  );
}
```

**Estimated time:** 30 min

---

#### ✅ **Task 2.7: Create API Routes for Actions**

**File:** `app/api/admin/inbox/[itemId]/[action]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string; action: string } }
) {
  const { itemId, action } = params;
  const { businessId } = await request.json();
  
  const db = getAdminFirestore();
  
  try {
    // Execute action
    switch (action) {
      case 'approve':
        await db.collection('businesses').doc(businessId).update({
          businessStatus: 'published',
          approvedAt: new Date().toISOString(),
        });
        break;
      
      case 'reject':
        await db.collection('businesses').doc(businessId).update({
          applicationStatus: 'rejected',
        });
        break;
      
      case 'remind':
        // Send payment reminder (WhatsApp + email)
        // TODO: Implement notification
        break;
      
      case 'suspend':
        await db.collection('businesses').doc(businessId).update({
          isActive: false,
          disabledReason: 'payment_overdue',
        });
        break;
      
      case 'register-payment':
        // Open payment registration modal
        // TODO: Implement
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Mark inbox item as resolved
    await db.collection('admin_inbox').doc(itemId).update({
      resolved: true,
      resolvedAt: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
```

**Estimated time:** 2 hours

---

### **Sprint 2 Validation**

```bash
# 1. Inbox page loads
# Navigate to http://localhost:3000/admin
# Should see Operations Inbox with items (if any exist)

# 2. Real-time updates work
# Open two browser windows:
#   - Window 1: /admin (inbox)
#   - Window 2: Firestore Console
# Add/modify item in admin_inbox collection
# Verify Window 1 updates automatically

# 3. Actions work
# Click "Aprobar" on a pending application
# Verify:
#   - Business status changes to "published"
#   - Inbox item disappears from list

# 4. Cloud Functions trigger
# Create new application in Firestore
# Verify inbox item appears automatically
```

---

## 📋 Sprint 3-5: Additional Modules

For brevity, detailed checklists for Sprints 3-5 (Pipeline, Billing, Inventory) follow the same structure:

1. **Database setup** (collections, indexes)
2. **Component creation** (UI components)
3. **Page creation** (routes)
4. **API routes** (server actions)
5. **Validation** (testing checklist)

Refer to [ADMIN_PANEL_REWRITE_ARCHITECTURE.md](./ADMIN_PANEL_REWRITE_ARCHITECTURE.md) for full specifications.

---

## 🔧 Component Migration Map

| Old Component | New Component | Action |
|---------------|---------------|--------|
| `AdminNavigation.tsx` | `AdminSidebar.tsx` | Refactor (remove horizontal) |
| `AdminQuickNav.tsx` | `AdminSidebar.tsx` | Delete (merge into sidebar) |
| `AdminStatsPanel.tsx` | Move to `/admin/analytics` | Relocate |
| `AdminBusinessList.tsx` | `BusinessTable.tsx` | Rewrite (table layout) |
| `AdminApplicationsList.tsx` | `OperationsInbox.tsx` | Integrate |
| `PaymentManager.tsx` | `BillingDashboard.tsx` | Refactor |

---

## 📦 Package Installation

```bash
# Drag & drop (Pipeline Kanban)
npm install @dnd-kit/core @dnd-kit/sortable

# Charts (Analytics)
npm install recharts

# Virtualized lists (Businesses table)
npm install react-window

# Date utilities (Billing timeline)
npm install date-fns
```

---

## 🚀 Deployment Commands

```bash
# 1. Deploy Firestore indexes
firebase deploy --only firestore:indexes

# 2. Deploy Firestore rules
firebase deploy --only firestore:rules

# 3. Deploy Cloud Functions
firebase deploy --only functions

# 4. Deploy to Vercel (frontend)
vercel --prod

# 5. Initialize counters (one-time)
npx tsx scripts/init-counters.ts
```

---

## ✅ Final Validation Checklist

### **Functionality**
- [ ] Operations Inbox loads in <300ms
- [ ] Real-time updates work (Firestore listeners)
- [ ] All inline actions execute successfully
- [ ] Sidebar navigation works on mobile
- [ ] Badge counters update in real-time

### **Performance**
- [ ] Firestore reads reduced by 70%+
- [ ] Page size <200KB (excluding images)
- [ ] No layout shift on load (CLS <0.1)

### **Security**
- [ ] Admin auth check on all routes
- [ ] Firestore rules prevent client writes to counters
- [ ] No sensitive data in client logs

### **UX**
- [ ] Empty states show for zero items
- [ ] Loading states during async actions
- [ ] Error messages for failed actions
- [ ] Mobile responsive (sidebar collapses)

---

**Ready to build?** Start with Sprint 1, Task 1.1. 🎯
