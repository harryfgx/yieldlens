import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom (needed by Radix UI, Tremor/recharts)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

// Polyfill hasPointerCapture for jsdom (needed by Radix UI Select)
if (typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

// Polyfill scrollIntoView for jsdom (needed by Radix UI Select)
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = function () {};
}
