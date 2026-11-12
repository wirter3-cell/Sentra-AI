// Tiny mutable store shared between the DOM scroll layer and the R3F render
// loop. Mutated every frame, so it intentionally avoids React state.
export const scrollState = {
  /** Continuous section position: 0 = hero, 1 = chain, 2 = power, … */
  t: 0,
  /** 0..1 over the whole page */
  progress: 0,
  /** Skip camera smoothing (used by ?still for screenshots). */
  snap: false,
};

export const pointer = { x: 0, y: 0 };

