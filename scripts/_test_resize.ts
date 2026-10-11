import { resizeHeroBackgroundRect as f } from "../src/lib/hero-crop";

const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
const eq = (a: Record<string, number>, b: Record<string, number>, tol = 1e-9) =>
  Object.keys(a).every((k) => Math.abs(a[k] - b[k]) < tol);
let pass = 0, fail = 0;
const check = (name: string, got: Record<string, number>, want: Record<string, number>) => {
  const ok = eq(got, want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)} ${ok ? "" : "want " + JSON.stringify(want)}`);
  ok ? pass++ : fail++;
};

// NE: drag top-right corner right and up -> w grows, y shrinks, x fixed
check("NE +0.1,-0.1", f(r, "ne", 0.1, -0.1), { x: 0.2, y: 0.1, w: 0.5, h: 0.5 });
// NE drag past top edge -> y clamped to 0, h grows to bottom
check("NE +0.1,-0.3", f(r, "ne", 0.1, -0.3), { x: 0.2, y: 0, w: 0.5, h: 0.6 });
// NW: drag top-left up-left -> x/y shrink, w/h grow
check("NW -0.1,-0.1", f(r, "nw", -0.1, -0.1), { x: 0.1, y: 0.1, w: 0.5, h: 0.5 });
// SW: drag bottom-left left -> x shrinks, w grows; bottom edge fixed
check("SW -0.1,+0.1", f(r, "sw", -0.1, 0.1), { x: 0.1, y: 0.2, w: 0.5, h: 0.5 });
// SE: drag bottom-right right/down -> w/h grow, x/y fixed
check("SE +0.1,+0.1", f(r, "se", 0.1, 0.1), { x: 0.2, y: 0.2, w: 0.5, h: 0.5 });
// NW drag far past top-left -> clamped to canvas edge (0,0), w/h = full minus nothing
check("NW -0.5,-0.5", f(r, "nw", -0.5, -0.5), { x: 0, y: 0, w: 0.6, h: 0.6 });
// NE drag right edge past canvas right -> w clamped to 1 - x
check("NE +1,0", f(r, "ne", 1, 0), { x: 0.2, y: 0.2, w: 0.8, h: 0.4 });
// SW drag left edge past canvas left -> x clamped to 0
check("SW -1,0", f(r, "sw", -1, 0), { x: 0, y: 0.2, w: 0.6, h: 0.4 });
// Cross-over: NW drag so far the rect would flip -> clamped to MIN_SIZE on both axes
const min = f(r, "nw", 0.6, 0.6); // drags top-left down-right past center
check("NW crossover x", min, { x: r.x + r.w - 0.05, y: r.y + r.h - 0.05, w: 0.05, h: 0.05 });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
