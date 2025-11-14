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
});
