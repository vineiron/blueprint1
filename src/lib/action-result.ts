/** Discriminated result returned by Server Actions to client callers. */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(error: string): ActionResult<never> {
  return { ok: false, error };
}
