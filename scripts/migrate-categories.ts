import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { resolveCategory } from '../lib/categoriesCatalog';

/**
 * Migración segura de categorías
 * - Agrega categoryId/categoryName/categoryGroupId a negocios existentes
 * - Mantiene el campo legacy `category` como etiqueta visible
 *
 * Ejecutar con: npx tsx scripts/migrate-categories.ts
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('❌ FIREBASE_SERVICE_ACCOUNT no está configurado en .env.local');
  }

  const credential = JSON.parse(serviceAccount);
  admin.initializeApp({ credential: admin.credential.cert(credential) });
  console.log('✅ Firebase Admin inicializado');
}

const db = admin.firestore();

async function migrate() {
  const snap = await db.collection('businesses').get();
  console.log(`Encontrados ${snap.size} negocios. Iniciando migración…`);

  let updated = 0;
  let legacyMapped = 0;
  let fallback = 0;
  let skipped = 0;

  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (data.categoryId) {
      skipped++;
      continue;
    }

    const rawCategory = typeof data.category === 'string' ? data.category : '';
    const input = typeof data.categoryId === 'string'
      ? data.categoryId
      : typeof data.categoryName === 'string'
      ? data.categoryName
      : rawCategory;

    const resolved = resolveCategory(input);
    if (resolved.matchType === 'alias') legacyMapped++;
    if (resolved.matchType === 'fallback') fallback++;

    batch.update(doc.ref, {
      categoryId: resolved.categoryId,
      categoryName: resolved.categoryName,
      categoryGroupId: resolved.groupId,
      category: resolved.categoryName, // mantener legacy visible
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    updated++;
    ops++;

    if (ops >= 400) {
      await batch.commit();
      console.log(`✔️ Lote guardado (${updated} migrados hasta ahora)`);
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log('🏁 Migración completada');
  console.log(`Migrados: ${updated}`);
  console.log(`Mapeados por alias legacy: ${legacyMapped}`);
  console.log(`Enviados a fallback ("Otro"): ${fallback}`);
  console.log(`Saltados (ya migrados): ${skipped}`);
}

migrate().catch((error) => {
  console.error('❌ Error en migración:', error);
  process.exit(1);
});
