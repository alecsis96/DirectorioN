import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TurnstileWidget from '../components/security/TurnstileWidget';

describe('0.2R.2.1 Turnstile widget', () => {
  afterEach(() => {
    delete window.turnstile;
  });

  it('keeps the token in component state callbacks and resets it after an attempt', async () => {
    let successCallback: ((token: string) => void) | undefined;
    const renderWidget = vi.fn((_container, options) => {
      successCallback = options.callback;
      return 'widget-1';
    });
    const resetWidget = vi.fn();
    const removeWidget = vi.fn();
    window.turnstile = {
      render: renderWidget,
      reset: resetWidget,
      remove: removeWidget,
    };
    const onTokenChange = vi.fn();
    const view = render(
      <TurnstileWidget siteKey="public-site-key" resetKey={0} onTokenChange={onTokenChange} />,
    );

    await waitFor(() => expect(renderWidget).toHaveBeenCalledOnce());
    act(() => successCallback?.('ephemeral-token'));
    expect(onTokenChange).toHaveBeenCalledWith('ephemeral-token');

    view.rerender(
      <TurnstileWidget siteKey="public-site-key" resetKey={1} onTokenChange={onTokenChange} />,
    );
    expect(resetWidget).toHaveBeenCalledWith('widget-1');
    expect(onTokenChange).toHaveBeenLastCalledWith(null);

    view.unmount();
    expect(removeWidget).toHaveBeenCalledWith('widget-1');
  });
});
