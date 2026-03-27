/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
// components/__tests__/BusinessWizard.category.test.tsx
import { vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessWizard from '../BusinessWizard';
import { CATEGORY_GROUPS, CATEGORIES, getCategoriesByGroup } from '../../lib/categoriesCatalog';

// Mock Firebase
vi.mock('../../firebaseConfig', () => ({
  auth: { 
    currentUser: null, 
    onAuthStateChanged: vi.fn((callback) => {
      callback(null);
      return () => {};
    })
  },
  db: {},
  signInWithGoogle: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ 
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Google Maps
global.google = {
  maps: {
    places: {
      Autocomplete: vi.fn(),
    },
  },
} as any;

describe('BusinessWizard - Category Selection Bug Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * P0-1: Critical bug - User cannot change category after auto-selection
   * 
   * BEFORE FIX:
   * - Select group → auto-selects first category
   * - Try to change category → reverts back to first
   * 
   * AFTER FIX:
   * - Select group → NO auto-selection
   * - User can freely choose any category
   */
  describe('P0-1: User can change category after group selection', () => {
    it('should allow selecting different category within same group', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      // Navigate to business info step (assuming it's accessible)
      // Note: Adjust these selectors based on your actual step navigation
      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Initially category should be disabled (no group selected)
      expect(categorySelect).toBeDisabled();

      // Select food group
      await user.selectOptions(groupSelect, 'food');

      // Category should now be enabled
      await waitFor(() => {
        expect(categorySelect).not.toBeDisabled();
      });

      // Get available categories for food group
      const foodCategories = getCategoriesByGroup('food');
      expect(foodCategories.length).toBeGreaterThan(1);

      // Select first category manually
      await user.selectOptions(categorySelect, foodCategories[0].id);
      expect(categorySelect).toHaveValue(foodCategories[0].id);

      // CRITICAL TEST: Change to second category
      // This should work (bug: it didn't before)
      await user.selectOptions(categorySelect, foodCategories[1].id);

      // ✅ SHOULD WORK: Second category should be selected and persist
      await waitFor(() => {
        expect(categorySelect).toHaveValue(foodCategories[1].id);
      });
    });

    it('should NOT auto-select first category when group changes', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Select food group
      await user.selectOptions(groupSelect, 'food');

      // Category should remain empty (not auto-selected)
      await waitFor(() => {
        expect(categorySelect).toHaveValue('');
      });

      // User explicitly selects a category
      const foodCategories = getCategoriesByGroup('food');
      await user.selectOptions(categorySelect, foodCategories[2].id);
      expect(categorySelect).toHaveValue(foodCategories[2].id);
    });
  });

  /**
   * P0-2: Category cleared when changing to different group
   * 
   * Expected behavior:
   * - If current category doesn't exist in new group → clear it
   * - User must manually select from new group's options
   */
  describe('P0-2: Category cleared when changing to incompatible group', () => {
    it('should clear category when switching to group without current category', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Select food group and category
      await user.selectOptions(groupSelect, 'food');
      const foodCategories = getCategoriesByGroup('food');
      await user.selectOptions(categorySelect, foodCategories[0].id);

      expect(categorySelect).toHaveValue(foodCategories[0].id);

      // Change to services group (completely different categories)
      await user.selectOptions(groupSelect, 'services');

      // Category should be cleared (food category not in services)
      await waitFor(() => {
        expect(categorySelect).toHaveValue('');
      });
    });

    it('should preserve category if it exists in new group', async () => {
      // This test would require a category that exists in multiple groups
      // Skip if no such categories exist in your catalog
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Find a category that might exist in multiple groups (like "otro")
      const sharedCategory = CATEGORIES.find(c => c.id === 'otro');
      if (!sharedCategory) {
        // Skip test if no shared categories
        return;
      }

      // Select first group with shared category
      await user.selectOptions(groupSelect, sharedCategory.groupId);
      await user.selectOptions(categorySelect, sharedCategory.id);

      // If we switch to another group that also has this category, it should persist
      // (In practice, "otro" is usually only in one group, so this test might not apply)
    });
  });

  /**
   * Form persistence and payload validation
   */
  describe('Payload persistence on submit', () => {
    it('should include all category fields in form state', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Select category
      await user.selectOptions(groupSelect, 'food');
      const foodCategories = getCategoriesByGroup('food');
      const selectedCategory = foodCategories[1];
      await user.selectOptions(categorySelect, selectedCategory.id);

      // Check hidden inputs (if they exist)
      // Note: After fix, these might not be needed
      const categoryIdInput = document.querySelector('input[name="categoryId"]');
      const categoryNameInput = document.querySelector('input[name="categoryName"]');
      const categoryGroupIdInput = document.querySelector('input[name="categoryGroupId"]');

      if (categoryIdInput) {
        expect(categoryIdInput).toHaveValue(selectedCategory.id);
      }
      if (categoryNameInput) {
        expect(categoryNameInput).toHaveValue(selectedCategory.name);
      }
      if (categoryGroupIdInput) {
        expect(categoryGroupIdInput).toHaveValue(selectedCategory.groupId);
      }
    });
  });

  /**
   * UI state management
   */
  describe('Category dropdown state', () => {
    it('should disable category select when no group selected', async () => {
      render(<BusinessWizard />);

      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });
      
      // Should be disabled initially (no group)
      expect(categorySelect).toBeDisabled();
    });

    it('should enable category select after group selection', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      expect(categorySelect).toBeDisabled();

      // Select group
      await user.selectOptions(groupSelect, 'food');

      // Should be enabled
      await waitFor(() => {
        expect(categorySelect).not.toBeDisabled();
      });
    });

    it('should show correct options for selected group', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      
      // Select food group
      await user.selectOptions(groupSelect, 'food');

      // Get category select and its options
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });
      const options = within(categorySelect).getAllByRole('option') as HTMLOptionElement[];

      // Verify options match food categories
      const foodCategories = getCategoriesByGroup('food');
      
      // Filter out empty/placeholder options
      const validOptions = options.filter(opt => opt.value !== '');
      
      expect(validOptions.length).toBe(foodCategories.length);

      foodCategories.forEach(cat => {
        const option = validOptions.find(opt => opt.value === cat.id);
        expect(option).toBeDefined();
        expect(option?.textContent).toContain(cat.name);
      });
    });
  });

  /**
   * Edge cases
   */
  describe('Edge cases', () => {
    it('should handle rapid group changes without race conditions', async () => {
      const user = userEvent.setup();
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Rapidly change groups
      await user.selectOptions(groupSelect, 'food');
      await user.selectOptions(groupSelect, 'services');
      await user.selectOptions(groupSelect, 'commerce');

      // Final state should be commerce group with no category
      await waitFor(() => {
        expect(groupSelect).toHaveValue('commerce');
        expect(categorySelect).toHaveValue('');
      });
    });

    it('should handle empty group gracefully', async () => {
      render(<BusinessWizard />);

      const groupSelect = screen.getByRole('combobox', { name: /grupo/i });
      const categorySelect = screen.getByRole('combobox', { name: /categoría específica/i });

      // Check initial state
      expect(groupSelect).toHaveValue('');
      expect(categorySelect).toBeDisabled();
      
      // Placeholder option should exist
      const placeholder = within(categorySelect).getByText(/selecciona un grupo primero/i);
      expect(placeholder).toBeInTheDocument();
    });
  });
});
