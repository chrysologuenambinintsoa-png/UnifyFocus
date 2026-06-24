let current: string | null = null;

export function isCheckoutPending(key: string) {
  return current === key;
}

export function acquireCheckout(key: string) {
  if (current) return false;
  current = key;
  return true;
}

export function releaseCheckout(key?: string) {
  if (!key || current === key) current = null;
}

export function getCurrentCheckout() {
  return current;
}
