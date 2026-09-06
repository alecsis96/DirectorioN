import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BusinessLogo, { YAJAGON_LOGO_PLACEHOLDER } from '../components/BusinessLogo';

const image = () => document.querySelector('img') as HTMLImageElement;

describe('BusinessLogo', () => {
  it('uses the YajaGon placeholder when the logo is absent', () => {
    render(<BusinessLogo />);
    expect(image().getAttribute('src')).toBe(YAJAGON_LOGO_PLACEHOLDER);
  });

  it('uses the YajaGon placeholder when the logo is empty', () => {
    render(<BusinessLogo logoUrl="   " />);
    expect(image().getAttribute('src')).toBe(YAJAGON_LOGO_PLACEHOLDER);
  });

  it('falls back without visible alt text when a remote logo fails', () => {
    render(<BusinessLogo logoUrl="https://cdn.example.test/broken.png" />);
    fireEvent.error(image());
    expect(image().getAttribute('src')).toBe(YAJAGON_LOGO_PLACEHOLDER);
    expect(image()).toHaveAttribute('alt', '');
  });

  it('keeps a valid logo that loads successfully', () => {
    const logo = 'https://cdn.example.test/logo.png';
    render(<BusinessLogo logoUrl={logo} />);
    expect(image().getAttribute('src')).toBe(logo);
  });
});
