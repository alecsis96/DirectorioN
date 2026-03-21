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
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
