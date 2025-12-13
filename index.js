require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// var admin = require("firebase-admin");
// var serviceAccount = require("path/to/serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

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
    // Users collection
    const usersCollection = db.collection("users");

    // Scholarships collection
    const scholarshipsCollection = db.collection("all-scholarship");

    // My-Applications collection
    const myApplicationsCollection = db.collection("my-applications");

    // -------------------------------------
    //              USERS API
    // -------------------------------------

    // GET all users
    // app.get("/users", async (req, res) => {
    //   const result = await usersCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const result = await usersCollection.find(query).toArray();
      res.json(result);
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

    // -------------------------------------
    //     ALL SCHOLARSHIP CRUD (NEW)
    // -------------------------------------

    // GET all scholarships
    // app.get("/all-scholarship", async (req, res) => {
    //   const result = await scholarshipsCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/all-scholarship", async (req, res) => {
      const email = req.query.email;

      let filter = {};

      if (email) {
        filter = { postedUserEmail: email }; // <-- match logged-in user
      }

      const result = await scholarshipsCollection.find(filter).toArray();
      res.send(result);
    });

    // GET single scholarship
    app.get("/all-scholarship/:id", async (req, res) => {
      const id = req.params.id;
      const result = await scholarshipsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // POST create scholarship
    app.post("/all-scholarship", async (req, res) => {
      const data = req.body;
      const result = await scholarshipsCollection.insertOne(data);
      res.send(result);
    });

    // PUT update scholarship
    app.put("/all-scholarship/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const result = await scholarshipsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );

      res.send(result);
    });

    // DELETE scholarship
    app.delete("/all-scholarship/:id", async (req, res) => {
      const id = req.params.id;

      const result = await scholarshipsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // -------------------------------------
    //     MY APPLICATIONS API
    // -------------------------------------

    // GET all applications
    // app.get("/my-applications", async (req, res) => {
    //   const email = req.query.email;

    //   const query = email ? { userEmail: email } : {};

    //   const result = await myApplicationsCollection.find(query).toArray();
    //   res.json(result);
    // });
    // GET my applications by logged-in user
    app.get("/my-applications", async (req, res) => {
      const email = req.query.email;

      const query = email ? { userEmail: email } : {};
      const result = await myApplicationsCollection.find(query).toArray();

      res.send(result);
    });

    //  GET single application by ID
    app.get("/my-applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await myApplicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });

    //  POST create application
    // app.post("/my-applications", async (req, res) => {
    //   const application = req.body;

    //   const newApplication = {
    //     ...application,
    //     applicationStatus: "pending",
    //     paymentStatus: application.paymentStatus || "unpaid",
    //     applicationDate: new Date(),
    //   };

    //   const result = await myApplicationsCollection.insertOne(newApplication);
    //   res.json(result);
    // });
    app.post("/my-applications", async (req, res) => {
      const application = {
        ...req.body,
        userEmail: req.body.userEmail, // ✅ REQUIRED
        applicationStatus: "pending",
        paymentStatus: req.body.applicationFees > 0 ? "unpaid" : "paid",
        applicationDate: new Date(),
      };

      const result = await myApplicationsCollection.insertOne(application);
      res.send(result);
    });

    //   update application
    app.put("/my-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const result = await myApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );

      res.json(result);
    });

    // DELETE application
    app.delete("/my-applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await myApplicationsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.json(result);
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
