import { describe, it, expect } from 'vitest';
import { createStyledIframe, styleIframe } from '../iframe';

describe('Iframe Utilities', () => {
  describe('createStyledIframe', () => {
    it('should create an iframe element', () => {
      const iframe = createStyledIframe();
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(iframe.tagName).toBe('IFRAME');
    });

    it('should apply default styles (non-secondary)', () => {
      const iframe = createStyledIframe();
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('100%');
      expect(iframe.style.borderStyle).toBe('none');
      expect(iframe.style.position).toBe('absolute');
      expect(iframe.style.top).toBe('0px');
      expect(iframe.style.left).toBe('0px');
      expect(iframe.style.background).toBe('rgb(0, 0, 0)');
      expect(iframe.style.pointerEvents).toBe('none');
      expect(iframe.style.zIndex).toBe('0');
    });

    it('should not set mix-blend-mode for non-secondary iframe', () => {
      const iframe = createStyledIframe();
      expect(iframe.style.mixBlendMode).toBe('');
      expect(iframe.className).toBe('');
    });

    it('should apply secondary styles when isSecondary is true', () => {
      const iframe = createStyledIframe(true);
      expect(iframe.style.mixBlendMode).toBe('screen');
      expect(iframe.className).toBe('secondary-virus');
      expect(iframe.style.zIndex).toBe('1');
    });
  });

  describe('styleIframe', () => {
    it('should apply styles to an existing iframe', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe);

      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('100%');
      expect(iframe.style.borderStyle).toBe('none');
      expect(iframe.style.position).toBe('absolute');
      expect(iframe.style.top).toBe('0px');
      expect(iframe.style.left).toBe('0px');
      expect(iframe.style.right).toBe('0px');
      expect(iframe.style.bottom).toBe('0px');
      expect(iframe.style.margin).toBe('0px');
      expect(iframe.style.padding).toBe('0px');
      expect(iframe.style.boxSizing).toBe('border-box');
      expect(iframe.style.pointerEvents).toBe('none');
    });

    it('should apply responsive styles', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe);

      expect(iframe.style.minWidth).toBe('100%');
      expect(iframe.style.minHeight).toBe('100%');
      expect(iframe.style.maxWidth).toBe('100%');
      expect(iframe.style.maxHeight).toBe('100%');
    });

    it('should set zIndex to 0 for non-secondary iframe', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe);

      expect(iframe.style.zIndex).toBe('0');
    });

    it('should apply secondary styles when isSecondary is true', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe, true);

      expect(iframe.style.mixBlendMode).toBe('screen');
      expect(iframe.className).toBe('secondary-virus');
      expect(iframe.style.zIndex).toBe('1');
    });

    it('should not set secondary class for non-secondary iframe', () => {
      const iframe = document.createElement('iframe');
      styleIframe(iframe, false);

      expect(iframe.className).not.toBe('secondary-virus');
    });
  });
});
