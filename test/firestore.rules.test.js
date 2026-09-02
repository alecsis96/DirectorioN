import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const projectId = "firestore-rules-test";
let testEnv;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const shouldRunTests = Boolean(emulatorHost);

const loadRules = () => readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8");
const seedBusiness = async (testEnv, data) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .collection("businesses")
      .doc(data.id)
      .set(data);
  });
};

const runner = shouldRunTests ? describe : describe.skip;

runner("Firestore security rules for /businesses", () => {
  beforeAll(async () => {
    if (!emulatorHost) {
      console.warn("FIRESTORE_EMULATOR_HOST is not defined; skipping Firestore rules tests.");
      return;
    }
    const [host, portString] = emulatorHost.split(":");
    const port = portString ? Number(portString) : 8080;

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: loadRules(),
        host,
        port,
      },
    });
  });

  afterAll(async () => {
    if (!testEnv) return;
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (!testEnv) return;
    await testEnv.clearFirestore();
  });

  it("blocks unauthenticated users from private drafts and all writes", async () => {
    await seedBusiness(testEnv, {
      id: "biz-blocked",
      businessName: "Negocio Privado",
      ownerId: "owner-123",
      ownerEmail: "owner@example.com",
      status: "draft",
    });

    const context = testEnv.unauthenticatedContext();
    const ref = context.firestore().collection("businesses").doc("biz-blocked");

    await assertFails(ref.get());
    await assertFails(ref.set({ businessName: "Fail" }));
    await assertFails(ref.update({ status: "approved" }));
    await assertFails(ref.delete());
  });

  it("allows public reads for visible businesses with or without ownerId", async () => {
    await seedBusiness(testEnv, {
      id: "biz-public-ownerless",
      businessName: "Alta asistida publica",
      businessStatus: "published",
      adminStatus: "active",
      visibility: "published",
      isActive: true,
    });
    await seedBusiness(testEnv, {
      id: "biz-public-owned",
      businessName: "Negocio publico",
      ownerId: "owner-1",
      businessStatus: "published",
      adminStatus: "active",
      visibility: "published",
      isActive: true,
    });

    const context = testEnv.unauthenticatedContext();
    const collection = context.firestore().collection("businesses");
    await assertSucceeds(collection.doc("biz-public-ownerless").get());
    await assertSucceeds(collection.doc("biz-public-owned").get());
    await assertSucceeds(
      collection
        .where("businessStatus", "==", "published")
        .where("adminStatus", "==", "active")
        .where("visibility", "==", "published")
        .where("isActive", "==", true)
        .limit(100)
        .get()
    );
  });

  it("denies public reads for draft, archived, hidden, and inactive businesses", async () => {
    const records = [
      { id: "draft", businessStatus: "draft", adminStatus: "active", visibility: "published", isActive: true },
      { id: "archived", businessStatus: "published", adminStatus: "archived", visibility: "published", isActive: true },
      { id: "hidden", businessStatus: "published", adminStatus: "active", visibility: "hidden", isActive: true },
      { id: "inactive", businessStatus: "published", adminStatus: "active", visibility: "published", isActive: false },
      { id: "invalid-admin", businessStatus: "published", adminStatus: "", visibility: "published", isActive: true },
      { id: "invalid-visibility", businessStatus: "published", adminStatus: "active", visibility: null, isActive: true },
      { id: "invalid-active", businessStatus: "published", adminStatus: "active", visibility: "published", isActive: null },
    ];
    for (const record of records) {
      await seedBusiness(testEnv, { businessName: record.id, ...record });
    }

    const collection = testEnv.unauthenticatedContext().firestore().collection("businesses");
    for (const record of records) {
      await assertFails(collection.doc(record.id).get());
    }
  });

  it("allows owner-scoped lists and denies broad or foreign private lists", async () => {
    await seedBusiness(testEnv, {
      id: "owner-draft",
      businessName: "Borrador propio",
      ownerId: "owner-uid",
      ownerEmail: "owner@example.com",
      businessStatus: "draft",
    });
    await seedBusiness(testEnv, {
      id: "other-draft",
      businessName: "Borrador ajeno",
      ownerId: "other-uid",
      ownerEmail: "other@example.com",
      businessStatus: "draft",
    });

    const context = testEnv.authenticatedContext("owner-uid", { email: "owner@example.com" });
    const collection = context.firestore().collection("businesses");
    await assertSucceeds(collection.where("ownerId", "==", "owner-uid").limit(100).get());
    await assertFails(collection.where("ownerId", "==", "other-uid").limit(100).get());
    await assertFails(collection.limit(100).get());
  });

  it("does not grant ownership when ownerId is absent", async () => {
    await seedBusiness(testEnv, {
      id: "assisted-private",
      businessName: "Alta asistida privada",
      ownerEmail: "user@example.com",
      businessStatus: "draft",
    });

    const user = testEnv.authenticatedContext("user-uid", { email: "user@example.com" });
    await assertFails(user.firestore().collection("businesses").doc("assisted-private").get());

    const admin = testEnv.authenticatedContext("admin-uid", { admin: true });
    await assertSucceeds(admin.firestore().collection("businesses").doc("assisted-private").get());
  });

  it("keeps current and legacy ownership claims server-only for every client", async () => {
    const anonymous = testEnv.unauthenticatedContext();
    const user = testEnv.authenticatedContext("user-uid", { email: "user@example.com" });
    const admin = testEnv.authenticatedContext("admin-uid", { admin: true });
    const anonymousRef = anonymous.firestore().collection("ownershipClaims").doc("claim-1");
    const userRef = user.firestore().collection("ownershipClaims").doc("claim-1");
    const adminRef = admin.firestore().collection("ownershipClaims").doc("claim-1");
    const anonymousGuard = anonymous.firestore().collection("ownershipClaimGuards").doc("business-1");
    const userGuard = user.firestore().collection("ownershipClaimGuards").doc("business-1");
    const adminGuard = admin.firestore().collection("ownershipClaimGuards").doc("business-1");
    const anonymousLegacy = anonymous.firestore().collection("claims").doc("legacy-claim-1");
    const userLegacy = user.firestore().collection("claims").doc("legacy-claim-1");
    const adminLegacy = admin.firestore().collection("claims").doc("legacy-claim-1");

    await assertFails(anonymousRef.get());
    await assertFails(anonymousRef.set({ businessId: "business-1", tokenHash: "hash" }));
    await assertFails(userRef.get());
    await assertFails(userRef.set({ businessId: "business-1", tokenHash: "hash" }));
    await assertFails(adminRef.get());
    await assertFails(adminRef.set({ businessId: "business-1", tokenHash: "hash" }));
    await assertFails(anonymousGuard.get());
    await assertFails(anonymousGuard.set({ activeClaimId: "claim-1", version: 1 }));
    await assertFails(userGuard.get());
    await assertFails(userGuard.set({ activeClaimId: "claim-1", version: 1 }));
    await assertFails(adminGuard.get());
    await assertFails(adminGuard.set({ activeClaimId: "claim-1", version: 1 }));
    await assertFails(anonymousLegacy.get());
    await assertFails(anonymousLegacy.set({ businessId: "business-1", userId: "anonymous" }));
    await assertFails(userLegacy.get());
    await assertFails(userLegacy.set({ businessId: "business-1", userId: "user-uid" }));
    await assertFails(adminLegacy.get());
    await assertFails(adminLegacy.set({ businessId: "business-1", userId: "admin-uid" }));
  });

  it("keeps public intake idempotency and rate-limit state server-only", async () => {
    const contexts = [
      testEnv.unauthenticatedContext(),
      testEnv.authenticatedContext("user-uid", { email: "user@example.com" }),
      testEnv.authenticatedContext("admin-uid", { admin: true }),
    ];

    for (const context of contexts) {
      const idempotencyRef = context.firestore().collection("publicApplicationIdempotency").doc("guard-1");
      const rateLimitRef = context.firestore().collection("publicApplicationRateLimits").doc("bucket-1");
      const deliveryRef = context.firestore().collection("notificationDeliveries").doc("delivery-1");
      await assertFails(idempotencyRef.get());
      await assertFails(idempotencyRef.set({ applicationId: "application-1" }));
      await assertFails(rateLimitRef.get());
      await assertFails(rateLimitRef.set({ count: 0 }));
      await assertFails(deliveryRef.get());
      await assertFails(deliveryRef.set({ status: "processing" }));
    }
  });

  it("allows owner to update their business but denies others", async () => {
    await seedBusiness(testEnv, {
      id: "biz-owner",
      businessName: "Mi negocio",
      ownerId: "owner-uid",
      ownerEmail: "owner@example.com",
      status: "draft",
      businessStatus: "draft",
      adminStatus: "active",
      visibility: "hidden",
      isActive: true,
      plan: "free",
    });

    const ownerContext = testEnv.authenticatedContext("owner-uid", { email: "owner@example.com" });
    const ownerRef = ownerContext.firestore().collection("businesses").doc("biz-owner");
    await assertSucceeds(
      ownerRef.set(
        {
          businessName: "Mi negocio actualizado",
          description: "Descripcion actualizada por el propietario",
          ownerId: "owner-uid",
          ownerEmail: "owner@example.com",
          status: "draft",
        },
        { merge: true }
      )
    );

    const otherContext = testEnv.authenticatedContext("intruder", { email: "intruder@example.com" });
    const otherRef = otherContext.firestore().collection("businesses").doc("biz-owner");
    await assertFails(
      otherRef.set(
        {
          businessName: "Intento no autorizado",
          ownerId: "owner-uid",
          ownerEmail: "owner@example.com",
          status: "draft",
        },
        { merge: true }
      )
    );
  });

  it.each([
    ["adminStatus", "active"],
    ["visibility", "published"],
    ["isActive", true],
    ["plan", "sponsor"],
    ["applicationStatus", "rejected"],
    ["adminNotes", "Intento de modificar moderacion"],
  ])("denies owner changes to reserved field %s", async (field, value) => {
    await seedBusiness(testEnv, {
      id: "reserved-owner-update",
      businessName: "Negocio restringido",
      ownerId: "owner-uid",
      ownerEmail: "owner@example.com",
      businessStatus: "published",
      applicationStatus: "approved",
      adminStatus: "archived",
      visibility: "hidden",
      isActive: false,
      plan: "free",
    });

    const owner = testEnv.authenticatedContext("owner-uid", { email: "owner@example.com" });
    await assertFails(
      owner.firestore().collection("businesses").doc("reserved-owner-update").update({
        [field]: value,
      })
    );
  });

  it("denies owner publication of a legacy business without businessStatus", async () => {
    await seedBusiness(testEnv, {
      id: "legacy-owner-update",
      businessName: "Negocio legacy",
      ownerId: "owner-uid",
      ownerEmail: "owner@example.com",
      status: "draft",
    });

    const owner = testEnv.authenticatedContext("owner-uid", { email: "owner@example.com" });
    await assertFails(
      owner.firestore().collection("businesses").doc("legacy-owner-update").update({
        businessStatus: "published",
        visibility: "published",
      })
    );
  });

  it("denies normal-user updates to an ownerless business", async () => {
    await seedBusiness(testEnv, {
      id: "ownerless-update",
      businessName: "Alta asistida",
      ownerEmail: "user@example.com",
      businessStatus: "draft",
    });

    const user = testEnv.authenticatedContext("user-uid", { email: "user@example.com" });
    await assertFails(
      user.firestore().collection("businesses").doc("ownerless-update").update({
        businessName: "Intento por email",
      })
    );
  });

  it("denies owner lists above the maximum limit", async () => {
    const owner = testEnv.authenticatedContext("owner-uid");
    await assertFails(
      owner
        .firestore()
        .collection("businesses")
        .where("ownerId", "==", "owner-uid")
        .limit(101)
        .get()
    );
  });

  it("allows admins to create, update, and delete any business", async () => {
    const adminContext = testEnv.authenticatedContext("admin-user", { admin: true });
    const collection = adminContext.firestore().collection("businesses");

    const docRef = collection.doc("admin-biz");
    await assertSucceeds(
      docRef.set({
        name: "Alta asistida sin propietario",
        businessStatus: "draft",
        adminStatus: "active",
        visibility: "hidden",
      })
    );

    await assertSucceeds(
      docRef.update({
        businessStatus: "published",
        visibility: "published",
        adminStatus: "active",
        isActive: true,
        plan: "sponsor",
      })
    );

    await assertSucceeds(docRef.delete());
  });

  it("prevents non-admins from creating businesses with non-draft status", async () => {
    const userContext = testEnv.authenticatedContext("creator-uid", { email: "creator@example.com" });
    const ref = userContext.firestore().collection("businesses").doc("biz-new");
    await assertFails(
      ref.set({
        businessName: "Negocio Avanzado",
        ownerId: "creator-uid",
        ownerEmail: "creator@example.com",
        status: "pending",
      })
    );
  });

  it("allows a verified user to create only an owner-scoped draft", async () => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    const ref = userContext.firestore().collection("businesses").doc("owner-draft-create");
    await assertSucceeds(
      ref.set({
        name: "Nuevo negocio",
        businessName: "Nuevo negocio",
        ownerId: "creator-uid",
        ownerEmail: "creator@example.com",
        businessStatus: "draft",
      })
    );
  });

  it.each([
    ["createdVia", "admin_assisted"],
    ["createdByAdminId", "admin-user"],
    ["publishedBy", "admin-user"],
    ["viewCount", 5000],
    ["reviewCount", 200],
    ["avgRating", 5],
    ["stripeSubscriptionStatus", "active"],
    ["nextPaymentDate", "2099-01-01"],
    ["futureInternalField", true],
  ])("denies non-allowlisted field %s during owner create", async (field, value) => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    const ref = userContext.firestore().collection("businesses").doc(`internal-create-${field}`);
    await assertFails(
      ref.set({
        businessName: "Nuevo negocio",
        ownerId: "creator-uid",
        ownerEmail: "creator@example.com",
        businessStatus: "draft",
        [field]: value,
      })
    );
  });

  it("denies an owner create that starts published", async () => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    await assertFails(
      userContext.firestore().collection("businesses").doc("published-create").set({
        businessName: "Publicado por atacante",
        ownerId: "creator-uid",
        ownerEmail: "creator@example.com",
        businessStatus: "published",
      })
    );
  });

  it("denies an owner create for another uid", async () => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    await assertFails(
      userContext.firestore().collection("businesses").doc("foreign-owner-create").set({
        businessName: "Propietario falso",
        ownerId: "other-uid",
        ownerEmail: "creator@example.com",
        businessStatus: "draft",
      })
    );
  });

  it("denies an owner create with another email", async () => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    await assertFails(
      userContext.firestore().collection("businesses").doc("foreign-email-create").set({
        businessName: "Correo falso",
        ownerId: "creator-uid",
        ownerEmail: "admin@example.com",
        businessStatus: "draft",
      })
    );
  });

  it.each([
    ["adminStatus", "active"],
    ["visibility", "published"],
    ["isActive", true],
    ["plan", "sponsor"],
    ["applicationStatus", "approved"],
  ])("denies reserved field %s during owner create", async (field, value) => {
    const userContext = testEnv.authenticatedContext("creator-uid", {
      email: "creator@example.com",
      email_verified: true,
    });
    const ref = userContext.firestore().collection("businesses").doc(`reserved-create-${field}`);
    await assertFails(
      ref.set({
        name: "Nuevo negocio",
        businessName: "Nuevo negocio",
        ownerId: "creator-uid",
        ownerEmail: "creator@example.com",
        businessStatus: "draft",
        [field]: value,
      })
    );
  });

  it("blocks owners from enabling featured on their business", async () => {
    await seedBusiness(testEnv, {
      id: "biz-featured",
      businessName: "Negocio Draft",
      ownerId: "owner-secure",
      ownerEmail: "owner@example.com",
      status: "draft",
      featured: false,
    });

    const ownerContext = testEnv.authenticatedContext("owner-secure", { email: "owner@example.com" });
    const ref = ownerContext.firestore().collection("businesses").doc("biz-featured");
    await assertFails(
      ref.set(
        {
          featured: true,
          ownerId: "owner-secure",
          ownerEmail: "owner@example.com",
        },
        { merge: true }
      )
    );
  });

  it("denies waitlist creation while monetization is disabled", async () => {
    await seedBusiness(testEnv, {
      id: "waitlist-owner-business",
      businessName: "Negocio del propietario",
      ownerId: "owner-waitlist",
      businessStatus: "draft",
    });

    const owner = testEnv.authenticatedContext("owner-waitlist");
    const admin = testEnv.authenticatedContext("admin-waitlist", { admin: true });
    const payload = {
      businessId: "waitlist-owner-business",
      category: "restaurantes",
      targetPlan: "featured",
      status: "waiting",
      createdAt: new Date(),
    };

    await assertFails(owner.firestore().collection("waitlist").doc("owner-request").set(payload));
    await assertFails(admin.firestore().collection("waitlist").doc("admin-request").set(payload));
  });

  it("denies purchase creation while monetization is disabled", async () => {
    await seedBusiness(testEnv, {
      id: "purchase-owner-business",
      businessName: "Negocio del comprador",
      ownerId: "owner-purchase",
      businessStatus: "draft",
    });

    const owner = testEnv.authenticatedContext("owner-purchase");
    const admin = testEnv.authenticatedContext("admin-purchase", { admin: true });
    const payload = {
      businessId: "purchase-owner-business",
      packageId: "destacado",
      amount: 100,
      createdAt: new Date(),
    };

    await assertFails(owner.firestore().collection("purchases").doc("owner-purchase").set(payload));
    await assertFails(admin.firestore().collection("purchases").doc("admin-purchase").set(payload));
  });
});

runner("Firestore security rules for /business_wizard", () => {
  beforeAll(async () => {
    if (!emulatorHost) return;
    const [host, portString] = emulatorHost.split(":");
    const port = portString ? Number(portString) : 8080;

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: loadRules(),
        host,
        port,
      },
    });
  });

  afterAll(async () => {
    if (!testEnv) return;
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (!testEnv) return;
    await testEnv.clearFirestore();
  });

  it("allows only the owner to read and write their wizard progress", async () => {
    const ownerContext = testEnv.authenticatedContext("wizard-owner", { email: "owner@example.com" });
    const ownerRef = ownerContext.firestore().collection("business_wizard").doc("wizard-owner");
    await assertSucceeds(ownerRef.set({ step: 1, formData: { businessName: "Mi negocio" } }));
    await assertSucceeds(ownerRef.get());

    const otherContext = testEnv.authenticatedContext("intruder", { email: "intruder@example.com" });
    const otherRef = otherContext.firestore().collection("business_wizard").doc("wizard-owner");
    await assertFails(otherRef.get());
    await assertFails(otherRef.set({ step: 2 }));
  });
});
