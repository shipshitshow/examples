import mongoose from 'mongoose';

// Serverless-safe MongoDB connection with Atlas connection caching.
// A single global promise is reused across warm invocations in the same container.

declare global {
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

function getMongoUri(): string {
  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');
  return uri;
}

export async function connectDb(): Promise<typeof mongoose> {
  // Return existing connection if already established
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return mongoose;

  if (!global._mongoosePromise) {
    mongoose.set('bufferCommands', false);
    global._mongoosePromise = mongoose
      .connect(getMongoUri(), {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      })
      .catch((err: unknown) => {
        global._mongoosePromise = undefined;
        throw err;
      });
  }

  return global._mongoosePromise;
}
