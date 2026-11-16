/* A brain as a cloud of light: a few thousand tiny particles on the surface of a 3D brain
   (two hemispheres with folded cortex, the longitudinal fissure between them, the
   cerebellum tucked under the back and the brainstem), the way medical renders and
   particle studies draw it. No wireframe: the shape comes from density and depth.
   Units: about -1..1, frontal lobe toward -x, y up, z across the hemispheres. */

function rng(seed) {
  let a = seed | 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// folds: a sum of low-frequency waves on the sphere, sharpened into ridges (gyri) and grooves (sulci)
function folds(x, y, z) {
  const f = Math.sin(x * 7.1 + Math.sin(y * 5.3) * 1.4) + Math.sin(y * 8.3 + Math.sin(z * 6.1) * 1.2) + Math.sin(z * 7.7 + Math.sin(x * 4.9) * 1.3);
  return 1 - Math.abs(f) / 3;          // ridges near 1, grooves near 0
}

export function createBrain({ small }) {
  const rand = rng(86);
  const pts = [];
  const N = small ? 1800 : 3200;
  const push = (x, y, z, region, b) => pts.push({ x, y, z, size: (region === 0 ? 0.017 : 0.015) * (0.75 + rand() * 0.6), region, b });

  // cerebrum: two hemispheres, each an egg flattened underneath, folded on the surface
  for (let n = 0; n < N * 0.82; n++) {
    const side = rand() < 0.5 ? -1 : 1;
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    let x = r * Math.cos(th), y = u, z = r * Math.sin(th);
    const fd = folds(x, y, z);
    if (rand() > 0.35 + fd * 0.65) { n--; continue; }       // denser along the ridges
    let sy = 0.74;
    if (y < 0) sy *= 0.62 + 0.25 * Math.max(0, -x);          // flat base, temporal lobe dips at the front
    if (x < -0.2) sy *= 1 - (-x - 0.2) * 0.12;               // frontal lobe slopes down
    const bulge = 1 + (fd - 0.5) * 0.06;                      // gyri stand slightly proud
    x *= bulge; y = y * sy * bulge + 0.12; z = z * 0.42 * bulge;
    z = side * (Math.abs(z) + 0.035);                         // the fissure between hemispheres
    push(x, y, z, 0, fd);
  }
  // cerebellum: a smaller folded lobe under the back, finely striped
  for (let n = 0; n < N * 0.13; n++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const x = r * Math.cos(th), y = u, z = r * Math.sin(th);
    const stripe = 0.5 + 0.5 * Math.sin(y * 26);
    if (rand() > 0.3 + stripe * 0.7) { n--; continue; }
    push(0.56 + x * 0.3, -0.42 + y * 0.17, z * 0.36, 2, stripe);
  }
  // brainstem
  for (let n = 0; n < N * 0.05; n++) {
    const t = rand(), a = rand() * Math.PI * 2, rr = 0.07 * (1 - t * 0.3);
    push(0.22 + t * 0.1 + Math.cos(a) * rr, -0.3 - t * 0.55, Math.sin(a) * rr, 3, 0.5);
  }
  return { pts, links: [] };
}
