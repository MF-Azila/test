import { test } from "@playwright/test";

/**
 * `@step("…")` on a page-object method: the call shows up as a named step in
 * the Playwright report and trace, so a failure says WHICH business step broke.
 * Standard (TC39) method decorator, as in the Playwright docs.
 */
export function step(name?: string) {
  return function <This, Args extends unknown[], R>(
    target: (this: This, ...args: Args) => Promise<R>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<R>>,
  ) {
    return function (this: This, ...args: Args): Promise<R> {
      const label = name ?? `${String((this as object)?.constructor?.name ?? "")}.${String(context.name)}`;
      return test.step(label, () => target.call(this, ...args), { box: true });
    };
  };
}
