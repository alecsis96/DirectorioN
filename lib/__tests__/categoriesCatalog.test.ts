// lib/__tests__/categoriesCatalog.test.ts
import { describe, it, expect } from 'vitest';
import {
  CATEGORY_GROUPS,
  CATEGORIES,
  getCategoriesByGroup,
  resolveCategory,
  type CategoryGroupId,
  type CategoryItem,
} from '../categoriesCatalog';

describe('categoriesCatalog', () => {
  describe('Data Structure Integrity', () => {
    it('should have at least 3 category groups', () => {
      expect(CATEGORY_GROUPS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have at least 10 categories', () => {
      expect(CATEGORIES.length).toBeGreaterThanOrEqual(10);
    });

    it('all category groups should have required fields', () => {
      CATEGORY_GROUPS.forEach(group => {
        expect(group).toHaveProperty('id');
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('icon');
        expect(typeof group.id).toBe('string');
        expect(typeof group.name).toBe('string');
        expect(typeof group.icon).toBe('string');
      });
    });

    it('all categories should have required fields', () => {
      CATEGORIES.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('groupId');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('icon');
        expect(typeof category.id).toBe('string');
        expect(typeof category.groupId).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.icon).toBe('string');
      });
    });

    it('all categories should reference existing groups', () => {
      const groupIds = new Set(CATEGORY_GROUPS.map(g => g.id));

      CATEGORIES.forEach(category => {
        expect(groupIds.has(category.groupId)).toBe(true);
      });
    });

    it('should have no duplicate category IDs', () => {
      const ids = CATEGORIES.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have no duplicate group IDs', () => {
      const ids = CATEGORY_GROUPS.map(g => g.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('getCategoriesByGroup()', () => {
    it('should return categories for food group', () => {
      const foodCategories = getCategoriesByGroup('food');
      
      expect(Array.isArray(foodCategories)).toBe(true);
      expect(foodCategories.length).toBeGreaterThan(0);
      
      foodCategories.forEach(cat => {
        expect(cat.groupId).toBe('food');
      });
    });

    it('should return categories for services group', () => {
      const serviceCategories = getCategoriesByGroup('services');
      
      expect(Array.isArray(serviceCategories)).toBe(true);
      expect(serviceCategories.length).toBeGreaterThan(0);
      
      serviceCategories.forEach(cat => {
        expect(cat.groupId).toBe('services');
      });
    });

    it('should return empty array for non-existent group', () => {
      const result = getCategoriesByGroup('invalid_group_id' as CategoryGroupId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return categories for commerce group', () => {
      const commerceCategories = getCategoriesByGroup('commerce');
      
      expect(Array.isArray(commerceCategories)).toBe(true);
      expect(commerceCategories.length).toBeGreaterThan(0);
      
      commerceCategories.forEach(cat => {
        expect(cat.groupId).toBe('commerce');
      });
    });

    it('all groups should have at least one category', () => {
      CATEGORY_GROUPS.forEach(group => {
        const categories = getCategoriesByGroup(group.id);
        expect(categories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('resolveCategory()', () => {
    /**
     * Critical functionality: Normalizes various input formats to stable output
     */
    it('should resolve category by ID (primary key)', () => {
      const category = CATEGORIES[0];
      const result = resolveCategory(category.id);

      expect(result).toEqual({
        categoryId: category.id,
        categoryName: category.name,
        categoryGroupId: category.groupId,
      });
    });

    it('should resolve category by name', () => {
      const category = CATEGORIES[1];
      const result = resolveCategory(category.name);

      expect(result).toBeDefined();
      expect(result.categoryName).toBe(category.name);
      expect(result.categoryId).toBe(category.id);
      expect(result.groupId).toBe(category.groupId);
      expect(result.matchType).toBe('name');
    });

    it('should resolve category by legacy alias', () => {
      const categoryWithAliases = CATEGORIES.find(c => c.legacyAliases && c.legacyAliases.length > 0);
      if (!categoryWithAliases || !categoryWithAliases.legacyAliases) {
        return; // Skip if no aliases available
      }
      
      const alias = categoryWithAliases.legacyAliases[0];
      const result = resolveCategory(alias);

      expect(result).toBeDefined();
      expect(result.categoryId).toBe(categoryWithAliases.id);
      expect(result.matchType).toBe('alias');
    });

    it('should resolve category by ID with correct match type', () => {
      const cat1 = CATEGORIES[0];

      const result = resolveCategory(cat1.id);

      expect(result).toEqual({
        categoryId: cat1.id,
        categoryName: cat1.name,
        groupId: cat1.groupId,
        matchType: 'id',
      });
    });

    it('should return fallback for invalid categoryId', () => {
      const result = resolveCategory('invalid_category_id');
      expect(result.matchType).toBe('fallback');
      expect(result.categoryId).toBe('otro');
    });

    it('should return fallback for invalid category name', () => {
      const result = resolveCategory('Invalid Category Name That Does Not Exist');
      expect(result.matchType).toBe('fallback');
      expect(result.categoryId).toBe('otro');
    });

    it('should return fallback when input is undefined', () => {
      const result = resolveCategory(undefined);
      expect(result.matchType).toBe('fallback');
      expect(result.categoryId).toBe('otro');
    });

    it('should handle case-insensitive matching for names', () => {
      const category = CATEGORIES.find(c => c.name.includes('Restaurante'));
      if (!category) {
        // Skip if no restaurant category exists
        return;
      }

      // Exact match should work
      const result1 = resolveCategory(category.name);
      expect(result1).toBeDefined();
      expect(result1.categoryId).toBe(category.id);

      // Different case should ALSO work (case-insensitive + normalized)
      const result2 = resolveCategory(category.name.toUpperCase());
      expect(result2.categoryId).toBe(category.id);
    });

    it('should resolve all existing categories by ID', () => {
      CATEGORIES.forEach(cat => {
        const result = resolveCategory(cat.id);
        expect(result).toEqual({
          categoryId: cat.id,
          categoryName: cat.name,
          groupId: cat.groupId,
          matchType: 'id',
        });
      });
    });

    it('should resolve all existing categories by name', () => {
      CATEGORIES.forEach(cat => {
        const result = resolveCategory(cat.name);
        expect(result).toEqual({
          categoryId: cat.id,
          categoryName: cat.name,
          groupId: cat.groupId,
          matchType: 'name',
        });
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('every group mentioned in categories should exist in CATEGORY_GROUPS', () => {
      const groupIds = new Set(CATEGORY_GROUPS.map(g => g.id));
      const usedGroupIds = new Set(CATEGORIES.map(c => c.groupId));

      usedGroupIds.forEach(groupId => {
        expect(groupIds.has(groupId)).toBe(true);
      });
    });

    it('should have "otro" fallback category', () => {
      const otroCategory = CATEGORIES.find(c => c.id === 'otro');
      expect(otroCategory).toBeDefined();
      
      if (otroCategory) {
        expect(otroCategory.name).toBeTruthy();
        expect(otroCategory.groupId).toBeTruthy();
      }
    });
  });
});
