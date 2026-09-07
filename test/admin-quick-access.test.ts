import { expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

it('shows the quick admin destination only behind the server-confirmed isAdmin state', () => {
  const navigation = fs.readFileSync(path.join(process.cwd(), 'components/Navigation.tsx'), 'utf8');
  const authHook = fs.readFileSync(path.join(process.cwd(), 'hooks/useAuth.ts'), 'utf8');
  expect(navigation).toContain("...(isAdmin ? [{ icon: LayoutDashboard, label: 'Panel de administración', href: '/admin'");
  expect(navigation).toContain('{isAdmin ? (');
  expect(authHook).toContain('state.isAdmin === true');
  expect(authHook).not.toContain('hasAdminOverride');
  expect(authHook).not.toContain("claims?.admin");
});
