require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

    // Payments collection
    const paymentsCollection = db.collection("payments");

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

    // -------------------------------------
    //        PAYMENT HISTORY API
    // -------------------------------------
    app.get("/payment-history", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const payments = await myApplicationsCollection
          .find({
            userEmail: email,
            paymentStatus: "paid",
          })
          .sort({ applicationDate: -1 })
          .toArray();

        res.send(payments);
      } catch (error) {
        console.error("PAYMENT HISTORY SERVER ERROR:", error);
        res.status(500).send({ error: "Failed to load payment history" });
      }
    });

    // MARK PAYMENT AS PAID
    app.patch("/payment-success/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await myApplicationsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              paymentStatus: "paid",
              applicationStatus: "processing",
              paymentDate: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Application not found" });
        }

        res.send({ success: true });
      } catch (error) {
        console.error("PAYMENT SUCCESS ERROR:", error);
        res.status(500).send({ error: "Failed to update payment status" });
      }
    });

    // Payment --- API's
    app.post("/create-checkout-session", async (req, res) => {
      const { applicationId } = req.body;

      const application = await myApplicationsCollection.findOne({
        _id: new ObjectId(applicationId),
      });

      if (!application) {
        return res.status(404).send({ error: "Application not found" });
      }

      if (application.paymentStatus === "paid") {
        return res.send({ message: "Already paid" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: application.userEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: application.scholarshipName,
                description: application.universityName,
              },
              unit_amount: application.applicationFees * 100,
            },
            quantity: 1,
          },
        ],

        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success/${applicationId}`,

        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel/${applicationId}`,

        metadata: {
          applicationId: applicationId,
        },
      });

      res.send({ url: session.url });
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
