import type {Firestore, Query, QueryDocumentSnapshot} from "firebase-admin/firestore";

export type ApplicationRiskLevel = "low" | "medium" | "high";
export type ApplicationDuplicateLabel = "sin coincidencias" | "revisar" | "alto";

export type ApplicationRiskSignal = {
  code: "contact_match" | "name_category_match" | "email_match";
  weight: number;
  candidateType: "application" | "business";
  candidateId: string;
};

export type ApplicationRiskAssessment = {
  schemaVersion: 1;
  applicationId: string;
  riskLevel: ApplicationRiskLevel;
  riskScore: number;
  signals: ApplicationRiskSignal[];
  evaluatorVersion: 1;
  evaluatedAt: unknown;
};

type Candidate = {
  type: "application" | "business";
  id: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function normalizeDuplicateEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeDuplicatePhone(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 13 && digits.startsWith("521")) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);
  return digits;
}

export function normalizeDuplicateName(value: unknown): string {
  return typeof value === "string"
    ? value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
    : "";
}

function applicationData(data: Record<string, unknown>) {
  const business = asRecord(data.business);
  return {
    email: normalizeDuplicateEmail(data.ownerEmail),
    contacts: new Set([
      normalizeDuplicatePhone(data.ownerPhone),
      normalizeDuplicatePhone(business.phone),
      normalizeDuplicatePhone(business.whatsapp),
    ].filter(Boolean)),
    name: normalizeDuplicateName(business.businessName),
    category: normalizeDuplicateName(business.categoryId || business.category),
  };
}

function persistedPhoneVariants(contacts: Set<string>): string[] {
  const variants = new Set<string>();
  for (const contact of contacts) {
    if (!contact) continue;
    variants.add(contact);
    if (contact.length === 10) {
      variants.add(`52${contact}`);
      variants.add(`+52${contact}`);
      variants.add(`521${contact}`);
      variants.add(`+521${contact}`);
    }
  }
  return [...variants].slice(0, 30);
}

function candidateData(candidate: Candidate) {
  const nested = asRecord(candidate.data.business);
  const businessName = candidate.type === "application"
    ? nested.businessName
    : candidate.data.businessName || candidate.data.name;
  const category = candidate.type === "application"
    ? nested.categoryId || nested.category
    : candidate.data.categoryId || candidate.data.category;
  return {
    email: normalizeDuplicateEmail(candidate.data.ownerEmail || candidate.data.contactEmail),
    contacts: new Set([
      normalizeDuplicatePhone(candidate.data.ownerPhone),
      normalizeDuplicatePhone(candidate.data.phone),
      normalizeDuplicatePhone(candidate.data.whatsapp),
      normalizeDuplicatePhone(candidate.data.WhatsApp),
      normalizeDuplicatePhone(nested.phone),
      normalizeDuplicatePhone(nested.whatsapp),
    ].filter(Boolean)),
    name: normalizeDuplicateName(businessName),
    category: normalizeDuplicateName(category),
  };
}

export function evaluateApplicationDuplicateRisk(
  applicationId: string,
  source: Record<string, unknown>,
  candidates: Candidate[],
): Omit<ApplicationRiskAssessment, "evaluatedAt"> {
  const current = applicationData(source);
  const signals: ApplicationRiskSignal[] = [];
  let highestCandidateScore = 0;

  for (const candidate of candidates) {
    if (candidate.type === "application" && candidate.id === applicationId) continue;
    if (candidate.data.status === "rejected" || candidate.data.adminStatus === "deleted") continue;

    const other = candidateData(candidate);
    const candidateSignals: ApplicationRiskSignal[] = [];
    const sameContact = [...current.contacts].some((phone) => other.contacts.has(phone));
    const sameNameCategory = Boolean(
      current.name &&
      current.category &&
      current.name === other.name &&
      current.category === other.category
    );
    const sameEmail = Boolean(current.email && current.email === other.email);

    if (sameContact) {
      candidateSignals.push({
        code: "contact_match",
        weight: 60,
        candidateType: candidate.type,
        candidateId: candidate.id,
      });
    }
    if (sameNameCategory) {
      candidateSignals.push({
        code: "name_category_match",
        weight: 40,
        candidateType: candidate.type,
        candidateId: candidate.id,
      });
    }
    if (sameEmail) {
      candidateSignals.push({
        code: "email_match",
        weight: 20,
        candidateType: candidate.type,
        candidateId: candidate.id,
      });
    }

    const score = Math.min(100, candidateSignals.reduce((sum, signal) => sum + signal.weight, 0));
    highestCandidateScore = Math.max(highestCandidateScore, score);
    signals.push(...candidateSignals);
  }

  const riskLevel: ApplicationRiskLevel = highestCandidateScore >= 70
    ? "high"
    : highestCandidateScore >= 40
      ? "medium"
      : "low";

  return {
    schemaVersion: 1,
    applicationId,
    riskLevel,
    riskScore: highestCandidateScore,
    signals: signals.slice(0, 40),
    evaluatorVersion: 1,
  };
}

function addDocuments(
  target: Map<string, Candidate>,
  type: Candidate["type"],
  documents: QueryDocumentSnapshot[],
) {
  for (const document of documents) {
    target.set(`${type}:${document.id}`, {type, id: document.id, data: document.data()});
  }
}

export async function assessApplicationV2DuplicateRisk(
  db: Firestore,
  applicationId: string,
  application: Record<string, unknown>,
  serverTimestamp: () => unknown,
): Promise<ApplicationRiskAssessment> {
  const current = applicationData(application);
  const queries: Array<{type: Candidate["type"]; query: Query}> = [];
  const phoneVariants = persistedPhoneVariants(current.contacts);

  // Ventana acotada para aplicar normalización real a nombre/email, que en
  // documentos legacy pueden variar en mayúsculas o acentos.
  queries.push({type: "application", query: db.collection("applications").orderBy("createdAt", "desc").limit(25)});
  queries.push({type: "business", query: db.collection("businesses").orderBy("createdAt", "desc").limit(25)});
  // Las coincidencias exactas no deben depender de la ventana reciente.
  if (current.email) {
    queries.push({type: "application", query: db.collection("applications").where("ownerEmail", "==", current.email).limit(20)});
    queries.push({type: "business", query: db.collection("businesses").where("ownerEmail", "==", current.email).limit(20)});
    queries.push({type: "business", query: db.collection("businesses").where("contactEmail", "==", current.email).limit(20)});
  }
  const sourceBusiness = asRecord(application.business);
  const exactBusinessName = typeof sourceBusiness.businessName === "string"
    ? sourceBusiness.businessName.trim()
    : "";
  if (exactBusinessName) {
    queries.push({type: "application", query: db.collection("applications").where("business.businessName", "==", exactBusinessName).limit(20)});
    queries.push({type: "business", query: db.collection("businesses").where("businessName", "==", exactBusinessName).limit(20)});
    queries.push({type: "business", query: db.collection("businesses").where("name", "==", exactBusinessName).limit(20)});
  }
  if (phoneVariants.length) {
    queries.push({type: "application" as const, query: db.collection("applications").where("ownerPhone", "in", phoneVariants).limit(20)});
    queries.push({type: "application" as const, query: db.collection("applications").where("business.phone", "in", phoneVariants).limit(20)});
    queries.push({type: "application" as const, query: db.collection("applications").where("business.whatsapp", "in", phoneVariants).limit(20)});
    queries.push({type: "business" as const, query: db.collection("businesses").where("phone", "in", phoneVariants).limit(20)});
    queries.push({type: "business" as const, query: db.collection("businesses").where("WhatsApp", "in", phoneVariants).limit(20)});
    queries.push({type: "business" as const, query: db.collection("businesses").where("whatsapp", "in", phoneVariants).limit(20)});
  }
  const snapshots = await Promise.all(queries.map(({query}) => query.get()));
  const candidates = new Map<string, Candidate>();
  snapshots.forEach((snapshot, index) => addDocuments(candidates, queries[index].type, snapshot.docs));

  const evaluated = evaluateApplicationDuplicateRisk(applicationId, application, [...candidates.values()]);
  const assessment: ApplicationRiskAssessment = {
    ...evaluated,
    evaluatedAt: serverTimestamp(),
  };
  await db.collection("applicationRiskAssessments").doc(applicationId).set(assessment, {merge: false});
  return assessment;
}

export function duplicateLabelForTelegram(
  assessment: Pick<ApplicationRiskAssessment, "riskLevel"> | null,
): ApplicationDuplicateLabel {
  if (!assessment) return "revisar";
  if (assessment.riskLevel === "high") return "alto";
  if (assessment.riskLevel === "medium") return "revisar";
  return "sin coincidencias";
}
