import type { TransitionEffect } from './TransitionEffect';

/** Plain linear cross-fade between layer textures driven by `uBlend3D`. */
const crossFade: TransitionEffect = {
  name: 'cross-fade',
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex2D;
    uniform sampler2D uTex3D;
    uniform float uBlend2D;
    uniform float uBlend3D;
    uniform float uProgress;
    uniform float uTime;

    void main() {
      vec4 c2 = texture2D(uTex2D, vUv);
      vec4 c3 = texture2D(uTex3D, vUv);
      vec3 col = c2.rgb * uBlend2D + c3.rgb * uBlend3D;
      float a = max(c2.a * uBlend2D, c3.a * uBlend3D);
      gl_FragColor = vec4(col, a);
    }
  `,
};

export default crossFade;
