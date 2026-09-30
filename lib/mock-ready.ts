/**
 * Saat mock MSW aktif di browser, permintaan API menunggu service worker siap
 * agar tidak ada request yang lolos ke backend sebelum mock terpasang.
 */
let ready: Promise<unknown> = Promise.resolve();

export function setMockReady(promise: Promise<unknown>) {
  ready = promise.catch(() => undefined);
}

export function mockReady() {
  return ready;
}
