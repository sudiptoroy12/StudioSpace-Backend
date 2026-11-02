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