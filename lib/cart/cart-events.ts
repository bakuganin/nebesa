export const cartOpenEventName = "nebesa-cart-open";

export function requestCartOpen() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(cartOpenEventName));
}
