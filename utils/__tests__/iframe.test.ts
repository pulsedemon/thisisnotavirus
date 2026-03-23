import { describe, it, expect } from 'vitest';
import { createStyledIframe, styleIframe } from '../iframe';

describe('Iframe Utilities', () => {
  describe('createStyledIframe', () => {
    it('should create an iframe element', () => {
      const iframe = createStyledIframe();
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(iframe.tagName).toBe('IFRAME');
    });

    it('should apply virus-iframe class (non-secondary)', () => {
      const iframe = createStyledIframe();
      expect(iframe.classList.contains('virus-iframe')).toBe(true);
    });

    it('should not set secondary classes for non-secondary iframe', () => {
      const iframe = createStyledIframe();
      expect(iframe.classList.contains('virus-iframe--secondary')).toBe(false);
      expect(iframe.classList.contains('secondary-virus')).toBe(false);
    });

    it('should apply secondary classes when isSecondary is true', () => {
      const iframe = createStyledIframe(true);
      expect(iframe.classList.contains('virus-iframe')).toBe(true);
      expect(iframe.classList.contains('virus-iframe--secondary')).toBe(true);
      expect(iframe.classList.contains('secondary-virus')).toBe(true);
    });
  });

  describe('styleIframe', () => {
    it('should apply virus-iframe class to an existing iframe', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe);

      expect(iframe.classList.contains('virus-iframe')).toBe(true);
    });

    it('should not set secondary classes for non-secondary iframe', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe, false);

      expect(iframe.classList.contains('virus-iframe--secondary')).toBe(false);
      expect(iframe.classList.contains('secondary-virus')).toBe(false);
    });

    it('should apply secondary classes when isSecondary is true', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe, true);

      expect(iframe.classList.contains('virus-iframe')).toBe(true);
      expect(iframe.classList.contains('virus-iframe--secondary')).toBe(true);
      expect(iframe.classList.contains('secondary-virus')).toBe(true);
    });
  });
});
