import assert from "node:assert/strict";
import test from "node:test";
import {
  loadTestFailed,
  summarizeDeliveries,
} from "./realtime-load-metrics.mjs";

const created = () => new Map([[101, { senderIndex: 0, receiverIndex: 1 }]]);
const successful = () => ({
  ...summarizeDeliveries(
    created(),
    new Map([
      ["0:101", { count: 1, durationMs: 10 }],
      ["1:101", { count: 1, durationMs: 20 }],
    ]),
  ),
  completedDuration: true,
  createdInteractions: 1,
  auth429: 0,
  channelErrors: 0,
  unexpectedClosed: 0,
  http5xxRatio: 0,
  interactionErrors: 0,
  syncErrors: 0,
  missingFinalState: 0,
  missingReconciledState: 0,
  unauthorizedDeliveries: 0,
});

test("unrelated events cannot conceal a missing recipient", () => {
  const summary = summarizeDeliveries(
    created(),
    new Map([
      ["0:101", { count: 1, durationMs: 10 }],
      ["0:999", { count: 1, durationMs: 2 }],
    ]),
  );
  assert.equal(summary.missingDeliveries, 1);
  assert.equal(summary.unrelatedDeliveries, 1);
  assert.equal(loadTestFailed({ ...successful(), ...summary }), true);
});

test("delivery before HTTP response is matched when the ID becomes known", () => {
  const deliveries = new Map([["1:101", { count: 1, durationMs: 10 }]]);
  const summary = summarizeDeliveries(created(), deliveries);
  assert.equal(summary.receivedDeliveries, 1);
  assert.equal(summary.missingDeliveries, 1);
});

test("duplicate and latency metrics include only expected deliveries", () => {
  const summary = summarizeDeliveries(
    created(),
    new Map([
      ["0:101", { count: 2, durationMs: 10 }],
      ["1:101", { count: 1, durationMs: 20 }],
      ["0:999", { count: 50, durationMs: 60_000 }],
    ]),
  );
  assert.equal(summary.duplicateDeliveries, 1);
  assert.equal(summary.deliveryP95Ms, 20);
  assert.equal(loadTestFailed({ ...successful(), ...summary }), true);
});

test("a complete healthy run passes", () =>
  assert.equal(loadTestFailed(successful()), false));

for (const override of [
  { completedDuration: false },
  { unexpectedClosed: 1 },
  { syncErrors: 1 },
  { missingDeliveryTimestamps: 1 },
  { unauthorizedDeliveries: 1 },
  { missingReconciledState: 1 },
  { createdInteractions: 0 },
  { http5xxRatio: 0.01 },
  { deliveryP95Ms: 1_001 },
]) {
  test(`rejects ${JSON.stringify(override)}`, () => {
    assert.equal(loadTestFailed({ ...successful(), ...override }), true);
  });
}
