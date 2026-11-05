import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import { createRemoteJWKSet, jwtVerify } from "jose";


const app = express()

const PORT = 8000



export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}


const allowedOrigins = [
  "http://localhost:3000",
  "https://studio-space-frontend-liard.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json())

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

const client = new MongoClient(mongoUri);

await client.connect();

console.log("Successfully connected to MongoDB!");

const db = client.db("studiospace");
const studiosCollection = db.collection("studios");
const bookingsCollection = db.collection("bookings");

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
// // insert multiple studios
// app.post("/studios", verifyToken, async (req, res) => {
//   try {
//     const { studios } = req.body;

//     if (!Array.isArray(studios) || studios.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide a non-empty studios array.",
//       });
//     }

//     if (studios.length > 100) {
//       return res.status(400).json({
//         success: false,
//         message: "Maximum 100 studios allowed per request.",
//       });
//     }

//     const { sub: userId, email, name } = req.user;

//     if (!userId || !email || !name) {
//       return res.status(401).json({
//         success: false,
//         message: "User information is missing from the token.",
//       });
//     }

//     const validCategories = [
//       "photo-studios",
//       "sound-stages",
//       "podcast-rooms",
//       "music-suites",
//       "art-workshops",
//     ];

//     const preparedStudios = studios.map((studio, index) => {
//       if (
//         !studio.title?.trim() ||
//         !validCategories.includes(studio.category) ||
//         !studio.location?.trim() ||
//         !studio.description?.trim() ||
//         studio.capacity == null ||
//         studio.hourlyRate == null ||
//         studio.deposit == null
//       ) {
//         throw new Error(
//           `Invalid or missing required fields in studio at index ${index}.`,
//         );
//       }

//       const capacity = Number(studio.capacity);
//       const hourlyRate = Number(studio.hourlyRate);
//       const deposit = Number(studio.deposit);

//       if (
//         !Number.isFinite(capacity) ||
//         capacity < 1 ||
//         !Number.isFinite(hourlyRate) ||
//         hourlyRate < 0 ||
//         !Number.isFinite(deposit) ||
//         deposit < 0
//       ) {
//         throw new Error(`Invalid numeric values at studio index ${index}.`);
//       }

//       return {
//         title: studio.title.trim(),
//         category: studio.category,
//         capacity,
//         hourlyRate,
//         deposit,
//         location: studio.location.trim(),
//         imageUrl: studio.imageUrl || "",
//         amenities: Array.isArray(studio.amenities)
//           ? studio.amenities
//           : [],
//         description: studio.description.trim(),
//         host: {
//           userId,
//           name,
//           email,
//         },
//         createdAt: new Date(),
//       };
//     });

//     const result = await studiosCollection.insertMany(preparedStudios);

//     return res.status(201).json({
//       success: true,
//       message: "Studios inserted successfully.",
//       insertedCount: result.insertedCount,
//       insertedIds: result.insertedIds,
//     });
//   } catch (error) {
//     console.error("Bulk studio insertion failed:", error);

//     return res.status(400).json({
//       success: false,
//       message: error.message || "Failed to insert studios.",
//     });
//   }
// });

app.get('/studios', async (req, res) => {
    const studios = await studiosCollection.find().toArray();
    res.send(studios);
})

app.get('/studios/:id', async (req, res) => {
    const { id } = req.params;
    const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });
    res.send(studio);
});


app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const { studioId, date, startTime, hours } = req.body;

    // 1. Validate required fields
    if (!studioId || !date || !startTime || hours === undefined) {
      return res.status(400).send({
        message: "Studio, date, start time, and duration are required.",
      });
    }

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).send({
        message: "Invalid studio ID.",
      });
    }

    // 2. Validate duration
    const bookingHours = Number(hours);

    if (
      !Number.isFinite(bookingHours) ||
      bookingHours <= 0 ||
      bookingHours > 8
    ) {
      return res.status(400).send({
        message: "Booking duration must be between 1 and 8 hours.",
      });
    }

    // 3. Validate start time
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (typeof startTime !== "string" || !timePattern.test(startTime)) {
      return res.status(400).send({
        message: "Invalid start time.",
      });
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);

    const requestedStart = startHour * 60 + startMinute;
    const requestedEnd = requestedStart + bookingHours * 60;

    if (requestedEnd >= 24 * 60) {
      return res.status(400).send({
        message: "Your booking must end before midnight.",
      });
    }

    const endTime = `${String(
      Math.floor(requestedEnd / 60)
    ).padStart(2, "0")}:${String(requestedEnd % 60).padStart(2, "0")}`;

    // 4. Find the studio
    const studio = await studiosCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).send({
        message: "Studio not found.",
      });
    }

    // 5. Check existing CONFIRMED bookings for this studio and date
    const confirmedBookings = await bookingsCollection
      .find({
        studioId: studio._id.toString(),
        date,
        status: "Confirmed",
      })
      .toArray();

    // 6. Check whether the requested time overlaps an existing booking
    const hasConflict = confirmedBookings.some((booking) => {
      if (!booking.startTime || !booking.endTime) {
        return false;
      }

      const [existingStartHour, existingStartMinute] =
        booking.startTime.split(":").map(Number);

      const [existingEndHour, existingEndMinute] =
        booking.endTime.split(":").map(Number);

      const existingStart =
        existingStartHour * 60 + existingStartMinute;

      const existingEnd =
        existingEndHour * 60 + existingEndMinute;

      // Two time intervals overlap when:
      // requestedStart < existingEnd AND requestedEnd > existingStart
      return (
        requestedStart < existingEnd &&
        requestedEnd > existingStart
      );
    });

    if (hasConflict) {
      return res.status(409).send({
        message:
          "This studio is already booked for part of your selected time. Please choose another time slot.",
      });
    }

    // 7. Calculate the price on the server
    const hourlyRate = Number(studio.hourlyRate);
    const deposit = Number(studio.deposit ?? 0);

    if (
      !Number.isFinite(hourlyRate) ||
      hourlyRate < 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0
    ) {
      return res.status(400).send({
        message: "The studio has invalid pricing information.",
      });
    }

    // 8. Create the booking only if no conflict exists
    const booking = {
      email: req.user.email,
      studioId: studio._id.toString(),
      studioTitle: studio.title,
      category: studio.category,
      imageUrl: studio.imageUrl,
      location: studio.location,
      date,
      startTime,
      endTime,
      hours: bookingHours,
      hourlyRate,
      deposit,
      total: hourlyRate * bookingHours + deposit,
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(booking);

    return res.status(201).send({
      message: "Booking created successfully.",
      data: {
        ...booking,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).send({
      message: "Failed to create booking.",
    });
  }
});

app.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const bookings = await bookingsCollection
      .find({ email: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).send(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);

    return res.status(500).send({
      message: "Failed to fetch bookings.",
    });
  }
});

app.patch("/bookings/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID.",
      });
    }

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        email: req.user.email,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).send({
        message:
          "This booking cannot be cancelled. It may not belong to you or may no longer be pending.",
      });
    }

    return res.status(200).send({
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).send({
      message: "Failed to cancel booking.",
    });
  }
});


app.get("/my-listings", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const studios = await studiosCollection
      .find({ "host.email": email })
      .sort({ createdAt: -1 })
      .toArray();


    res.status(200).send(studios);
  } catch (error) {
    console.error("Failed to fetch studio listings:", error);

    res.status(500).send({
      message: "Failed to fetch studio listings",
    });
  }
});

app.get("/studios/edit/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(id),
      "host.email": req.user.email,
    });

    if (!studio) {
      return res.status(404).send({
        message: "Studio not found or you do not own this studio",
      });
    }

    res.status(200).send(studio);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch studio",
    });
  }
});

app.patch("/studios/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    const existingStudio = await studiosCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingStudio) {
      return res.status(404).send({
        message: "Studio not found",
      });
    }

    if (existingStudio.host?.email !== req.user.email) {
      return res.status(403).send({
        message: "You cannot update another user's studio",
      });
    }

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

    const updatedFields = {
      title,
      category,
      capacity: Number(capacity),
      hourlyRate: Number(hourlyRate),
      deposit: Number(deposit),
      location,
      imageUrl,
      amenities,
      description,
    };

    if (
      !title ||
      !category ||
      !location ||
      !imageUrl ||
      !description ||
      !Array.isArray(amenities) ||
      !Number.isFinite(updatedFields.capacity) ||
      updatedFields.capacity < 1 ||
      !Number.isFinite(updatedFields.hourlyRate) ||
      updatedFields.hourlyRate < 0 ||
      !Number.isFinite(updatedFields.deposit) ||
      updatedFields.deposit < 0
    ) {
      return res.status(400).send({
        message: "Please provide valid studio information",
      });
    }

    const result = await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields }
    );

    res.status(200).send({
      message: "Studio updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Failed to update studio:", error);

    res.status(500).send({
      message: "Failed to update studio",
    });
  }
});


app.delete("/studios/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    const result = await studiosCollection.deleteOne({
      _id: new ObjectId(id),
      "host.email": req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Studio not found or you do not own this studio",
      });
    }

    res.status(200).send({
      message: "Studio deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete studio:", error);

    res.status(500).send({
      message: "Failed to delete studio",
    });
  }
});



app.get("/featured-studios", async (req, res) => {
  try {
    const featuredStudios = await studiosCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).send(featuredStudios);
  } catch (error) {
    console.error("Error fetching featured studios:", error);
    res.status(500).send({
      message: "Failed to fetch featured studios",
    });
  }
});



app.get('/', (req, res) => {
    res.send({message: "Server is running successfully!!"})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})


export default app;