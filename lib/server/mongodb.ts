import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

const globalCache = global.__mongooseConnection ?? {
  conn: null,
  promise: null,
};

if (!global.__mongooseConnection) {
  global.__mongooseConnection = globalCache;
}

export async function connectToMongo() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

export function getMongoConnectionMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("MONGODB_URI")) {
    return "Configura MONGODB_URI en produccion para habilitar el catalogo de productos.";
  }

  if (
    message.includes("Server selection timed out") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("Authentication failed") ||
    message.includes("bad auth") ||
    message.toLowerCase().includes("whitelist")
  ) {
    return "No se pudo conectar a MongoDB. Revisa MONGODB_URI, usuario, password y acceso de red del cluster.";
  }

  return "No pudimos conectar con el catalogo de productos.";
}
