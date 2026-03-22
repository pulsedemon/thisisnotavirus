precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_timeOfDay;
uniform float u_cloudiness;

varying vec2 vUv;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  return (noise2d(p) + noise2d(p * 2.0) * 0.5) / 1.5;
}

vec3 skyGradient(vec2 uv, float tod) {
  float band = floor(clamp(uv.y * 8.0, 0.0, 7.0));

  vec3 dawnCol, dayCol, sunCol, nitCol;

  if (band < 1.0) {
    dawnCol = vec3(0.15, 0.0, 0.2); dayCol = vec3(0.0, 0.0, 0.2); sunCol = vec3(0.1, 0.0, 0.15); nitCol = vec3(0.0, 0.0, 0.1);
  } else if (band < 2.0) {
    dawnCol = vec3(0.3, 0.0, 0.3); dayCol = vec3(0.0, 0.05, 0.3); sunCol = vec3(0.2, 0.0, 0.4); nitCol = vec3(0.02, 0.0, 0.12);
  } else if (band < 3.0) {
    dawnCol = vec3(1.0, 0.0, 0.3); dayCol = vec3(0.0, 0.1, 0.5); sunCol = vec3(0.5, 0.0, 0.5); nitCol = vec3(0.04, 0.0, 0.15);
  } else if (band < 4.0) {
    dawnCol = vec3(1.0, 0.2, 0.0); dayCol = vec3(0.0, 0.3, 1.0); sunCol = vec3(1.0, 0.0, 0.4); nitCol = vec3(0.03, 0.0, 0.08);
  } else if (band < 5.0) {
    dawnCol = vec3(1.0, 0.6, 0.0); dayCol = vec3(0.0, 0.6, 1.0); sunCol = vec3(1.0, 0.0, 0.1); nitCol = vec3(0.04, 0.0, 0.1);
  } else if (band < 6.0) {
    dawnCol = vec3(1.0, 1.0, 0.0); dayCol = vec3(0.0, 1.0, 1.0); sunCol = vec3(1.0, 0.3, 0.0); nitCol = vec3(0.03, 0.0, 0.08);
  } else if (band < 7.0) {
    dawnCol = vec3(0.0, 1.0, 0.7); dayCol = vec3(0.0, 1.0, 0.6); sunCol = vec3(1.0, 0.7, 0.0); nitCol = vec3(0.02, 0.0, 0.04);
  } else {
    dawnCol = vec3(0.0, 0.8, 1.0); dayCol = vec3(0.2, 1.0, 0.8); sunCol = vec3(1.0, 1.0, 0.0); nitCol = vec3(0.01, 0.0, 0.02);
  }

  float dawnW = smoothstep(0.1, 0.2, tod) * smoothstep(0.4, 0.3, tod);
  float dayW = smoothstep(0.25, 0.35, tod) * smoothstep(0.65, 0.55, tod);
  float sunW = smoothstep(0.55, 0.65, tod) * smoothstep(0.9, 0.8, tod);
  float nitW = clamp(1.0 - smoothstep(0.05, 0.15, tod) + smoothstep(0.85, 0.95, tod), 0.0, 1.0);
  float total = dawnW + dayW + sunW + nitW + 0.001;

  return (nitCol * nitW + dawnCol * dawnW + dayCol * dayW + sunCol * sunW) / total;
}

vec4 clouds(vec2 uv, float time, float cloudiness) {
  vec2 cloudUv = uv * vec2(6.0, 3.0) + vec2(time * 0.08, 0.0);

  float cloud = fbm2(cloudUv);

  float threshold = mix(0.65, 0.2, cloudiness);
  cloud = step(threshold, cloud);

  float heightMask = smoothstep(0.02, 0.08, uv.y) * smoothstep(0.98, 0.92, uv.y);
  cloud *= heightMask;

  // Neon-tinted clouds
  vec3 cloudColor = vec3(0.0, 0.7, 0.9);
  cloudColor = mix(cloudColor, vec3(0.05), smoothstep(0.5, 1.0, cloudiness));

  // Edge detect via offset sample comparison
  float cloudEdge = fbm2(cloudUv + 0.05);
  cloudEdge = step(threshold, cloudEdge);
  float edge = abs(cloud - cloudEdge);
  cloudColor = mix(cloudColor, vec3(1.0, 0.0, 0.5), edge * 0.9);

  return vec4(cloudColor, cloud * 0.85);
}

void main() {
  vec2 uv = vUv;

  // Pixelate
  float pixelRes = 128.0;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 grid = vec2(pixelRes * aspect, pixelRes);
  uv = floor(uv * grid) / grid;

  vec3 col = skyGradient(uv, u_timeOfDay);

  vec4 c = clouds(uv, u_time, u_cloudiness);
  col = mix(col, c.rgb, c.a);

  // 7 levels per channel (posterize)
  col = floor(col * 6.0 + 0.5) / 6.0;

  gl_FragColor = vec4(col, 1.0);
}
