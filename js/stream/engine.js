/* The AntBox stream: a raw WebGL2 renderer (no library) for one network that runs
   the full length of the page. Particle positions live in a float texture; nodes and
   edges are each a single instanced draw. It renders inside the same tick as the
   smooth scroll, so the canvas and the page move as one, with no lag between them.

   It behaves like a nervous system, not a screensaver: a node fires, a signal travels
   along a slightly curved fibre at a fixed speed, and when it arrives the next node may
   fire in turn (each node then rests for a moment). Activity spreads in branching
   cascades and dies out, the way real neural activity does. It opens as a brain, which
   then comes apart into the people the rest of the page is about. */
import { buildLayout, KIND } from '/js/stream/layout.js?v=5957e24667';
import { createCluster, clusterSize } from '/js/stream/cluster.js?v=26ea551a55';
import { createBrain } from '/js/stream/brain.js?v=8c78377f55';

const TW = 256;       // texture width for per-particle data
const TRAIL = 48;     // the visitor leaves a short trail behind them
const ME_LINKS = 4;
const SEG = 8;        // segments per fibre (they curve)
const SPEED = 2.4;    // signal speed, world units per second
const REST = 0.9;     // refractory period, seconds

const COMMON = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uPos, uInfo, uFire;
uniform mat4 uProj;
uniform vec3 uCam;
uniform vec2 uRes;
uniform float uTime, uVel, uReveal, uPaused, uReserved, uStreamA, uBR0, uBR1, uGlow, uBS;
uniform vec3 uBC;
uniform vec3 uMouse; uniform float uMouseOn;
uniform vec4 uWave;
uniform vec3 uMe; uniform float uMeOn, uFocus;
vec4 P(int id) { return texelFetch(uPos, ivec2(id % ${TW}, id / ${TW}), 0); }
vec4 I(int id) { return texelFetch(uInfo, ivec2(id % ${TW}, id / ${TW}), 0); }
float F(int id) { return texelFetch(uFire, ivec2(id % ${TW}, id / ${TW}), 0).r; }
vec3 live(int id, vec4 p, vec4 info) {
  vec3 q = p.xyz;
  if (info.w < -0.5 && info.z < 4.5) {
    float s = float(id) * 0.6180339;
    q += 0.018 * vec3(sin(uTime * 0.5 + s * 12.0), cos(uTime * 0.43 + s * 7.0), sin(uTime * 0.37 + s * 3.0)) * (1.0 - uPaused);
    vec3 m = uMouse - q; float d = length(m.xy);
    q.xy += uMouseOn * normalize(m.xy + 1e-5) * 0.4 * exp(-d * d * 1.2);
  }
  return q;
}
float fogA(float depth) { return mix(1.0, 0.45, smoothstep(10.0, 20.0, depth)); }
float nearMe(vec3 q) { vec2 d = q.xy - uMe.xy; return uMeOn * exp(-dot(d, d) * 1.4); }
float flashOf(int id) { float age = uTime - F(id); return age >= 0.0 ? exp(-age * 3.5) : 0.0; }
float revealAt(vec3 q) { return uReveal >= 1.0 ? 1.0 : smoothstep(uReveal * 30.0, uReveal * 30.0 - 3.0, distance(q.xy, uCam.xy)); }
`;

const NODE_VS = COMMON + /* glsl */`
in vec2 aCorner; in float aId;
out vec2 vUv; out float vAlpha, vPurple, vR, vLit;
flat out float vKind, vPhoto, vBrain;
void main() {
  int id = int(aId);
  vec4 p = P(id), info = I(id);
  vec3 q = live(id, p, info);
  vec4 c = uProj * vec4(q - uCam, 1.0);
  float depth = uCam.z - q.z;
  float focus = float(id) == uFocus ? 1.0 : 0.0;
  float near = nearMe(q) * (info.z < 4.5 ? 1.0 : 0.0);
  float flash = flashOf(id);
  float brainNode = (float(id) >= uBR0 && float(id) < uBR1) ? 1.0 : 0.0;
  // during the opening every neuron is drawn as light: a small core in a wide soft halo
  float halo = brainNode * uGlow;
  float grow = info.z == 2.0 ? 0.0 : 1.0;
  float rpx = p.w * uProj[1][1] / c.w * uRes.y * 0.5 * (1.0 + grow * (focus * 0.25 + near * (info.z == 3.0 ? 0.5 : 0.12) + flash * (info.z == 1.0 ? 0.12 : 0.6)));
  rpx = p.w <= 0.0 ? 0.0 : max(rpx, info.z == 2.0 || info.z == 6.0 ? 0.0 : 1.1);
  // scrolling stretches the field along the flow, like a long exposure
  float stretch = min(max(abs(uVel) - 2.0, 0.0) * (0.35 + 0.35 * (1.0 - depth / 22.0)), 22.0) * step(info.z, 0.5);
  // light washing across the folds: slow bands that travel over the cortex, plus single neurons firing
  float band = 0.0;
  if (brainNode > 0.0) {
    vec3 rel = (q - uBC) / uBS;
    band = pow(max(0.0, sin(dot(rel, vec3(0.82, 0.3, 0.48)) * 4.2 - uTime * 1.5)), 12.0) * 0.9
         + pow(max(0.0, sin(dot(rel, vec3(-0.25, 0.9, 0.35)) * 3.1 + uTime * 1.1)), 16.0) * 0.6;
    flash = max(flash, band);
  }
  rpx *= 1.0 + halo * (1.4 + flash * 1.8);
  vec2 off = vec2(aCorner.x * rpx, aCorner.y * (rpx + stretch));
  c.xy += off / (uRes * 0.5) * c.w;
  gl_Position = c;
  vUv = aCorner; vR = rpx; vKind = info.z; vPhoto = info.w;
  float wave = 0.0;
  if (uWave.w > -50.0) { float age = uTime - uWave.w; float d = distance(q.xy, uWave.xy); wave = exp(-pow(d - age * 6.0, 2.0) * 0.9) * exp(-age * 1.1); }
  vLit = max(max(wave * 0.8, flash), max(focus, near * 0.8));
  vBrain = brainNode * uGlow;
  if (brainNode > 0.0) {
    // depth: the far side of the brain is dimmer, so it reads as a solid form
    float facing = smoothstep(-1.0, 1.0, (q.z - uBC.z) / uBS * 2.2);
    vAlpha *= mix(0.35, 1.0, facing);
    vLit = max(vLit, band);
  }
  vPurple = clamp(info.y + vLit, 0.0, 1.0);
  float streamA = float(id) >= uReserved ? uStreamA * 0.7 : 1.0;   // the stream is a translucent layer under the page
  vAlpha = info.x * fogA(depth) * revealAt(q) * streamA / (1.0 + stretch * 0.04);
}`;

const NODE_FS = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uInk, uPurple, uWhite;
uniform float uPhotoReveal;
in vec2 vUv; in float vAlpha, vPurple, vR, vLit;
flat in float vKind, vPhoto, vBrain;
uniform float uGlow, uLight;
uniform vec3 uInkL; uniform vec4 uDark[6]; uniform int uNDark; uniform float uBoot, uDarkR;
// which band this pixel sits in: on black bands the network is drawn in light ink
float darkAt() {
  if (uBoot > 0.5) return 1.0;
  // each black band is a rounded sheet: a rounded-rectangle distance, anti-aliased over a pixel
  vec2 p = gl_FragCoord.xy; float k = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uNDark) break;
    vec4 b = uDark[i]; vec2 c = (b.xy + b.zw) * 0.5, h = (b.zw - b.xy) * 0.5;
    vec2 q = abs(p - c) - h + uDarkR;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uDarkR;
    k = max(k, clamp(0.5 - d, 0.0, 1.0));
  }
  return k;
}
vec3 gInk; float gLight;

out vec4 o;
vec3 photo(float idx, vec2 p) {
  vec2 cell = vec2(mod(idx, 16.0), floor(idx / 16.0));
  vec3 c = texture(uAtlas, (cell + clamp(p * 0.5 + 0.5, 0.02, 0.98) * vec2(1.0, -1.0) + vec2(0.0, 1.0)) / vec2(16.0, 10.0)).rgb;
  // a little muted, so a crowd of strangers reads as one calm texture
  return mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.06);
}
vec4 neuron(float d, float aa) {
  // a soft bubble: a translucent lavender disc with a slightly brighter edge; it turns
  // white and glows while it fires, like the leading edge of a growing idea
  float disc = 1.0 - smoothstep(0.86 - aa, 0.86 + aa, d);
  float edge = smoothstep(0.55, 0.86, d) * disc;
  float glow = exp(-d * d * 3.2) * vLit;
  if (gLight > 0.5) {
    // on white: a soft orchid bead with a deeper rim, flaring bright pink when it fires
    vec3 c = mix(mix(uPurple, uWhite, 0.25), uPurple, clamp(edge * 0.8 + vLit, 0.0, 1.0));
    c = mix(c, gInk, (1.0 - vLit) * (1.0 - vPurple) * 0.35);
    return vec4(c, clamp(disc * (0.5 + edge * 0.25 + vLit * 0.4) + glow * 0.35, 0.0, 1.0));
  }
  vec3 col = mix(mix(uPurple, uWhite, 0.38), uWhite, clamp(vLit * 0.95 + edge * 0.15, 0.0, 1.0));
  col = mix(col, uPurple, vPurple * 0.35 * (1.0 - vLit));
  return vec4(col, clamp(disc * (0.42 + edge * 0.18 + vLit * 0.5) + glow * 0.45, 0.0, 1.0));
}
void main() {
  float dk = darkAt();
  gInk = mix(uInk, uInkL, dk); gLight = uLight * (1.0 - dk);
  float d = length(vUv);
  if (d > 1.0) discard;
  float aa = 1.5 / max(vR, 1.0);
  if (vBrain > 0.0) {
    // a neuron in the opening brain: hot white core, lavender bloom, brighter as it fires
    float k = 1.0 + vBrain * (1.4 + vLit * 1.8);   // the quad was grown by about this much
    float r = d * k;                            // distance in units of the particle's radius
    float core = exp(-r * r * 2.6);
    float bloom = exp(-r * r * 0.7) * (0.18 + vLit * 0.6);
    vec3 col = mix(mix(uPurple, uWhite, 0.32), uWhite, clamp(core * 0.6 + vLit * 0.85, 0.0, 1.0));
    if (gLight > 0.5) col = mix(mix(uPurple, gInk, 0.3), uPurple, clamp(bloom * 1.5 + vLit, 0.0, 1.0));   // ink-violet grain on white
    o = vec4(col, clamp(core * 0.95 + bloom, 0.0, 1.0) * vAlpha * min(1.0, vBrain * 1.5));
    return;
  }
  if (vKind == 1.0) {
    // a person: a small face in a white ring (a plain neuron until the faces arrive)
    vec3 img = photo(vPhoto, vUv);
    // the photo, a thin white edge, and a hairline outside it for definition on beige
    float inner = 1.0 - smoothstep(0.86 - aa, 0.86, d);
    float edgeW = smoothstep(0.86 - aa, 0.87, d) * (1.0 - smoothstep(0.96 - aa, 0.96, d));
    float hair = smoothstep(0.96 - aa, 0.965, d) * (1.0 - smoothstep(1.0 - aa, 1.0, d));
    vec3 col = mix(uWhite, img, inner);
    vec3 ringCol = mix(uWhite, uPurple, clamp(vLit + vPurple * 0.8, 0.0, 1.0));
    col = mix(col, ringCol, edgeW);
    col = mix(col, mix(gInk, uPurple, clamp(vLit + vPurple, 0.0, 1.0)), hair);
    vec4 face = vec4(col, max(max(inner, edgeW), hair * 0.16 + hair * clamp(vLit + vPurple, 0.0, 1.0) * 0.6));
    vec4 dot = neuron(d, aa);
    vec4 m = mix(dot, face, uPhotoReveal);
    o = vec4(m.rgb, m.a * vAlpha);
    return;
  }
  if (vKind == 5.0) {
    // you: a white core in a purple ring, breathing light around it
    float core = 1.0 - smoothstep(0.2 - aa, 0.2 + aa, d);
    float ring = 1.0 - smoothstep(0.0, aa * 2.0 + 0.03, abs(d - 0.32));
    float halo = exp(-d * d * 7.0) * (0.45 + vLit * 0.4);
    vec3 col = mix(uPurple, uWhite, core);
    o = vec4(col, clamp(core + ring + halo, 0.0, 1.0) * vAlpha);
    return;
  }
  if (vKind == 6.0) { o = vec4(uPurple, exp(-d * d * 5.0) * vAlpha); return; }
  if (vKind == 2.0) {
    // a capsule's ring, drawn like a fine pencil circle
    float band = 1.0 - smoothstep(0.0, aa * 1.1 + 0.004, abs(d - 0.95));
    o = vec4(mix(uPurple, gInk, 0.25), band * 0.42 * vAlpha);
    return;
  }
  vec4 n = neuron(d, aa);
  if (vKind == 3.0) n.a = clamp(n.a + (1.0 - smoothstep(0.02, 0.05, abs(d - 0.78))) * 0.9 + exp(-d * d * 4.0) * 0.4, 0.0, 1.0);
  o = vec4(n.rgb, n.a * vAlpha);
}`;

const EDGE_VS = COMMON + /* glsl */`
in vec2 aCorner; in vec2 aIds; in float aType, aSeed; in vec2 aSig;
out float vT, vSide, vAlpha, vPurple, vGlow;
flat out float vType, vS, vDir, vLen;
uniform float uClusterA, uForm;
void main() {
  int a = int(aIds.x), b = int(aIds.y);
  vec4 pa = P(a), pb = P(b), ia = I(a), ib = I(b);
  vec3 qa = live(a, pa, ia), qb = live(b, pb, ib);
  vec3 dv = qb - qa;
  float len = length(dv.xy) + 1e-4;
  // fibres are never ruler-straight: each bows a little, its own way
  vec2 nrm = vec2(-dv.y, dv.x) / len;
  vec3 ctrl = (qa + qb) * 0.5 + vec3(nrm * (aSeed - 0.5) * 0.36 * len, 0.0);
  float t = aCorner.x, t2 = min(t + 0.02, 1.0), t1 = t2 - 0.02;
  vec3 q = mix(mix(qa, ctrl, t), mix(ctrl, qb, t), t);
  vec3 r1 = mix(mix(qa, ctrl, t1), mix(ctrl, qb, t1), t1), r2 = mix(mix(qa, ctrl, t2), mix(ctrl, qb, t2), t2);
  vec4 c = uProj * vec4(q - uCam, 1.0), c1 = uProj * vec4(r1 - uCam, 1.0), c2 = uProj * vec4(r2 - uCam, 1.0);
  vec2 dir = normalize(c2.xy / c2.w * uRes - c1.xy / c1.w * uRes + 1e-5);
  vec2 n = vec2(-dir.y, dir.x);
  // a signal in flight: where its head is along this fibre (0..1)
  float s = aSig.x > -50.0 ? (uTime - aSig.x) * ${SPEED.toFixed(2)} / len : -1.0;
  float head = aSig.y > 0.0 ? s : 1.0 - s;
  float behind = (aSig.y > 0.0 ? head - t : t - head) * len;
  float glow = (s > 0.0 && s < 1.0 + 0.5 / len) ? (behind >= 0.0 ? exp(-behind * 7.0) : exp(behind * 40.0)) : 0.0;
  float base = aType == 3.0 ? 1.1 : aType == 4.0 ? 0.85 : aType == 2.0 ? 0.8 : 0.75;
  // thicker in the middle of its run, thinner at the ends, like a dendrite
  float w = base * (0.7 + 0.3 * sin(t * 3.14159)) + glow * 1.3;
  c.xy += n * aCorner.y * w / uRes * c.w * 2.0;
  gl_Position = c;
  float depth = uCam.z - q.z;
  // a fibre fades with the smaller of its two cells (the brain's fibres go as it comes apart)
  float visible = smoothstep(0.0, 0.028, min(pa.w, pb.w));
  float typeA = aType == 4.0 ? 0.4 + 0.25 * uGlow : aType == 1.0 ? 0.36 : aType == 2.0 ? 0.42 * uClusterA : aType == 3.0 ? 0.6 : aType == 4.0 ? 0.34 : 0.3;
  float streamA = (aType == 0.0 || aType == 1.0) ? uStreamA : 1.0;
  vAlpha = min(ia.x, ib.x) * fogA(depth) * revealAt(q) * visible * typeA * streamA;
  vT = t; vSide = aCorner.y; vType = aType; vGlow = glow;
  vS = s; vDir = aSig.y; vLen = len;
  vPurple = aType == 3.0 ? 1.0 : max(min(ia.y, ib.y), nearMe(q));
  // brain fibres glow, and only show once their two neurons are near each other (no streaks while it assembles)
  if (aType == 4.0) { vAlpha *= (1.0 + uGlow * 0.9) * smoothstep(0.9, 0.35, len); vPurple = max(vPurple, 0.75 * uGlow); }
  if (aType == 2.0 && max(ia.y, ib.y) > 0.8) { vAlpha *= 1.0 - uForm; }
}`;

const EDGE_FS = /* glsl */`#version 300 es
precision highp float;
uniform vec3 uInk, uPurple, uWhite;
uniform vec3 uInkL; uniform vec4 uDark[6]; uniform int uNDark; uniform float uBoot, uDarkR;
// which band this pixel sits in: on black bands the network is drawn in light ink
float darkAt() {
  if (uBoot > 0.5) return 1.0;
  // each black band is a rounded sheet: a rounded-rectangle distance, anti-aliased over a pixel
  vec2 p = gl_FragCoord.xy; float k = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uNDark) break;
    vec4 b = uDark[i]; vec2 c = (b.xy + b.zw) * 0.5, h = (b.zw - b.xy) * 0.5;
    vec2 q = abs(p - c) - h + uDarkR;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uDarkR;
    k = max(k, clamp(0.5 - d, 0.0, 1.0));
  }
  return k;
}
vec3 gInk; float gLight;

in float vT, vSide, vAlpha, vPurple, vGlow;
flat in float vType, vS, vDir, vLen;
out vec4 o;
void main() {
  float ends = smoothstep(0.0, 0.05, vT) * smoothstep(1.0, 0.95, vT);
  float edge = 1.0 - abs(vSide);
  // the signal, per pixel: a bright head with a fading wake behind it
  float sig = 0.0;
  if (vS > 0.0 && vS < 1.0 + 0.5 / vLen) {
    float head = vDir > 0.0 ? vS : 1.0 - vS;
    float behind = (vDir > 0.0 ? head - vT : vT - head) * vLen;
    sig = behind >= 0.0 ? exp(-behind * 7.0) : exp(behind * 40.0);
  }
  gInk = mix(uInk, uInkL, darkAt());
  vec3 col = mix(gInk, uPurple, clamp(vPurple * 0.7 + sig * 1.4, 0.0, 1.0));
  col = mix(col, uWhite, pow(sig, 6.0) * 0.7);
  o = vec4(col, clamp(vAlpha * ends * (edge + sig * 0.6) * (1.0 + sig * 4.0), 0.0, 1.0));
}`;

function compile(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u, a: n => gl.getAttribLocation(p, n) };
}

const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
const srgb = c => c.map(v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = t => t * t * (3 - 2 * t);

export function createStream({ canvas, slot, small, reduce, atlas, light = false, clip = null, bands = null }) {
  const bandsFn = bands, darkData = new Float32Array(24);
  let darkN = 0, darkR = 0, boot = false, meAllow = true, bootY = 0.5, formT = 0, formCycle = -1, infoData = null, infoDirty = false;
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  gl.getExtension('EXT_color_buffer_float');
  const node = compile(gl, NODE_VS, NODE_FS);
  const edge = compile(gl, EDGE_VS, EDGE_FS);
  // drawn on ink: the 'ink' of the network is the page's light colour
  // the network's 'ink' is the opposite of the page: dark lines on white, light lines on ink
  const INK = srgb(hex(light ? 0x1a1a1a : 0xf7f5ee)), INKL = srgb(hex(0xf7f5ee)), PURPLE = srgb(hex(0xbb62de)), WHITE = [1, 1, 1];

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  const quadIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIdx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  // a fibre: a strip of SEG segments that the vertex shader bends into a curve
  const strip = [], stripIdx = [];
  for (let k = 0; k <= SEG; k++) strip.push(k / SEG, -1, k / SEG, 1);
  for (let k = 0; k < SEG; k++) { const v = k * 2; stripIdx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
  const edgeCorners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeCorners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(strip), gl.STATIC_DRAW);
  const stripBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stripBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(stripIdx), gl.STATIC_DRAW);

  const tex = (w, h, fmt = gl.RGBA32F) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h); return t; };
  let posTex = null, infoTex = null, fireTex = null, posData = null, rows = 0, N = 0, E = 0;
  let nodeVao = null, edgeVao = null;
  let atlasTex = null;
  if (atlas) {
    atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  let W = 1, H = 1, dpr = 1, ppu = 100, layout = null, cluster = null;
  let ME = 0, BR0 = 0, nB = 0, eBuf = null, sigBuf = null, meLinkData = null;
  let brain = null, brainWorld = null, brainMeta = null, brainFrom = null, brainTo = null, clusterFrom = null, clusterDelay = null, center = { x: 0, y: 0 }, S = 1;
  const me = { x: 0, y: -4, z: 0.6, on: 0, tx: 0, ty: -4 };
  const trail = [];
  let attractEl = null, flowTarget = 1, boost = 0, focusId = -1;
  // the opening: brainIn draws the brain, morph turns it into people (1 = done)
  const intro = { brainIn: 1, morph: 1 };
  let introSettled = false;
  const proj = new Float32Array(16);
  const D = 12, fov = 2 * Math.atan(4 / D);

  // firing state
  let fireT = null, sig = null, A = null, B = null, adjStart = null, adjList = null, isBrainEdge = null;
  let signals = [], sigLo = Infinity, sigHi = -1, fireDirty = false, sponCarry = 0, meClock = 0;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // sharp on retina screens; steps down by itself if this device can't keep up
  // judged against the screen's own refresh (60 or 120Hz): when more than a quarter of frames
  // miss it over a second and a half, the canvas drops a quarter step of resolution (never below 1.25x)
  let dprCap = 1.5, period = 1 / 60, winT = 0, frames = 0, misses = 0;
  const adapt = dt => {
    period = Math.min(period * 1.01, dt);
    frames++; winT += dt;
    if (dt > period * 1.6) misses++;
    if (winT < 1.5) return;
    if (misses / frames > 0.25 && dprCap > 1) {
      dprCap = Math.max(1, dprCap - 0.25);
      dpr = Math.min(devicePixelRatio || 1, dprCap); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    winT = 0; frames = 0; misses = 0;
  };
  function build() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, dprCap);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const f = 1 / Math.tan(fov / 2), near = 0.5, far = 60;
    proj.fill(0); proj[0] = f / (W / H); proj[5] = f; proj[10] = (far + near) / (near - far); proj[11] = -1; proj[14] = 2 * far * near / (near - far);

    const { faces, dots } = clusterSize(small);
    const nCluster = faces + dots;
    brain = createBrain({ small });
    nB = brain.pts.length;
    layout = buildLayout({ W, H, small, reserved: nCluster + 1 + TRAIL + nB });
    ME = nCluster; BR0 = ME + 1 + TRAIL;
    ppu = layout.ppu;
    const r = slot.getBoundingClientRect();
    center = { x: (r.left + r.width / 2 - W / 2) / ppu, y: -(r.top + scrollY + r.height / 2) / ppu };
    const R = Math.min(r.width, r.height) / ppu * 0.44;
    cluster = createCluster({ small, center, radius: R });
    S = R * 1.08;

    // the brain in world space (before its slow sway), and when each neuron appears and leaves
    brainWorld = new Float32Array(nB * 3);
    brainMeta = new Float32Array(nB * 3);
    brainFrom = new Float32Array(nB * 3);
    brain.pts.forEach((p, j) => {
      brainWorld.set([p.x * S, p.y * S, p.z * S], j * 3);
      // it grows outward from the brainstem, like a scan sweeping up through the form
      const dist = Math.hypot(p.x - 0.25, p.y + 0.6, p.z * 0.6);
      brainMeta.set([dist * 0.42 + rnd() * 0.12, rnd() * 0.35, p.size], j * 3);
      // where it starts: just inside its final place, so the surface blooms into being
      const k = 0.55 + rnd() * 0.25;
      brainFrom.set([p.x * S * k, p.y * S * k, p.z * S * k], j * 3);
    });
    // every person starts life as a neuron somewhere in the brain
    clusterFrom = new Int32Array(cluster.n);
    clusterDelay = new Float32Array(cluster.n);
    for (let i = 0; i < cluster.n; i++) { clusterFrom[i] = Math.floor((i + 0.5) * nB / cluster.n) % nB; clusterDelay[i] = rnd() * 0.3; }
    // when it comes apart, every particle streams into the nearest person
    brainTo = new Int32Array(nB);
    for (let j = 0; j < nB; j++) {
      const bx = center.x + brainWorld[j * 3], by = center.y + brainWorld[j * 3 + 1];
      let best = 0, bd = Infinity;
      for (let i = 0; i < cluster.faces; i++) { const d = Math.hypot(cluster.rest[i * 3] - bx, cluster.rest[i * 3 + 1] - by); if (d < bd) { bd = d; best = i; } }
      brainTo[j] = best;
    }

    N = layout.P.length;
    rows = Math.ceil(N / TW);
    posData = new Float32Array(TW * rows * 4);
    const info = infoData = new Float32Array(TW * rows * 4);
    layout.P.forEach((p, i) => {
      if (p.x === undefined) return;
      posData.set([p.x, p.y, p.z, p.size], i * 4);
      info.set([p.alpha, p.purple, p.kind, p.photo], i * 4);
    });
    for (let i = 0; i < cluster.n; i++) {
      const isPhoto = cluster.photo[i] >= 0;
      posData.set([cluster.pos[i * 3], cluster.pos[i * 3 + 1], cluster.pos[i * 3 + 2], cluster.size[i]], i * 4);
      info.set([1, isPhoto ? 0 : 0.35, isPhoto ? KIND.face : KIND.dot, isPhoto ? cluster.photo[i] : -1], i * 4);
    }
    posData.set([me.x, me.y, me.z, 0.11], ME * 4);
    info.set([1, 1, KIND.me, -1], ME * 4);
    for (let k = 1; k <= TRAIL; k++) info.set([0.55, 1, KIND.trail, -1], (ME + k) * 4);
    brain.pts.forEach((p, j) => info.set([0.45 + 0.55 * p.b, p.region ? 0.7 : 0.18, KIND.dot, -1], (BR0 + j) * 4));   // ridges brighter than grooves
    trail.length = 0;
    placeIntro();

    if (posTex) { gl.deleteTexture(posTex); gl.deleteTexture(infoTex); gl.deleteTexture(fireTex); }
    posTex = tex(TW, rows); infoTex = tex(TW, rows); fireTex = tex(TW, rows, gl.R32F);
    gl.bindTexture(gl.TEXTURE_2D, posTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RGBA, gl.FLOAT, posData);
    gl.bindTexture(gl.TEXTURE_2D, infoTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RGBA, gl.FLOAT, info);
    fireT = new Float32Array(TW * rows).fill(-99);
    fireDirty = true;

    // edges: the stream, the cluster's springs (its lowest members feed the stream), the brain
    const all = layout.E.slice();
    cluster.springs.forEach(([a, b]) => all.push([a, b, 2]));
    const low = [...Array(cluster.n).keys()].sort((a, b) => cluster.rest[a * 3 + 1] - cluster.rest[b * 3 + 1]).slice(0, 6);
    const top = [...Array(N - layout.reserved).keys()].map(k => k + layout.reserved).filter(i => layout.P[i].kind === KIND.dot)
      .sort((a, b) => layout.P[b].y - layout.P[a].y).slice(0, 18);
    low.forEach((i, k) => { const j = top[k * 3 % top.length]; if (j !== undefined) all.push([i, j, 2]); });
    brain.links.forEach(([a, b]) => all.push([BR0 + a, BR0 + b, 4]));
    const nStatic = all.length;
    for (let k = 0; k < ME_LINKS; k++) all.push([ME, ME, 3]);   // your links, rewritten every frame
    E = all.length;

    // who connects to whom, for the cascade
    A = new Int32Array(E); B = new Int32Array(E); isBrainEdge = new Uint8Array(E);
    const deg = new Int32Array(N + 1);
    all.forEach(([a, b, t], e) => { A[e] = a; B[e] = b; isBrainEdge[e] = t === 4 ? 1 : 0; if (e < nStatic) { deg[a]++; deg[b]++; } });
    adjStart = new Int32Array(N + 1);
    for (let i = 0; i < N; i++) adjStart[i + 1] = adjStart[i] + deg[i];
    adjList = new Int32Array(adjStart[N]);
    const fill = adjStart.slice(0, N);
    for (let e = 0; e < nStatic; e++) { adjList[fill[A[e]]++] = e; adjList[fill[B[e]]++] = e; }
    sig = new Float32Array(E * 2);
    for (let e = 0; e < E; e++) { sig[e * 2] = -99; sig[e * 2 + 1] = 1; }
    signals = []; sigLo = Infinity; sigHi = -1;

    // vertex arrays
    if (nodeVao) { gl.deleteVertexArray(nodeVao); gl.deleteVertexArray(edgeVao); }
    nodeVao = gl.createVertexArray(); gl.bindVertexArray(nodeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, corners); gl.enableVertexAttribArray(node.a('aCorner')); gl.vertexAttribPointer(node.a('aCorner'), 2, gl.FLOAT, false, 0, 0);
    const ids = new Float32Array(N);
    // draw order: rings, the stream, the brain, faces, the cluster, then you on top
    const rank = i => i === ME ? 6 : i < cluster.n ? 5 : i >= BR0 && i < BR0 + nB ? 2 : i < layout.reserved ? 1 : layout.P[i].kind === KIND.ring ? 0 : layout.P[i].kind === KIND.face ? 4 : 1;
    const ordered = [...Array(N).keys()].sort((a, b) => rank(a) - rank(b));
    ordered.forEach((v, i) => { ids[i] = v; });
    const idBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, idBuf); gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(node.a('aId')); gl.vertexAttribPointer(node.a('aId'), 1, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(node.a('aId'), 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIdx);

    edgeVao = gl.createVertexArray(); gl.bindVertexArray(edgeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeCorners); gl.enableVertexAttribArray(edge.a('aCorner')); gl.vertexAttribPointer(edge.a('aCorner'), 2, gl.FLOAT, false, 0, 0);
    const ed = new Float32Array(E * 4);
    all.forEach(([a, b, t], i) => ed.set([a, b, t, rnd()], i * 4));
    if (eBuf) { gl.deleteBuffer(eBuf); gl.deleteBuffer(sigBuf); }
    eBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, eBuf); gl.bufferData(gl.ARRAY_BUFFER, ed, gl.DYNAMIC_DRAW);
    meLinkData = new Float32Array(ME_LINKS * 4);
    for (let k = 0; k < ME_LINKS; k++) meLinkData.set([ME, ME, 3, 0.2 + k * 0.2], k * 4);
    gl.enableVertexAttribArray(edge.a('aIds')); gl.vertexAttribPointer(edge.a('aIds'), 2, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(edge.a('aIds'), 1);
    gl.enableVertexAttribArray(edge.a('aType')); gl.vertexAttribPointer(edge.a('aType'), 1, gl.FLOAT, false, 16, 8); gl.vertexAttribDivisor(edge.a('aType'), 1);
    gl.enableVertexAttribArray(edge.a('aSeed')); gl.vertexAttribPointer(edge.a('aSeed'), 1, gl.FLOAT, false, 16, 12); gl.vertexAttribDivisor(edge.a('aSeed'), 1);
    sigBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sigBuf); gl.bufferData(gl.ARRAY_BUFFER, sig, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(edge.a('aSig')); gl.vertexAttribPointer(edge.a('aSig'), 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(edge.a('aSig'), 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stripBuf);
    gl.bindVertexArray(null);
  }

  /* the opening: the brain sways slowly while it draws itself, then comes apart; each
     person rises out of the neuron they started as and settles into the cluster */
  let bootFrom = null;
  function placeIntro() {
    const { brainIn, morph } = intro;
    // while the black screen is up the brain sits dead centre of the screen (measured each
    // frame, once the camera knows where the page is)
    if (boot) bootFrom = toWorld(W / 2, H * bootY);
    // a slow turn in 3D (yaw and a little pitch), so the brain has depth
    const yaw = (-0.5 + Math.sin(time * 0.22) * 0.42) * (1 - morph), pitch = (0.12 + Math.sin(time * 0.17 + 1) * 0.08) * (1 - morph);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const at = j => {
      let x = brainWorld[j * 3], y = brainWorld[j * 3 + 1], z = brainWorld[j * 3 + 2];
      const g = ease(clamp01((brainIn - brainMeta[j * 3]) / 0.3));
      x = brainFrom[j * 3] + (x - brainFrom[j * 3]) * g; y = brainFrom[j * 3 + 1] + (y - brainFrom[j * 3 + 1]) * g; z = brainFrom[j * 3 + 2] + (z - brainFrom[j * 3 + 2]) * g;
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const c = bootFrom ? { x: bootFrom.x + (center.x - bootFrom.x) * ease(clamp01(morph * 1.4)), y: bootFrom.y + (center.y - bootFrom.y) * ease(clamp01(morph * 1.4)) } : center;
      return [c.x + x1, c.y + y * cp - z1 * sp, y * sp + z1 * cp];
    };
    if (morph < 1 || brainIn < 1) {
      for (let j = 0; j < nB; j++) {
        const [x, y, z] = at(j);
        const show = clamp01((brainIn - brainMeta[j * 3]) / 0.08);
        const leave = ease(clamp01((morph - brainMeta[j * 3 + 1]) / 0.6));
        // coming apart: every particle streams into its person, and fades as it arrives
        const t = brainTo[j] * 4;
        const tx = posData[t], ty = posData[t + 1], tz = posData[t + 2];
        const curve = Math.sin(leave * Math.PI) * 0.25;   // a slight arc, so the streams swirl
        posData.set([x + (tx - x) * leave - (ty - y) * curve, y + (ty - y) * leave + (tx - x) * curve, z + (tz - z) * leave, brainMeta[j * 3 + 2] * show * (1 - leave * leave)], (BR0 + j) * 4);
      }
      for (let i = 0; i < cluster.n; i++) {
        const [bx, by, bz] = at(clusterFrom[i]);
        const m = ease(clamp01((morph - clusterDelay[i]) / 0.6));
        const show = ease(clamp01((brainIn - brainMeta[clusterFrom[i] * 3]) / 0.25));
        const o = i * 3;
        const x = bx + (cluster.rest[o] - bx) * m, y = by + (cluster.rest[o + 1] - by) * m, z = bz + (cluster.rest[o + 2] - bz) * m;
        cluster.pin(i, x, y, z);
        // people appear as the particles arrive in them
        posData[i * 4 + 3] = cluster.size[i] * ease(clamp01((morph - clusterDelay[i] - 0.15) / 0.5)) * (show > 0 ? 1 : 0);
      }
      introSettled = false;
    } else if (!introSettled) {
      // the opening is over (or was skipped): the brain goes, everyone stands where they belong
      for (let j = 0; j < nB; j++) posData[(BR0 + j) * 4 + 3] = 0;
      for (let i = 0; i < cluster.n; i++) { const o = i * 3; cluster.pin(i, cluster.rest[o], cluster.rest[o + 1], cluster.rest[o + 2]); posData[i * 4 + 3] = cluster.size[i]; }
      introSettled = true;
    }
  }

  /* firing */
  const edgeLen = e => { const a = A[e] * 4, b = B[e] * 4; return Math.hypot(posData[b] - posData[a], posData[b + 1] - posData[a + 1]) + 1e-4; };
  const markSig = e => { if (e < sigLo) sigLo = e; if (e > sigHi) sigHi = e; };
  function send(e, from, delay) {
    const to = A[e] === from ? B[e] : A[e];
    sig[e * 2] = time + delay; sig[e * 2 + 1] = A[e] === from ? 1 : -1; markSig(e);
    signals.push({ e, to, at: time + delay + edgeLen(e) / SPEED });
  }
  function fireNode(i, fromEdge = -1) {
    if (time - fireT[i] < REST || posData[i * 4 + 3] <= 0) return;
    fireT[i] = time; fireDirty = true;
    if (signals.length > 700) return;
    const yi = posData[i * 4 + 1];
    for (let k = adjStart[i]; k < adjStart[i + 1]; k++) {
      const e = adjList[k];
      if (e === fromEdge || time - sig[e * 2] < 1.4) continue;
      const other = A[e] === i ? B[e] : A[e];
      if (posData[other * 4 + 3] <= 0) continue;
      let p = isBrainEdge[e] ? 0.46 : 0.34;
      // the switch leans the cascade: down the page toward companies, or back up toward students
      if (!isBrainEdge[e] && i >= layout.reserved) p *= (posData[other * 4 + 1] - yi) * flowTarget < 0 ? 1.3 : 0.6;
      if (rnd() < p) send(e, i, 0.015 + rnd() * 0.06);
    }
  }
  function stimulate(x, y, radius, count) {
    // fire the neurons closest to a point (a click, a button, your own node)
    const hits = [];
    const consider = i => { const d = Math.hypot(posData[i * 4] - x, posData[i * 4 + 1] - y); if (d < radius && posData[i * 4 + 3] > 0) hits.push([d, i]); };
    for (let i = 0; i < layout.reserved; i++) if (i < cluster.n || i >= BR0) consider(i);
    const byY = layout.byY, P = layout.P;
    let lo = 0, hi = byY.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (P[byY[mid]].y < y - radius) lo = mid + 1; else hi = mid; }
    for (let j = lo; j < byY.length && P[byY[j]].y < y + radius; j++) consider(byY[j]);
    hits.sort((a, b) => a[0] - b[0]).slice(0, count).forEach(([d, i]) => { fireT[i] = time - 1; fireNode(i); });
  }
  function simulate(dt) {
    // arrivals
    if (signals.length) {
      const keep = [];
      for (const s of signals) {
        if (s.at > time) { keep.push(s); continue; }
        if (rnd() < 0.85) fireNode(s.to, s.e);
      }
      signals = keep;
    }
    // spontaneous activity, mostly where you can see it
    const brainOn = intro.morph < 1;
    const rate = (brainOn ? 70 : 3.2) * (1 + boost * 5) * (small ? 0.7 : 1);
    sponCarry += rate * dt;
    while (sponCarry >= 1) {
      sponCarry -= 1;
      if (brainOn && rnd() < 0.85) { fireNode(BR0 + Math.floor(rnd() * nB)); continue; }
      const top = cam[1] + 4.5, bottom = cam[1] - 4.5;
      if (center.y < top + 3 && center.y > bottom - 3 && rnd() < 0.4) { fireNode(Math.floor(rnd() * cluster.n)); continue; }
      const byY = layout.byY, P = layout.P;
      let lo = 0, hi = byY.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (P[byY[mid]].y < bottom) lo = mid + 1; else hi = mid; }
      let end = lo;
      while (end < byY.length && P[byY[end]].y < top) end++;
      if (end > lo) fireNode(byY[lo + Math.floor(rnd() * (end - lo))]);
    }
    // you take part too: every so often your node fires into its links
    meClock += dt;
    if (me.on > 0.5 && meClock > 1.8) {
      meClock = 0; fireT[ME] = time; fireDirty = true;
      for (let k = 0; k < ME_LINKS; k++) { const e = E - ME_LINKS + k; if (B[e] !== ME) send(e, ME, k * 0.05); }
    }
  }

  /* pointer: grab and fling the cluster, click anywhere to stimulate the network */
  const pointer = { x: 0, y: 0, sx: -1, sy: -1, on: false };
  const toWorld = (sx, sy) => ({ x: (sx - W / 2) / ppu + cam[0], y: -(sy - H / 2) / ppu + cam[1] });
  let mouseOn = 0, wave = [0, -999, 0, -99];
  addEventListener('pointermove', e => {
    pointer.sx = e.clientX; pointer.sy = e.clientY; pointer.on = true;
    const w = toWorld(e.clientX, e.clientY); pointer.x = w.x; pointer.y = w.y;
    if (cluster.grabbed >= 0) { cluster.drag(w.x, w.y); e.preventDefault(); }
    // the network answers the pointer: whatever you pass over fires, and its signal spreads
    const now = performance.now();
    if (intro.morph >= 1 && now - lastSpark > 110 && Math.hypot(e.movementX || 0, e.movementY || 0) > 2) { lastSpark = now; stimulate(w.x, w.y, 0.45, 2); }
  }, { passive: false });
  let lastSpark = 0;
  document.addEventListener('pointerleave', () => { pointer.on = false; });
  addEventListener('pointerdown', e => {
    if (e.target.closest('a, button, input, summary, [data-switch], .chip')) return;
    const w = toWorld(e.clientX, e.clientY);
    const i = intro.morph >= 1 ? cluster.pick(w.x, w.y, e.pointerType === 'touch' ? 0.25 : 0.06) : -1;
    if (i >= 0 && e.pointerType === 'touch') {
      const a = Math.random() * 6.2832;
      cluster.grab(i, w.x + Math.cos(a) * 0.5, w.y + Math.sin(a) * 0.5);
      setTimeout(() => cluster.release(), 140);
      stimulate(w.x, w.y, 0.6, 3);
    } else if (i >= 0) { cluster.grab(i, w.x, w.y); document.documentElement.classList.add('is-grabbing'); e.preventDefault(); stimulate(w.x, w.y, 0.4, 2); }
    else { wave = [w.x, w.y, 0, time]; stimulate(w.x, w.y, 1.1, 8); }
  });
  const end = () => { if (cluster.grabbed >= 0) { cluster.release(); document.documentElement.classList.remove('is-grabbing'); } };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  let time = 0, paused = false, reveal = 1, photoReveal = 1, vel = 0, streamA = 1;
  const cam = [0, 0, D];

  /* you are a node: you follow the pointer (or ride the page on touch), the network's
     landmarks pull you in, and you link to whoever is nearest */
  const elWorld = el => { const r = el.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
  function moveMe(dt) {
    const k = 1 - Math.exp(-dt * (reduce ? 30 : 7));
    let tx, ty;
    if (pointer.on && pointer.sx >= 0) { const w = toWorld(pointer.sx, pointer.sy); tx = w.x; ty = w.y; }
    else { const w = toWorld(W * (small ? 0.84 : 0.8), H * (small ? 0.72 : 0.6)); tx = w.x; ty = w.y; }
    const pull = (x, y, reach, strength) => {
      const d = Math.hypot(tx - x, ty - y);
      if (d < reach) { const f = strength * (1 - d / reach); tx += (x - tx) * f; ty += (y - ty) * f; }
    };
    const m = layout.magnets;
    if (attractEl) { const w = elWorld(attractEl); pull(w.x, w.y, 99, 0.55); }
    else {
      m.capsules.forEach(c => {
        const d = Math.hypot(tx - c.x, ty - c.y);
        if (d < c.r + 0.9 && d > 1e-3) {
          // you settle on the rim of a capsule, as if you'd joined it
          const f = Math.min(1, (c.r + 0.9 - d) / 0.6);
          tx += (c.x + (tx - c.x) / d * (c.r + 0.24) - tx) * f;
          ty += (c.y + (ty - c.y) / d * (c.r + 0.24) - ty) * f;
        }
      });
      if (m.thread && ty < m.thread.top && ty > m.thread.bottom && Math.abs(tx - m.thread.x) < 1.4) tx += (m.thread.x - tx) * 0.7 * (1 - Math.abs(tx - m.thread.x) / 1.4);
      m.beacons.forEach(b => pull(b.x, b.y, 1.0, 0.6));
      m.doors.forEach(d => pull(d.x, d.y, 1.3, 0.5));
    }
    me.tx = tx; me.ty = ty;
    me.x += (tx - me.x) * k; me.y += (ty - me.y) * k;
    me.on += ((reveal >= 1 && intro.morph >= 1 && meAllow ? 1 : 0) - me.on) * 0.06;
    const breath = reduce ? 0 : Math.sin(time * 2.2) * 0.012;
    posData.set([me.x, me.y, me.z, ((small ? 0.1 : 0.12) + breath) * clamp01(me.on * 3)], ME * 4);
    const last = trail[0];
    if (!reduce && (!last || Math.hypot(last[0] - me.x, last[1] - me.y) > 0.035)) { trail.unshift([me.x, me.y]); if (trail.length > TRAIL) trail.pop(); }
    else if (trail.length) trail.pop();      // standing still, the wake closes behind you
    for (let t = 0; t < TRAIL; t++) {
      const p = trail[t], o = (ME + 1 + t) * 4;
      if (!p || me.on < 0.5) { posData[o + 3] = 0; continue; }
      posData[o] = p[0]; posData[o + 1] = p[1]; posData[o + 2] = me.z - 0.05;
      posData[o + 3] = 0.07 * Math.pow(1 - t / TRAIL, 1.6);
    }
  }
  function linkMe() {
    const byY = layout.byY, P = layout.P;
    let lo = 0, hi = byY.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (P[byY[mid]].y < me.y - 1.6) lo = mid + 1; else hi = mid; }
    const best = [];
    for (let j = lo; j < byY.length; j++) {
      const p = P[byY[j]];
      if (p.y > me.y + 1.6) break;
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      if (d < 1.6) best.push([d, byY[j]]);
    }
    best.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < ME_LINKS; k++) { const t = best[k] ? best[k][1] : ME; meLinkData[k * 4 + 1] = t; B[E - ME_LINKS + k] = t; }
    gl.bindBuffer(gl.ARRAY_BUFFER, eBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, (E - ME_LINKS) * 16, meLinkData);
  }

  function frame(dt, scrollVel = 0, steady = true) {
    if (steady && !document.hidden && dt > 0 && dt < 0.2) adapt(dt);
    const live = !paused && !reduce;
    if (live) time += dt;
    const sy = scrollY;
    vel += ((reduce ? 0 : scrollVel) - vel) * 0.25;
    cam[0] += (((pointer.on ? (pointer.sx / W - 0.5) * 0.25 : 0)) - cam[0]) * 0.05;
    cam[1] = -(sy + H / 2) / ppu;

    // the formation cycle: ~2.8s as a network, then about half the people draw a shape for a beat
    if (intro.morph >= 1 && !reduce && !paused && cluster.grabbed < 0) {
      formT += dt;
      const C = 1.6, IN = 0.9, HOLD = 2.2, OUT = 0.8,   // slow and calm: drift in, hold, drift back
        P = C + IN + HOLD + OUT, cyc = Math.floor(formT / P), t = formT % P;
      if (cyc !== formCycle && t >= C) {
        formCycle = cyc; cluster.nextShape();
        // the people drawing the shape wear a purple ring; their links to the network let go
        for (let i = 0; i < cluster.n; i++) infoData[i * 4 + 1] = cluster.former[i] ? 0.9 : (cluster.photo[i] >= 0 ? 0 : 0.35);
        infoDirty = true;
      }
      const e = x => x * x * (3 - 2 * x);
      cluster.formK = t < C ? 0 : t < C + IN ? e((t - C) / IN) : t < C + IN + HOLD ? 1 : e(1 - (t - C - IN - HOLD) / OUT);
    } else if (cluster.grabbed >= 0) { cluster.formK = Math.max(0, cluster.formK - dt * 2); }
    // the people only live in the hero: once it is well off screen their physics rests
    const away = intro.morph >= 1 && Math.abs(center.y - cam[1]) > (H / ppu) * 1.15;
    if (!away) cluster.update(reduce ? 1 / 60 : dt, time, paused || reduce, pointer.on && intro.morph >= 1 ? pointer : null);
    placeIntro();
    if (!away) for (let i = 0; i < cluster.n; i++) {
      posData[i * 4] = cluster.pos[i * 3]; posData[i * 4 + 1] = cluster.pos[i * 3 + 1]; posData[i * 4 + 2] = cluster.pos[i * 3 + 2];
    }
    moveMe(dt);
    const rowsLive = Math.ceil(layout.reserved / TW);
    gl.bindTexture(gl.TEXTURE_2D, posTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rowsLive, gl.RGBA, gl.FLOAT, posData.subarray(0, TW * rowsLive * 4));
    linkMe();

    boost *= Math.exp(-dt * 0.9);
    if (live) simulate(dt);
    if (infoDirty && infoTex) { gl.bindTexture(gl.TEXTURE_2D, infoTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, Math.ceil(cluster.n / TW) || 1, gl.RGBA, gl.FLOAT, infoData.subarray(0, TW * (Math.ceil(cluster.n / TW) || 1) * 4)); infoDirty = false; }
    if (fireDirty) { gl.bindTexture(gl.TEXTURE_2D, fireTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RED, gl.FLOAT, fireT); fireDirty = false; }
    if (sigHi >= sigLo) {
      gl.bindBuffer(gl.ARRAY_BUFFER, sigBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, sigLo * 8, sig.subarray(sigLo * 2, sigHi * 2 + 2));
      sigLo = Infinity; sigHi = -1;
    }

    // whoever you hover in the cluster leans forward
    let h = -1;
    if (intro.morph >= 1 && pointer.on && cluster.grabbed < 0) { const i = cluster.pick(pointer.x, pointer.y, 0.03); if (i >= 0 && cluster.photo[i] >= 0) h = i; }
    if (cluster.grabbed >= 0) h = cluster.grabbed;
    focusId = h;
    mouseOn += ((pointer.on && cluster.grabbed < 0 && intro.morph >= 1 ? 1 : 0) - mouseOn) * 0.08;
    streamA = ease(clamp01((intro.morph - 0.55) / 0.45));

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    // the opening glows: light adds up where neurons and fibres cross (additive blending)
    const glow = clamp01(1.25 - intro.morph * 1.35) * (intro.brainIn > 0 ? 1 : 0);
    const additive = glow > 0.01 && (!light || boot);
    if (additive) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const set = (prog, isNode) => {
      gl.useProgram(prog.p);
      const u = prog.u;
      gl.uniformMatrix4fv(u.uProj, false, proj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform2f(u.uRes, W, H);
      if (u.uTime) gl.uniform1f(u.uTime, time);
      if (u.uVel) gl.uniform1f(u.uVel, vel);
      if (u.uReveal) gl.uniform1f(u.uReveal, reveal);
      if (u.uPaused) gl.uniform1f(u.uPaused, paused || reduce ? 1 : 0);
      if (u.uReserved) gl.uniform1f(u.uReserved, layout.reserved);
      if (u.uBR0) gl.uniform1f(u.uBR0, BR0);
      if (u.uBR1) gl.uniform1f(u.uBR1, BR0 + nB);
      if (u.uGlow) gl.uniform1f(u.uGlow, glow);
      if (u.uLight) gl.uniform1f(u.uLight, light ? 1 : 0);
      if (u.uBC) gl.uniform3f(u.uBC, center.x, center.y, 0);
      if (u.uBS) gl.uniform1f(u.uBS, S);
      if (u.uStreamA) gl.uniform1f(u.uStreamA, streamA);
      if (u.uClusterA) gl.uniform1f(u.uClusterA, ease(clamp01((intro.morph - 0.5) / 0.5)));
      if (u.uForm) gl.uniform1f(u.uForm, cluster ? cluster.formK : 0);
      if (u.uMouse) gl.uniform3f(u.uMouse, pointer.x, pointer.y, 0);
      if (u.uMouseOn) gl.uniform1f(u.uMouseOn, mouseOn);
      if (u.uWave) gl.uniform4fv(u.uWave, wave);
      if (u.uMe) gl.uniform3f(u.uMe, me.x, me.y, me.z);
      if (u.uMeOn) gl.uniform1f(u.uMeOn, me.on * reveal);
      if (u.uFocus) gl.uniform1f(u.uFocus, focusId);
      gl.uniform3fv(u.uInk, INK); gl.uniform3fv(u.uPurple, PURPLE); gl.uniform3fv(u.uWhite, WHITE);
      if (u.uInkL) gl.uniform3fv(u.uInkL, INKL);
      if (u.uBoot) gl.uniform1f(u.uBoot, boot ? 1 : 0);
      if (u['uDark[0]']) { gl.uniform4fv(u['uDark[0]'], darkData); gl.uniform1i(u.uNDark, darkN); if (u.uDarkR) gl.uniform1f(u.uDarkR, darkR); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, posTex); gl.uniform1i(u.uPos, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, infoTex); gl.uniform1i(u.uInfo, 1);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, fireTex); gl.uniform1i(u.uFire, 3);
      if (isNode) {
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(u.uAtlas, 2);
        gl.uniform1f(u.uPhotoReveal, photoReveal);
      }
    };
    // black bands, in device pixels from the bottom (the shader flips its ink inside them)
    darkN = 0;
    if (bandsFn) bandsFn().slice(0, 6).forEach(b => { const o = darkN * 4; darkData[o] = (b.left ?? 0) * dpr; darkData[o + 1] = (H - b.bottom) * dpr; darkData[o + 2] = (b.right ?? W) * dpr; darkData[o + 3] = (H - b.top) * dpr; darkR = (b.radius || 0) * dpr; darkN++; });
    // the network is only seen through its panels: draw just those rectangles (nothing at all
    // when no panel is on screen, which also saves the GPU most of the page)
    const rects = clip && !boot ? clip() : [{ left: 0, top: 0, right: W, bottom: H }];
    if (!rects.length) return;
    const draw = () => {
      set(edge, false);
      gl.bindVertexArray(edgeVao);
      gl.drawElementsInstanced(gl.TRIANGLES, SEG * 6, gl.UNSIGNED_SHORT, 0, E);
      set(node, true);
      gl.bindVertexArray(nodeVao);
      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, N);
    };
    if (clip && !boot) {
      gl.enable(gl.SCISSOR_TEST);
      rects.forEach(r => {
        const x = Math.max(0, Math.floor(r.left * dpr)), y = Math.max(0, Math.floor((H - r.bottom) * dpr));
        const w = Math.min(canvas.width, Math.ceil(r.right * dpr)) - x, h = Math.min(canvas.height, Math.ceil((H - r.top) * dpr)) - y;
        if (w <= 0 || h <= 0) return;
        gl.scissor(x, y, w, h);
        draw();
      });
      gl.disable(gl.SCISSOR_TEST);
    } else draw();
    gl.bindVertexArray(null);
  }

  function project(x, y, z) {
    const dz = D - z, s = (D / dz);
    return { x: W / 2 + (x - cam[0]) * ppu * s, y: H / 2 - (y - cam[1]) * ppu * s };
  }

  build();
  let rebuildT = 0;
  const rebuild = () => { clearTimeout(rebuildT); rebuildT = setTimeout(build, 120); };
  addEventListener('resize', rebuild);

  return {
    frame, rebuild, project,
    get debug() { return { vel, time, N, E, ppu, cam: [...cam], dpr, signals: signals.length, brain: nB }; },
    get layout() { return layout; },
    get labels() { return layout.labels; },
    cluster: () => cluster,
    setPaused(p) { paused = p; },
    set reveal(v) { reveal = v; }, get reveal() { return reveal; },
    set photoReveal(v) { photoReveal = v; }, get photoReveal() { return photoReveal; },
    // the opening: 0..1 for the brain drawing itself, then 0..1 for it becoming people
    set brainIn(v) { intro.brainIn = v; }, get brainIn() { return intro.brainIn; },
    set morph(v) { intro.morph = v; }, get morph() { return intro.morph; },
    // the loading moment: the brain sits in the middle of a black screen, drawn in light
    set boot(v) { boot = v; }, get boot() { return boot; },
    set meAllow(v) { meAllow = !!v; },
    set bootY(v) { bootY = v; },
    get formK() { return cluster ? cluster.formK : 0; },
    get formShape() { return cluster ? cluster.shape : -1; },
    get me() { const p = project(me.x, me.y, me.z); return { x: p.x, y: p.y, on: me.on }; },
    attract(el) { attractEl = el || null; },
    // a call to action fires the network: a wave from the button and a burst of activity
    // the moment the brain comes apart: a shockwave from its centre, and a burst of firing
    shock() { wave = [center.x, center.y, 0, time]; boost = 1; stimulate(center.x, center.y, S * 0.6, 24); },
    fire(el) { const w = el ? elWorld(el) : { x: me.x, y: me.y }; wave = [w.x, w.y, 0, time]; boost = 1; stimulate(w.x, w.y, 2.2, 16); },
    setFlow(dir) { flowTarget = dir < 0 ? -1 : 1; },
    canvasPoint() { return toWorld(W / 2, H / 2); }
  };
}
