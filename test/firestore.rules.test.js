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

  it("blocks unauthenticated users from any operation", async () => {
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

  it("allows owner to update their business but denies others", async () => {
    await seedBusiness(testEnv, {
      id: "biz-owner",
      businessName: "Mi negocio",
      ownerId: "owner-uid",
      ownerEmail: "owner@example.com",
      status: "draft",
    });

    const ownerContext = testEnv.authenticatedContext("owner-uid", { email: "owner@example.com" });
    const ownerRef = ownerContext.firestore().collection("businesses").doc("biz-owner");
    await assertSucceeds(
      ownerRef.set(
        {
          businessName: "Mi negocio actualizado",
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

  it("allows admins to create, update, and delete any business", async () => {
    const adminContext = testEnv.authenticatedContext("admin-user", { admin: true });
    const collection = adminContext.firestore().collection("businesses");

    const docRef = collection.doc("admin-biz");
    await assertSucceeds(
      docRef.set({
        businessName: "Admin creado",
        ownerEmail: "owner@example.com",
        ownerId: "owner-1",
        status: "approved",
      })
    );

    await assertSucceeds(
      docRef.update({
        status: "rejected",
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
