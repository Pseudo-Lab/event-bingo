export const percentile = (values, ratio) => {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * ratio) - 1];
};

// Events may arrive before the create API responds. Match by exact recipient
// and interaction ID at the end; unrelated deliveries cannot fill a missing ID.
export const summarizeDeliveries = (createdInteractions, deliveries) => {
  const expectedKeys = new Set();
  for (const [id, { senderIndex, receiverIndex }] of createdInteractions) {
    expectedKeys.add(`${senderIndex}:${id}`);
    expectedKeys.add(`${receiverIndex}:${id}`);
  }
  let receivedDeliveries = 0;
  let duplicateDeliveries = 0;
  let missingDeliveryTimestamps = 0;
  const durations = [];
  for (const key of expectedKeys) {
    const delivery = deliveries.get(key);
    if (!delivery) continue;
    receivedDeliveries += 1;
    duplicateDeliveries += delivery.count - 1;
    if (Number.isFinite(delivery.durationMs))
      durations.push(delivery.durationMs);
    else missingDeliveryTimestamps += 1;
  }
  return {
    expectedDeliveries: expectedKeys.size,
    receivedDeliveries,
    missingDeliveries: expectedKeys.size - receivedDeliveries,
    duplicateDeliveries,
    unrelatedDeliveries: [...deliveries.keys()].filter(
      (key) => !expectedKeys.has(key),
    ).length,
    missingDeliveryTimestamps,
    deliveryP50Ms: percentile(durations, 0.5),
    deliveryP95Ms: percentile(durations, 0.95),
    deliveryP99Ms: percentile(durations, 0.99),
  };
};

export const loadTestFailed = (summary) =>
  !summary.completedDuration ||
  summary.createdInteractions === 0 ||
  summary.auth429 > 0 ||
  summary.channelErrors > 0 ||
  summary.unexpectedClosed > 0 ||
  summary.deliveryP95Ms === null ||
  summary.deliveryP95Ms > 1_000 ||
  summary.missingDeliveryTimestamps > 0 ||
  summary.duplicateDeliveries > 0 ||
  summary.http5xxRatio >= 0.01 ||
  summary.interactionErrors > 0 ||
  summary.syncErrors > 0 ||
  summary.missingDeliveries > 0 ||
  summary.missingFinalState > 0 ||
  summary.missingReconciledState > 0 ||
  summary.unauthorizedDeliveries > 0;
