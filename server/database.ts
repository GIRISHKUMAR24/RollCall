import { MongoClient, Db, Collection } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://girishkumargundapu:1Fxm79M7ADeiVYtU@cluster0.tvttzmg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = process.env.DATABASE_NAME || "attendanceDB";

let client: MongoClient;
let db: Db;
let cachedDbPromise: Promise<Db> | null = null;

export interface User {
  _id?: any;
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "principal";
  createdAt: Date;
  rollNumber?: string; // For students
  branch?: string; // For students
  section?: string; // For students
  phone?: string; // For students
  teacherId?: string; // For teachers
  adminCode?: string; // For principals
}

export interface Settings {
  _id?: any;
  type: "classroom_location";
  classLatitude: number;
  classLongitude: number;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "principal";
}

export interface SignupResponse {
  message: string;
  collection: string;
  userId: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export async function connectToDatabase(retries = 3, delay = 5000): Promise<Db> {
  if (db) {
    return db;
  }

  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  cachedDbPromise = (async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 Connecting to MongoDB... (Attempt ${attempt}/${retries})`);
        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000, // Fail fast if blocked
          connectTimeoutMS: 10000,
        });

        await client.connect();
        console.log("✅ Connected to MongoDB Atlas");

        db = client.db(DATABASE_NAME);
        const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ":****@");
        console.log(`✅ Using database: ${DATABASE_NAME} at ${maskedUri}`);

        return db;
      } catch (error: any) {
        console.error(`❌ MongoDB Connection Failed (Attempt ${attempt}):`, error.message);

        if (error.message.includes("ETIMEDOUT") || error.message.includes("buffering timed out") || error.message.includes("Server selection timed out")) {
          console.warn("\n⚠️  POSSIBLE CAUSE: IP ADDRESS BLOCKED");
          console.warn("👉 Please go to MongoDB Atlas -> Network Access -> Add IP Address -> 'Allow Access from Anywhere' (0.0.0.0/0)");
          console.warn("👉 Or check your Firewall/VPN/Proxy settings.\n");
        }

        if (attempt === retries) {
          cachedDbPromise = null; // Clear cache on complete failure
          throw new Error(`Failed to connect to MongoDB after ${retries} attempts. Check your IP Whitelist on Atlas.`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    cachedDbPromise = null;
    throw new Error("MongoDB connection failed.");
  })();

  return cachedDbPromise;
}

export function getCollection(collectionName: string): Collection {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db.collection(collectionName);
}

export function getCollectionByRole(role: string): Collection {
  const collections = {
    student: "students",
    teacher: "teachers",
    principal: "principals",
  };

  const collectionName = collections[role as keyof typeof collections];
  if (!collectionName) {
    throw new Error(`Invalid role: ${role}`);
  }

  return getCollection(collectionName);
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    console.log("✅ MongoDB connection closed");
  }
}

export async function getSettings(): Promise<Settings | null> {
  const collection = getCollection("settings");
  const settings = await collection.findOne({ type: "classroom_location" });
  return settings as Settings | null;
}

export async function updateSettings(lat: number, lng: number): Promise<void> {
  const collection = getCollection("settings");
  await collection.updateOne(
    { type: "classroom_location" },
    {
      $set: {
        type: "classroom_location",
        classLatitude: lat,
        classLongitude: lng,
      },
    },
    { upsert: true }
  );
  console.log(`✅ Updated classroom location to ${lat}, ${lng}`);
}

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    await connectToDatabase();

    // Ensure collections exist and create indexes
    const collections = ["students", "teachers", "principals"];

    for (const collectionName of collections) {
      const collection = getCollection(collectionName);

      // Create unique index on email for each collection
      try {
        await collection.createIndex({ email: 1 }, { unique: true });
        console.log(
          `✅ Created unique index on email for ${collectionName} collection`,
        );
      } catch (error: any) {
        // Index might already exist, that's fine
        if (error.code !== 11000) {
          console.log(
            `���️  Index on email already exists for ${collectionName} collection`,
          );
        }
      }
    }

    // NOTE: classroom_location is no longer auto-initialized.
    // Location is captured dynamically per-session from teacher GPS.
    // See: POST /api/session/start

    console.log("✅ Database initialization complete");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}
