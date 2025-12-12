require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mkuqnbp.mongodb.net/?appName=Cluster0`;

// Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("grant-geniusDB");
    const usersCollection = db.collection("users");

    // -------------------------------------
    //              USERS API
    // -------------------------------------

    // GET all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // GET single user by _id
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;

      const result = await usersCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // POST create user
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // PUT update user
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );

      res.send(result);
    });

    // DELETE user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;

      const result = await usersCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Ping test
    await client.db("admin").command({ ping: 1 });
    console.log("🔥 MongoDB Connected Successfully (Grant Genius)");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Jarif! Grant is Genius!");
});

// Server Start
app.listen(port, () => {
  console.log(`🚀 Server running on port: ${port}`);
});
