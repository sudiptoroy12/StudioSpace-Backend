import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import { createRemoteJWKSet, jwtVerify } from "jose";


const app = express()

const PORT = 8000

const client = new MongoClient(process.env.MONGODB_URI)

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.use(cors())
app.use(express.json())

const mongoClient = await connectToMongoDB()
const db = mongoClient.db('studiospace')
const studiosCollection = db.collection('studios')
const bookingsCollection = db.collection('bookings')

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please sign in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
// insert single studio
app.post("/studios", verifyToken, async (req, res) => {
  try {
    const {
      title,
      category,
      capacity,
      hourlyRate,
      deposit,
      location,
      imageUrl,
      amenities,
      description,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !category ||
      !location ||
      !description ||
      capacity == null ||
      hourlyRate == null ||
      deposit == null
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required studio details.",
      });
    }

    if (
      !Number.isFinite(Number(capacity)) ||
      Number(capacity) < 1 ||
      !Number.isFinite(Number(hourlyRate)) ||
      Number(hourlyRate) < 0 ||
      !Number.isFinite(Number(deposit)) ||
      Number(deposit) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid capacity and pricing values.",
      });
    }

    // These claims must be present in your verified JWT.
    const userId = req.user.sub;
    const hostEmail = req.user.email;
    const hostName = req.user.name;

    if (!userId || !hostEmail || !hostName) {
      return res.status(401).json({
        success: false,
        message:
          "Your authentication token is missing required user details.",
      });
    }

    const studio = {
      title: title.trim(),
      category,
      capacity: Number(capacity),
      hourlyRate: Number(hourlyRate),
      deposit: Number(deposit),
      location: location.trim(),
      imageUrl: imageUrl || "",
      amenities: Array.isArray(amenities) ? amenities : [],
      description: description.trim(),

      // The server determines the owner from the verified token.
      host: {
        userId,
        name: hostName,
        email: hostEmail,
      },

      createdAt: new Date(),
    };

    const result = await studiosCollection.insertOne(studio);

    return res.status(201).json({
      success: true,
      message: "Studio listing published successfully!",
      data: {
        _id: result.insertedId,
        ...studio,
      },
    });
  } catch (error) {
    console.error("Error creating studio:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create studio listing.",
    });
  }
});
// insert multiple studios
app.post("/studios", verifyToken, async (req, res) => {
  try {
    const { studios } = req.body;

    if (!Array.isArray(studios) || studios.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty studios array.",
      });
    }

    if (studios.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 studios allowed per request.",
      });
    }

    const { sub: userId, email, name } = req.user;

    if (!userId || !email || !name) {
      return res.status(401).json({
        success: false,
        message: "User information is missing from the token.",
      });
    }

    const validCategories = [
      "photo-studios",
      "sound-stages",
      "podcast-rooms",
      "music-suites",
      "art-workshops",
    ];

    const preparedStudios = studios.map((studio, index) => {
      if (
        !studio.title?.trim() ||
        !validCategories.includes(studio.category) ||
        !studio.location?.trim() ||
        !studio.description?.trim() ||
        studio.capacity == null ||
        studio.hourlyRate == null ||
        studio.deposit == null
      ) {
        throw new Error(
          `Invalid or missing required fields in studio at index ${index}.`,
        );
      }

      const capacity = Number(studio.capacity);
      const hourlyRate = Number(studio.hourlyRate);
      const deposit = Number(studio.deposit);

      if (
        !Number.isFinite(capacity) ||
        capacity < 1 ||
        !Number.isFinite(hourlyRate) ||
        hourlyRate < 0 ||
        !Number.isFinite(deposit) ||
        deposit < 0
      ) {
        throw new Error(`Invalid numeric values at studio index ${index}.`);
      }

      return {
        title: studio.title.trim(),
        category: studio.category,
        capacity,
        hourlyRate,
        deposit,
        location: studio.location.trim(),
        imageUrl: studio.imageUrl || "",
        amenities: Array.isArray(studio.amenities)
          ? studio.amenities
          : [],
        description: studio.description.trim(),
        host: {
          userId,
          name,
          email,
        },
        createdAt: new Date(),
      };
    });

    const result = await studiosCollection.insertMany(preparedStudios);

    return res.status(201).json({
      success: true,
      message: "Studios inserted successfully.",
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error("Bulk studio insertion failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to insert studios.",
    });
  }
});

app.get('/studios', async (req, res) => {
    const studios = await studiosCollection.find().toArray();
    res.send(studios);
})

app.get('/featured-studios', async (req, res) => {
    const featuredStudios = await studiosCollection.find().limit(6).toArray();
    res.send(featuredStudios);
})


app.get('/', (req, res) => {
    res.send({message: "Server is running successfully!!"})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})