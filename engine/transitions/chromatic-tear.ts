import type { TransitionEffect } from './TransitionEffect';

/**
 * Chromatic-tear: RGB channels split horizontally and peel apart while the
 * underlying blend slides from 2D to 3D (or vice versa). `uProgress` is the
 * tear intensity (peaks mid-transition then resolves), driven by the
 * compositor's transition state.
 */
const chromaticTear: TransitionEffect = {
  name: 'chromatic-tear',
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex2D;
    uniform sampler2D uTex3D;
    uniform float uBlend2D;
    uniform float uBlend3D;
    uniform float uProgress;
    uniform float uTime;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      // Tear envelope: 0 at start/end, 1 at mid-transition
      float tear = sin(uProgress * 3.14159265);

      // Per-line jitter so the tear feels analog
      float line = hash(vec2(floor(vUv.y * 240.0), 0.0));
      float wobble = (line - 0.5) * 0.04 * tear;

      // Channel offsets (R right, B left, G centre)
      float rOff = (0.18 * tear) + wobble;
      float bOff = -(0.18 * tear) - wobble;

      vec2 uvR = vec2(vUv.x - rOff, vUv.y);
      vec2 uvG = vUv;
      vec2 uvB = vec2(vUv.x - bOff, vUv.y);

      vec4 a_R = texture2D(uTex2D, uvR);
      vec4 a_G = texture2D(uTex2D, uvG);
      vec4 a_B = texture2D(uTex2D, uvB);

      vec4 b_R = texture2D(uTex3D, uvR);
      vec4 b_G = texture2D(uTex3D, uvG);
      vec4 b_B = texture2D(uTex3D, uvB);

      // Blend each channel between the two layers using the configured weights
      float r = a_R.r * uBlend2D + b_R.r * uBlend3D;
      float g = a_G.g * uBlend2D + b_G.g * uBlend3D;
      float b = a_B.b * uBlend2D + b_B.b * uBlend3D;

      // Scanline + grain accent during tear
      float scan = 1.0 - 0.08 * tear * step(0.5, fract(vUv.y * 320.0));
      float grain = (hash(vUv + uTime) - 0.5) * 0.06 * tear;

      vec3 col = vec3(r, g, b) * scan + grain;
      float alpha = max(a_G.a * uBlend2D, b_G.a * uBlend3D);
      gl_FragColor = vec4(col, alpha);
    }
  `,
};

export default chromaticTear;
