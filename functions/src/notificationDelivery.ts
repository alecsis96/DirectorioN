type NotificationDeliveryReference = {
  set(data: Record<string, unknown>, options: { merge: boolean }): Promise<unknown>;
};

type NotificationDeliveryFirestore = {
  collection(name: string): {
    doc(id: string): NotificationDeliveryReference;
  };
  runTransaction<T>(callback: (transaction: {
    get(reference: NotificationDeliveryReference): Promise<{ exists: boolean }>;
    create(reference: NotificationDeliveryReference, data: Record<string, unknown>): void;
  }) => Promise<T>): Promise<T>;
};

export function isAnonymousApplicationV2NotificationSource(
  data: Record<string, unknown>,
): boolean {
  const business = data.business;
  return data.schemaVersion === 2 &&
    data.status === "submitted" &&
    data.businessId === null &&
    !Object.prototype.hasOwnProperty.call(data, "ownerId") &&
    !Object.prototype.hasOwnProperty.call(data, "ownerUid") &&
    typeof data.ownerEmail === "string" && data.ownerEmail.length > 3 &&
    typeof data.ownerName === "string" && data.ownerName.trim().length > 0 &&
    typeof data.ownerPhone === "string" && data.ownerPhone.trim().length >= 7 &&
    typeof data.publicReference === "string" &&
    /^YJG-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/.test(data.publicReference) &&
    typeof business === "object" && business !== null &&
    typeof (business as Record<string, unknown>).businessName === "string" &&
    String((business as Record<string, unknown>).businessName).trim().length > 0;
}

/** Reserva atómica server-only para evitar reenvíos normales de un trigger at-least-once. */
export async function beginApplicationV2NotificationDelivery(
  db: NotificationDeliveryFirestore,
  serverTimestamp: () => unknown,
  applicationId: string,
  eventId: string,
) {
  const reference = db
    .collection("notificationDeliveries")
    .doc(`application-v2-created-${applicationId}`);
  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists) return false;
    transaction.create(reference, {
      applicationId,
      eventId,
      source: "application-v2-created",
      status: "processing",
      createdAt: serverTimestamp(),
    });
    return true;
  });
  return { acquired, reference };
}
