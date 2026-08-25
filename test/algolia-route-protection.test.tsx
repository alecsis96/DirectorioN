import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('../components/NegociosAlgoliaClient', () => ({
  default: () => null,
}));

import NegociosAlgoliaPage from '../app/negocios-algolia/page';

describe('/negocios-algolia', () => {
  it('redirige en el componente servidor antes de montar el cliente', () => {
    expect(() => NegociosAlgoliaPage()).toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/negocios');
  });
});
