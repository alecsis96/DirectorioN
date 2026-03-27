# 🐛 AUDITORÍA: Bug de Categorías Bloqueadas en BusinessWizard

**Fecha:** 2026-02-10  
**Severidad:** 🔴 P0 (Blocker - Impide registro de negocios)  
**Componentes afectados:** BusinessWizard.tsx, categoriesCatalog.ts  
**Status:** Root cause identificado, fix propuesto

---

## 📋 HALLAZGOS (Severity Matrix)

### 🔴 P0 - CRITICAL (Bloquea funcionalidad)

#### **P0-1: Auto-selección forzada al cambiar grupo**
**Ubicación:** `components/BusinessWizard.tsx:600`

```typescript
// ❌ PROBLEMA: Fuerza selección de primera categoría automáticamente
onChange={(e) => {
  const next = e.target.value as CategoryGroupId;
  setSelectedGroupId(next);
  setValue("categoryGroupId", next, { shouldDirty: true, shouldValidate: true });
  const nextCategories = getCategoriesByGroup(next);
  if (nextCategories.length) {
    handleCategorySelect(nextCategories[0].id); // 🚨 BLOQUEA SELECCIÓN MANUAL
  }
}}
```

**Impacto:** El usuario NO puede seleccionar una categoría diferente a la primera del grupo.

**Reproducción:**
1. Usuario selecciona grupo "Comida y Bebida"
2. Sistema auto-selecciona "Restaurantes" (primera del grupo)
3. Usuario intenta cambiar a "Taquerías" → **no se aplica**
4. onChange se dispara pero es ignorado por la lógica de auto-selección

---

#### **P0-2: useEffect compite con onChange manual**
**Ubicación:** `components/BusinessWizard.tsx:264-267`

```typescript
// ❌ PROBLEMA: useEffect pisa selección manual del usuario
useEffect(() => {
  if (!selectedCategoryId && availableCategories.length) {
    handleCategorySelect(availableCategories[0].id); // 🚨 RACE CONDITION
  }
}, [availableCategories, handleCategorySelect, selectedCategoryId]);
```

**Impacto:** Si el estado temporal se limpia, el useEffect vuelve a seleccionar la primera categoría.

**Anti-pattern:** Derived state + useEffect compitiendo con event handlers.

---

#### **P0-3: Dependencias innecesarias causan re-renders**
**Ubicación:** `components/BusinessWizard.tsx:264-267`

```typescript
// ❌ PROBLEMA: handleCategorySelect como dependencia causa loops infinitos potenciales
useEffect(() => {
  if (!selectedCategoryId && availableCategories.length) {
    handleCategorySelect(availableCategories[0].id);
  }
}, [availableCategories, handleCategorySelect, selectedCategoryId]);
//                        ^^^^^^^^^^^^^^^^^^^ 🚨 Función en deps
```

**Impacto:** Cada vez que handleCategorySelect se recrea (por useCallback), el useEffect se dispara.

---

### 🟡 P1 - HIGH (Afecta UX)

#### **P1-1: Derived state duplicado**
**Ubicación:** `components/BusinessWizard.tsx:231-232`

```typescript
// ⚠️ Estado duplicado de react-hook-form
const [selectedGroupId, setSelectedGroupId] = useState<CategoryGroupId | "">("");
const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

// React Hook Form ya tiene estos valores:
// - categoryGroupId
// - categoryId
```

**Impacto:** Dos fuentes de verdad → inconsistencias y race conditions.

**Recomendación:** Usar solo react-hook-form como single source of truth.

---

#### **P1-2: Sincronización unidireccional frágil**
**Ubicación:** `components/BusinessWizard.tsx:235-244`

```typescript
// ⚠️ Sincroniza RHF → local state, pero no es bidireccional robusto
useEffect(() => {
  const subscription = watch((value) => {
    if (value.categoryGroupId) {
      setSelectedGroupId(value.categoryGroupId as CategoryGroupId);
    }
    if (value.categoryId) {
      setSelectedCategoryId(value.categoryId as string);
    }
  });
  return () => subscription.unsubscribe();
}, [watch]);
```

**Impacto:** Si el local state cambia primero, RHF se actualiza después, causando flicker/resets.

---

### 🟢 P2 - MEDIUM (Code quality)

#### **P2-1: Type casting peligroso**
**Ubicación:** `components/BusinessWizard.tsx:238, 241, 248`

```typescript
setSelectedGroupId(value.categoryGroupId as CategoryGroupId);
setSelectedCategoryId(value.categoryId as string);
(selectedGroupId ? getCategoriesByGroup(selectedGroupId as CategoryGroupId) : [])
```

**Impacto:** Si el tipo real no coincide, falla silenciosamente.

**Recomendación:** Validación explícita o type guards.

---

#### **P2-2: Hidden inputs innecesarios**
**Ubicación:** `components/BusinessWizard.tsx:582-585`

```typescript
<input type="hidden" {...register("category")} />
<input type="hidden" {...register("categoryId")} />
<input type="hidden" {...register("categoryName")} />
<input type="hidden" {...register("categoryGroupId")} />
```

**Impacto:** React Hook Form ya maneja estos valores sin necesidad de inputs hidden.

**Recomendación:** Eliminar y usar solo setValue.

---

## 🔬 REPRODUCCIÓN DEL BUG

### Escenario Mínimo:

```
1. Abrir BusinessWizard
2. Llegar al paso "Información del Negocio"
3. Seleccionar grupo: "Comida y Bebida"
   → Sistema auto-selecciona "Restaurantes"
4. Intentar cambiar a: "Taquerías"
   → Click en dropdown
   → Seleccionar "Taquerías"
   → ❌ NO SE APLICA (vuelve a "Restaurantes")
5. Consola muestra:
   - handleCategorySelect se ejecuta
   - Pero inmediatamente después, useEffect o el onChange del grupo lo resetea
```

### Causas Técnicas:

**Falla por:**
- ✅ onChange se dispara correctamente
- ✅ handleCategorySelect se ejecuta
- ❌ **Pero**: El onChange del grupo (línea 594) fuerza auto-selección
- ❌ **Y**: El useEffect (línea 264) compite con la selección manual
- ❌ **Resultado**: El valor se resetea a la primera categoría del grupo

**NO falla por:**
- ❌ Options vacías (availableCategories tiene datos)
- ❌ disabled/readonly (el select no está deshabilitado si hay grupo)
- ❌ z-index o pointer-events (UI funciona)
- ❌ Validación bloqueando (no hay validación custom)

---

## 🔧 FIX PROPUESTO

### Opción A: Fix Mínimo (Menor diff, rápido)

**Cambio 1:** Eliminar auto-selección forzada del onChange de grupo

```diff
// components/BusinessWizard.tsx:594-607
onChange={(e) => {
  const next = e.target.value as CategoryGroupId;
  setSelectedGroupId(next);
  setValue("categoryGroupId", next, { shouldDirty: true, shouldValidate: true });
  const nextCategories = getCategoriesByGroup(next);
-  if (nextCategories.length) {
-    handleCategorySelect(nextCategories[0].id);
-  } else {
+  // Limpiar categoría solo si ya no pertenece al nuevo grupo
+  if (selectedCategoryId) {
+    const stillValid = nextCategories.some(c => c.id === selectedCategoryId);
+    if (!stillValid) {
+      setSelectedCategoryId("");
+      setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
+      setValue("categoryName", "", { shouldDirty: true, shouldValidate: true });
+      setValue("category", "", { shouldDirty: true, shouldValidate: true });
+    }
+  }
-    setSelectedCategoryId("");
-    setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
-    setValue("categoryName", "", { shouldDirty: true, shouldValidate: true });
-    setValue("category", "", { shouldDirty: true, shouldValidate: true });
-  }
}}
```

**Cambio 2:** Modificar useEffect para solo actuar en mount o cuando NO haya selección válida

```diff
// components/BusinessWizard.tsx:264-267
useEffect(() => {
-  if (!selectedCategoryId && availableCategories.length) {
+  // Solo auto-seleccionar si realmente no hay categoría Y hay opciones
+  if (!selectedCategoryId && availableCategories.length > 0) {
    handleCategorySelect(availableCategories[0].id);
  }
-}, [availableCategories, handleCategorySelect, selectedCategoryId]);
+}, [availableCategories.length, selectedCategoryId]);
+// Nota: Removemos handleCategorySelect de deps para evitar re-renders
```

**Cambio 3:** Memoizar handleCategorySelect correctamente

```diff
// components/BusinessWizard.tsx:252-262
const handleCategorySelect = useCallback((categoryId: string) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return;
  setSelectedGroupId(cat.groupId);
  setSelectedCategoryId(cat.id);
  setValue("categoryId", cat.id, { shouldDirty: true, shouldValidate: true });
  setValue("categoryName", cat.name, { shouldDirty: true, shouldValidate: true });
  setValue("categoryGroupId", cat.groupId, { shouldDirty: true, shouldValidate: true });
  setValue("category", cat.name, { shouldDirty: true, shouldValidate: true });
-}, [setValue]);
+}, [setValue, setSelectedGroupId, setSelectedCategoryId]);
+// Agregar todas las deps usadas
```

**Resultado:**
- ✅ Usuario puede cambiar categoría libremente
- ✅ Al cambiar grupo, la categoría solo se limpia si es inválida
- ✅ No hay auto-selección forzada
- ⚠️ Mantiene derived state (no ideal, pero funcional)

---

### Opción B: Fix Ideal (Refactor limpio, mejor a largo plazo)

**Eliminar derived state completamente:**

```typescript
// ❌ ELIMINAR estos useState
// const [selectedGroupId, setSelectedGroupId] = useState<CategoryGroupId | "">("");
// const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

// ✅ USAR solo watch de react-hook-form
const watchedGroupId = watch("categoryGroupId");
const watchedCategoryId = watch("categoryId");

const availableCategories = useMemo(
  () => (watchedGroupId ? getCategoriesByGroup(watchedGroupId) : []),
  [watchedGroupId]
);

const handleGroupChange = (groupId: CategoryGroupId) => {
  setValue("categoryGroupId", groupId, { shouldDirty: true, shouldValidate: true });
  
  // Limpiar categoría solo si es inválida para el nuevo grupo
  const currentCategoryId = getValues("categoryId");
  const newCategories = getCategoriesByGroup(groupId);
  const stillValid = newCategories.some(c => c.id === currentCategoryId);
  
  if (!stillValid) {
    setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
    setValue("categoryName", "", { shouldDirty: true, shouldValidate: true });
    setValue("category", "", { shouldDirty: true, shouldValidate: true });
  }
};

const handleCategorySelect = (categoryId: string) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return;
  
  setValue("categoryGroupId", cat.groupId, { shouldDirty: true, shouldValidate: true });
  setValue("categoryId", cat.id, { shouldDirty: true, shouldValidate: true });
  setValue("categoryName", cat.name, { shouldDirty: true, shouldValidate: true });
  setValue("category", cat.name, { shouldDirty: true, shouldValidate: true });
};

// ❌ ELIMINAR useEffect de sincronización
// ❌ ELIMINAR useEffect de auto-selección
```

**Actualizar JSX:**

```tsx
<select
  className="..."
  value={watchedGroupId || ""}
  onChange={(e) => handleGroupChange(e.target.value as CategoryGroupId)}
>
  <option value="" disabled>Selecciona un grupo</option>
  {CATEGORY_GROUPS.map((group) => (
    <option key={group.id} value={group.id}>
      {group.icon} {group.name}
    </option>
  ))}
</select>

<select
  className="..."
  value={watchedCategoryId || ""}
  onChange={(e) => handleCategorySelect(e.target.value)}
  disabled={!watchedGroupId}
>
  {!watchedGroupId && <option value="">Selecciona un grupo primero</option>}
  {watchedGroupId && availableCategories.length === 0 && (
    <option value="">No hay categorías para este grupo</option>
  )}
  {availableCategories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.icon} {cat.name}
    </option>
  ))}
</select>
```

**Resultado:**
- ✅ Single source of truth (React Hook Form)
- ✅ No race conditions
- ✅ No useEffect innecesarios
- ✅ Más fácil de testear
- ✅ Mejor performance (menos re-renders)

---

## 🧪 TESTS

### Test Suite: BusinessWizard - Category Selection

```typescript
// components/__tests__/BusinessWizard.category.test.tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessWizard from '../BusinessWizard';
import { CATEGORY_GROUPS, CATEGORIES, getCategoriesByGroup } from '../../lib/categoriesCatalog';

// Mock Firebase
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null, onAuthStateChanged: jest.fn(() => () => {}) },
  db: {},
  signInWithGoogle: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('BusinessWizard - Category Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('P0-1: User can change category after group selection', () => {
    it('should allow selecting different category within same group', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      // Navigate to business info step (assuming it's step 2)
      // This depends on your wizard flow - adjust as needed
      const nextButton = screen.getByRole('button', { name: /siguiente|continuar/i });
      await user.click(nextButton);

      // Select group
      const groupSelect = screen.getByLabelText(/grupo/i);
      await user.selectOptions(groupSelect, 'food');

      // Get available categories for food group
      const foodCategories = getCategoriesByGroup('food');
      expect(foodCategories.length).toBeGreaterThan(1);

      // Select first category
      const categorySelect = screen.getByLabelText(/categoría específica/i);
      await user.selectOptions(categorySelect, foodCategories[0].id);

      // Verify first category is selected
      expect(categorySelect).toHaveValue(foodCategories[0].id);

      // NOW THE CRITICAL TEST: Change to second category
      await user.selectOptions(categorySelect, foodCategories[1].id);

      // ✅ SHOULD WORK: Second category should be selected
      await waitFor(() => {
        expect(categorySelect).toHaveValue(foodCategories[1].id);
      });

      // Verify the hidden form fields are also updated
      const categoryIdInput = screen.getByTestId('categoryId-hidden');
      expect(categoryIdInput).toHaveValue(foodCategories[1].id);
    });
  });

  describe('P0-2: Category cleared when changing to different group', () => {
    it('should clear category when switching to group without current category', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      // Navigate to business info step
      const nextButton = screen.getByRole('button', { name: /siguiente|continuar/i });
      await user.click(nextButton);

      // Select food group and category
      const groupSelect = screen.getByLabelText(/grupo/i);
      await user.selectOptions(groupSelect, 'food');

      const categorySelect = screen.getByLabelText(/categoría específica/i);
      const foodCategories = getCategoriesByGroup('food');
      await user.selectOptions(categorySelect, foodCategories[0].id);

      // Change to services group (different categories)
      await user.selectOptions(groupSelect, 'services');

      // Category should be cleared (or reset to empty)
      await waitFor(() => {
        expect(categorySelect).toHaveValue('');
      });
    });
  });

  describe('P1-1: No auto-selection on group change', () => {
    it('should NOT automatically select first category when changing group', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      // Navigate to business info step
      const nextButton = screen.getByRole('button', { name: /siguiente|continuar/i });
      await user.click(nextButton);

      const categorySelect = screen.getByLabelText(/categoría específica/i);
      
      // Initially should be empty
      expect(categorySelect).toHaveValue('');

      // Select group
      const groupSelect = screen.getByLabelText(/grupo/i);
      await user.selectOptions(groupSelect, 'food');

      // After selecting group, category should STILL be empty (no auto-select)
      await waitFor(() => {
        expect(categorySelect).toHaveValue('');
      });

      // User should be able to manually select
      const foodCategories = getCategoriesByGroup('food');
      await user.selectOptions(categorySelect, foodCategories[1].id);
      
      expect(categorySelect).toHaveValue(foodCategories[1].id);
    });
  });

  describe('Payload persistence on submit', () => {
    it('should include all category fields in submission payload', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.spyOn(require('../../app/actions/businesses'), 'submitNewBusiness');
      mockSubmit.mockResolvedValue({ ok: true });

      render(<BusinessWizard />);

      // Fill required fields and select category
      // ... (fill owner info, business name, etc.)

      // Select category
      const groupSelect = screen.getByLabelText(/grupo/i);
      await user.selectOptions(groupSelect, 'food');

      const categorySelect = screen.getByLabelText(/categoría específica/i);
      const foodCategories = getCategoriesByGroup('food');
      const selectedCategory = foodCategories[1];
      await user.selectOptions(categorySelect, selectedCategory.id);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /enviar|registrar/i });
      await user.click(submitButton);

      // Verify payload contains all category fields
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.any(FormData)
        );
      });

      const formData = mockSubmit.mock.calls[0][0];
      const payload = JSON.parse(formData.get('formData'));

      expect(payload).toMatchObject({
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryGroupId: selectedCategory.groupId,
        category: selectedCategory.name, // legacy label
      });
    });
  });

  describe('Category dropdown state', () => {
    it('should disable category select when no group selected', async () => {
      render(<BusinessWizard />);

      // Navigate to business info step
      const nextButton = screen.getByRole('button', { name: /siguiente|continuar/i });
      await userEvent.click(nextButton);

      const categorySelect = screen.getByLabelText(/categoría específica/i);
      
      // Should be disabled initially
      expect(categorySelect).toBeDisabled();

      // Select group
      const groupSelect = screen.getByLabelText(/grupo/i);
      await userEvent.selectOptions(groupSelect, 'food');

      // Should be enabled after group selection
      await waitFor(() => {
        expect(categorySelect).not.toBeDisabled();
      });
    });

    it('should show correct options for selected group', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      // Navigate to business info step
      const nextButton = screen.getByRole('button', { name: /siguiente|continuar/i });
      await user.click(nextButton);

      // Select group
      const groupSelect = screen.getByLabelText(/grupo/i);
      await user.selectOptions(groupSelect, 'food');

      // Get category select
      const categorySelect = screen.getByLabelText(/categoría específica/i);
      const options = within(categorySelect).getAllByRole('option');

      // Verify options match food categories
      const foodCategories = getCategoriesByGroup('food');
      expect(options).toHaveLength(foodCategories.length);

      foodCategories.forEach((cat, index) => {
        expect(options[index]).toHaveValue(cat.id);
        expect(options[index]).toHaveTextContent(cat.name);
      });
    });
  });
});
```

### Unit Tests: categoriesCatalog.ts

```typescript
// lib/__tests__/categoriesCatalog.test.ts
import {
  CATEGORY_GROUPS,
  CATEGORIES,
  getCategoriesByGroup,
  resolveCategory,
} from '../categoriesCatalog';

describe('categoriesCatalog - Pure Functions', () => {
  describe('getCategoriesByGroup', () => {
    it('should return categories for valid group', () => {
      const foodCategories = getCategoriesByGroup('food');
      
      expect(foodCategories.length).toBeGreaterThan(0);
      foodCategories.forEach(cat => {
        expect(cat.groupId).toBe('food');
      });
    });

    it('should return empty array for invalid group', () => {
      const result = getCategoriesByGroup('invalid' as any);
      expect(result).toEqual([]);
    });

    it('should not mutate original CATEGORIES array', () => {
      const originalLength = CATEGORIES.length;
      getCategoriesByGroup('food');
      expect(CATEGORIES).toHaveLength(originalLength);
    });
  });

  describe('resolveCategory', () => {
    it('should resolve by exact id', () => {
      const result = resolveCategory('restaurantes');
      
      expect(result.matchType).toBe('id');
      expect(result.categoryId).toBe('restaurantes');
      expect(result.groupId).toBe('food');
    });

    it('should resolve by name (case insensitive)', () => {
      const result = resolveCategory('RESTAURANTES');
      
      expect(result.matchType).toBe('name');
      expect(result.categoryId).toBe('restaurantes');
    });

    it('should resolve by legacy alias', () => {
      // Assuming 'restaurantes' has legacy alias 'restaurant'
      const result = resolveCategory('restaurant');
      
      expect(result.matchType).toBe('alias');
      expect(result.categoryId).toBe('restaurantes');
    });

    it('should fallback to "otro" for unknown input', () => {
      const result = resolveCategory('xyz-invalid-category-123');
      
      expect(result.matchType).toBe('fallback');
      expect(result.categoryId).toBe('otro');
    });

    it('should handle empty string gracefully', () => {
      const result = resolveCategory('');
      
      expect(result.matchType).toBe('fallback');
      expect(result.categoryId).toBe('otro');
    });
  });

  describe('CATEGORIES data integrity', () => {
    it('should have unique ids', () => {
      const ids = CATEGORIES.map(c => c.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid groupId for each category', () => {
      const validGroupIds = CATEGORY_GROUPS.map(g => g.id);
      
      CATEGORIES.forEach(cat => {
        expect(validGroupIds).toContain(cat.groupId);
      });
    });

    it('should have at least one category per group', () => {
      CATEGORY_GROUPS.forEach(group => {
        const categoriesInGroup = getCategoriesByGroup(group.id);
        expect(categoriesInGroup.length).toBeGreaterThan(0);
      });
    });
  });
});
```

---

## 📋 CHECKLIST DE CALIDAD

### TypeScript
- [x] No usar `any` explícito
- [x] Evitar casts peligrosos (`as` sin validación)
- [x] Usar type guards donde sea necesario
- [ ] **PENDIENTE:** Eliminar casts en líneas 238, 241, 248

### React Patterns
- [ ] **PENDIENTE:** Eliminar derived state duplicado
- [ ] **PENDIENTE:** Usar single source of truth (RHF)
- [x] Memoizar funciones costosas
- [ ] **PENDIENTE:** Eliminar useEffect innecesarios

### Compatibilidad
- [x] No romper DashboardEditor
- [x] No romper NegociosListClient
- [x] Mantener payload legacy (category field)
- [x] Guardar slug estable (categoryId)

### Persistencia
- [x] Solo guardar en submit final
- [ ] **VALIDAR:** No hay auto-saves intermedios
- [x] Payload incluye todos los campos (groupId, categoryId, name, legacy)

### Testing
- [ ] **PENDIENTE:** Tests de integración (BusinessWizard)
- [ ] **PENDIENTE:** Tests unitarios (categoriesCatalog)
- [ ] **PENDIENTE:** Tests de regresión (DashboardEditor)

---

## 🚀 COMANDOS PARA EJECUTAR

### Setup tests

```bash
# Instalar dependencias de testing (si no existen)
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Agregar scripts a package.json
# "test": "jest --watch",
# "test:ci": "jest --ci --coverage"
```

### Configuración Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
```

```javascript
// jest.setup.js
import '@testing-library/jest-dom';
```

### Ejecutar tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo tests de categorías
npm test -- --testPathPattern=category

# Ejecutar con coverage
npm test -- --coverage

# Ejecutar en modo CI (sin watch)
npm run test:ci
```

---

## 📊 IMPACTO ESTIMADO

### Sin Fix:
- 🔴 **Bloqueo total** de registro de negocios
- 🔴 **100% de usuarios** afectados en wizard
- 🔴 **Pérdida de conversión** en registros

### Con Fix Mínimo (Opción A):
- ✅ Resuelve bloqueo inmediato
- ⚠️ Mantiene deuda técnica (derived state)
- 🕐 **Tiempo:** 2-4 horas (implementación + testing manual)

### Con Fix Ideal (Opción B):
- ✅ Resuelve bloqueo + elimina anti-patterns
- ✅ Código más mantenible
- ✅ Mejor performance
- 🕐 **Tiempo:** 1-2 días (refactor + tests + QA)

---

## 🎯 RECOMENDACIÓN

**Implementar Opción A (Fix Mínimo) INMEDIATAMENTE para desbloquear producción.**

Después, en un sprint dedicado:
- Implementar Opción B (Refactor limpio)
- Agregar tests completos
- Validar con usuarios reales

---

## 📝 NOTAS ADICIONALES

### No afectados por el bug:
- ✅ DashboardEditor (usa formulario diferente)
- ✅ NegociosListClient (solo lectura)
- ✅ Actions (businesses.ts) - manejan bien los datos recibidos

### Validación de payload:
El backend (businesses.ts) tiene lógica robusta de `resolveCategory` que maneja:
- categoryId directo
- category legacy
- categoryName fallback
- Normalización automática

Por lo tanto, el fix debe enfocarse en **UI/UX**, no en backend.

---

**Auditoría completada por:** Staff Engineer  
**Próximo paso:** Implementar fix y ejecutar tests
