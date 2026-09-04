import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ connection: vi.fn<() => Promise<void>>() }));

vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('../lib/featureFlags', () => ({ PUBLIC_APPLICATION_V2_ENABLED: true }));
vi.mock('../components/BusinessWizard', () => ({
  default: (props: {
    turnstileMode: string;
    turnstileSiteKey: string;
    publicApplicationV2Enabled: boolean;
  }) => (
    <div
      data-testid="wizard"
      data-mode={props.turnstileMode}
      data-site-key={props.turnstileSiteKey}
      data-v2={String(props.publicApplicationV2Enabled)}
    />
  ),
}));

import RegistroNegocioPage from '../app/registro-negocio/page';

describe('Registration Turnstile runtime mode', () => {
  beforeEach(() => {
    mocks.connection.mockReset().mockResolvedValue(undefined);
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'public-test-site-key');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it.each([
    ['observe', 'observe'],
    ['enforce', 'enforce'],
    ['off', 'off'],
    [undefined, 'off'],
    ['', 'off'],
    ['invalid', 'off'],
    ['OBSERVE', 'off'],
    [' observe ', 'off'],
  ])('maps runtime value %s to %s', async (configured, expected) => {
    vi.stubEnv('PUBLIC_APPLICATION_TURNSTILE_MODE', configured);

    render(await RegistroNegocioPage());

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(screen.getByTestId('wizard')).toHaveAttribute('data-mode', expected);
    expect(screen.getByTestId('wizard')).toHaveAttribute('data-site-key', 'public-test-site-key');
    expect(screen.getByTestId('wizard')).toHaveAttribute('data-v2', 'true');
  });

  it('reads the mode only after connection resolves', async () => {
    let connect!: () => void;
    mocks.connection.mockImplementationOnce(() => new Promise<void>((resolve) => {
      connect = resolve;
    }));
    vi.stubEnv('PUBLIC_APPLICATION_TURNSTILE_MODE', 'off');

    const page = RegistroNegocioPage();
    vi.stubEnv('PUBLIC_APPLICATION_TURNSTILE_MODE', 'observe');
    connect();
    render(await page);

    expect(screen.getByTestId('wizard')).toHaveAttribute('data-mode', 'observe');
  });
});
