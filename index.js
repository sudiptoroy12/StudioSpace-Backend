import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { MongoClient } from 'mongodb'


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


const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  try { 
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
};

app.post('/studios', async (req, res) => {
    const studio = req.body;
    const result = await studiosCollection.insertOne(studio);
    res.send(result);
})

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