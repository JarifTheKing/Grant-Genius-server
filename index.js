// require("dotenv").config();
// const express = require("express");
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// const cors = require("cors");

// const app = express();
// const port = process.env.PORT || 3000;

// const admin = require("firebase-admin");
// const serviceAccount = require("./grant-genius-firebase-adminSDK.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// // Middleware
// app.use(express.json());
// app.use(
//   cors({
//     origin: ["http://localhost:5173"],
//     credentials: true,
//   })
// );

// // jwt middlewares
// // const verifyFBToken = async (req, res, next) => {
// //   console.log("headers in the middleware", req.headers.authorization);

// //   const token = req?.headers?.authorization?.split(" ")[1];
// //   console.log(token);
// //   if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
// //   try {
// //     const decoded = await admin.auth().verifyIdToken(token);
// //     req.tokenEmail = decoded.email;
// //     console.log(decoded);
// //     next();
// //   } catch (err) {
// //     console.log(err);
// //     return res.status(401).send({ message: "Unauthorized Access!", err });
// //   }
// // };

// const verifyFBToken = async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).send({ message: "Unauthorized Access!" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = await admin.auth().verifyIdToken(token);

//     req.decoded = decoded;
//     req.tokenEmail = decoded.email;

//     next();
//   } catch (err) {
//     return res.status(401).send({ message: "Unauthorized Access!" });
//   }
// };

// // MongoDB URI
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mkuqnbp.mongodb.net/?appName=Cluster0`;

// // Mongo Client
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     await client.connect();

//     const db = client.db("grant-geniusDB");
//     // Users collection
//     const usersCollection = db.collection("users");

//     // Scholarships collection
//     const scholarshipsCollection = db.collection("all-scholarship");

//     // Payments collection
//     const paymentsCollection = db.collection("payments");

//     // My-Applications collection
//     const myApplicationsCollection = db.collection("my-applications");

//     // -------------------------------------
//     //              USERS API
//     // -------------------------------------

//     // GET all users
//     // app.get("/users", async (req, res) => {
//     //   const result = await usersCollection.find().toArray();
//     //   res.send(result);
//     // });

//     app.get("/users", async (req, res) => {
//       const email = req.query.email;
//       const query = email ? { email } : {};
//       const result = await usersCollection.find(query).toArray();
//       res.json(result);
//     });

//     // GET single user by _id
//     app.get("/users/:id", async (req, res) => {
//       const id = req.params.id;

//       const result = await usersCollection.findOne({
//         _id: new ObjectId(id),
//       });

//       res.send(result);
//     });

//     // POST create user
//     app.post("/users", async (req, res) => {
//       const user = req.body;

//       const existingUser = await usersCollection.findOne({
//         email: user.email,
//       });

//       if (existingUser) {
//         return res.send({ message: "User already exists" });
//       }

//       user.role = "student";
//       user.createdAt = new Date();

//       const result = await usersCollection.insertOne(user);
//       res.send(result);
//     });

//     // PUT update user
//     app.put("/users/:id", async (req, res) => {
//       const id = req.params.id;
//       const data = req.body;

//       const result = await usersCollection.updateOne(
//         { _id: new ObjectId(id) },
//         { $set: data }
//       );

//       res.send(result);
//     });

//     // DELETE user
//     app.delete("/users/:id", async (req, res) => {
//       const id = req.params.id;

//       const result = await usersCollection.deleteOne({
//         _id: new ObjectId(id),
//       });

//       res.send(result);
//     });

//     // -------------------------------------
//     //     ALL SCHOLARSHIP CRUD (NEW)
//     // -------------------------------------

//     // GET all scholarships
//     // app.get("/all-scholarship", async (req, res) => {
//     //   const result = await scholarshipsCollection.find().toArray();
//     //   res.send(result);
//     // });

//     app.get("/all-scholarship", async (req, res) => {
//       const email = req.query.email;

//       let filter = {};

//       if (email) {
//         filter = { postedUserEmail: email }; // <-- match logged-in user
//       }

//       const result = await scholarshipsCollection.find(filter).toArray();
//       res.send(result);
//     });

//     // GET single scholarship
//     app.get("/all-scholarship/:id", async (req, res) => {
//       const id = req.params.id;
//       const result = await scholarshipsCollection.findOne({
//         _id: new ObjectId(id),
//       });
//       res.send(result);
//     });

//     // POST create scholarship
//     app.post("/all-scholarship", async (req, res) => {
//       const data = req.body;
//       const result = await scholarshipsCollection.insertOne(data);
//       res.send(result);
//     });

//     // PUT update scholarship
//     app.put("/all-scholarship/:id", async (req, res) => {
//       const id = req.params.id;
//       const data = req.body;

//       const result = await scholarshipsCollection.updateOne(
//         { _id: new ObjectId(id) },
//         { $set: data }
//       );

//       res.send(result);
//     });

//     // DELETE scholarship
//     app.delete("/all-scholarship/:id", async (req, res) => {
//       const id = req.params.id;

//       const result = await scholarshipsCollection.deleteOne({
//         _id: new ObjectId(id),
//       });

//       res.send(result);
//     });

//     // -------------------------------------
//     //     MY APPLICATIONS API
//     // -------------------------------------

//     // GET all applications
//     // app.get("/my-applications", async (req, res) => {
//     //   const email = req.query.email;

//     //   const query = email ? { userEmail: email } : {};

//     //   const result = await myApplicationsCollection.find(query).toArray();
//     //   res.json(result);
//     // });
//     // GET my applications by logged-in user
//     app.get("/my-applications", verifyFBToken, async (req, res) => {
//       const email = req.query.email;

//       if (email !== req.decoded.email) {
//         return res.status(403).send({ error: "Forbidden" });
//       }

//       const result = await myApplicationsCollection
//         .find({ userEmail: email })
//         .toArray();

//       res.send(result);
//     });

//     //  GET single application by ID
//     app.get("/my-applications/:id", async (req, res) => {
//       const id = req.params.id;

//       const result = await myApplicationsCollection.findOne({
//         _id: new ObjectId(id),
//       });

//       res.json(result);
//     });

//     //  POST create application
//     // app.post("/my-applications", async (req, res) => {
//     //   const application = req.body;

//     //   const newApplication = {
//     //     ...application,
//     //     applicationStatus: "pending",
//     //     paymentStatus: application.paymentStatus || "unpaid",
//     //     applicationDate: new Date(),
//     //   };

//     //   const result = await myApplicationsCollection.insertOne(newApplication);
//     //   res.json(result);
//     // });
//     app.post("/my-applications", async (req, res) => {
//       const application = {
//         ...req.body,
//         userEmail: req.body.userEmail, // ✅ REQUIRED
//         applicationStatus: "pending",
//         paymentStatus: req.body.applicationFees > 0 ? "unpaid" : "paid",
//         applicationDate: new Date(),
//       };

//       const result = await myApplicationsCollection.insertOne(application);
//       res.send(result);
//     });

//     //   update application
//     app.put("/my-applications/:id", async (req, res) => {
//       const id = req.params.id;
//       const data = req.body;

//       const result = await myApplicationsCollection.updateOne(
//         { _id: new ObjectId(id) },
//         { $set: data }
//       );

//       res.json(result);
//     });

//     // DELETE application
//     app.delete("/my-applications/:id", async (req, res) => {
//       const id = req.params.id;

//       const result = await myApplicationsCollection.deleteOne({
//         _id: new ObjectId(id),
//       });

//       res.json(result);
//     });

//     // -------------------------------------
//     //        PAYMENT HISTORY API
//     // -------------------------------------
//     // app.get("/payment-history", async (req, res) => {
//     //   try {
//     //     const email = req.query.email;

//     //     if (!email) {
//     //       return res.status(400).send({ error: "Email is required" });
//     //     }

//     //     const payments = await myApplicationsCollection
//     //       .find({
//     //         userEmail: email,
//     //         paymentStatus: "paid",
//     //       })
//     //       .sort({ applicationDate: -1 })
//     //       .toArray();

//     //     res.send(payments);
//     //   } catch (error) {
//     //     console.error("PAYMENT HISTORY SERVER ERROR:", error);
//     //     res.status(500).send({ error: "Failed to load payment history" });
//     //   }
//     // });
//     // app.get("/payment-history", async (req, res) => {
//     //   try {
//     //     const email = req.query.email;

//     //     console.log("headers", req.headers);

//     //     if (!email) {
//     //       return res.status(400).send({ error: "Email is required" });
//     //     }

//     //     const payments = await paymentsCollection
//     //       .find({ userEmail: email })
//     //       .sort({ paymentDate: -1 })
//     //       .toArray();

//     //     res.send(payments);
//     //   } catch (error) {
//     //     console.error("PAYMENT HISTORY SERVER ERROR:", error);
//     //     res.status(500).send({ error: "Failed to load payment history" });

//     //     console.log("headers", req.headers);
//     //   }
//     // });
//     app.get("/payment-history", verifyFBToken, async (req, res) => {
//       res.set("Cache-Control", "no-store");

//       const email = req.query.email;

//       // 1️⃣ email required
//       if (!email) {
//         return res.status(400).send({ error: "Email is required" });
//       }

//       // 2️⃣ email must match token email
//       if (email !== req.decoded.email) {
//         return res.status(403).send({ error: "Forbidden access" });
//       }

//       // 3️⃣ email must be verified
//       if (!req.decoded.email_verified) {
//         return res.status(403).send({
//           error: "Email is not verified",
//         });
//       }

//       const payments = await paymentsCollection
//         .find({ userEmail: email })
//         .sort({ paymentDate: -1 })
//         .toArray();

//       res.send(payments);
//     });

//     // MARK PAYMENT AS PAID
//     // app.patch("/payment-success/:id", async (req, res) => {
//     //   try {
//     //     const id = req.params.id;

//     //     const result = await myApplicationsCollection.updateOne(
//     //       { _id: new ObjectId(id) },
//     //       {
//     //         $set: {
//     //           paymentStatus: "paid",
//     //           applicationStatus: "processing",
//     //           paymentDate: new Date(),
//     //         },
//     //       }
//     //     );

//     //     if (result.matchedCount === 0) {
//     //       return res.status(404).send({ error: "Application not found" });
//     //     }

//     //     res.send({ success: true });
//     //   } catch (error) {
//     //     console.error("PAYMENT SUCCESS ERROR:", error);
//     //     res.status(500).send({ error: "Failed to update payment status" });
//     //   }
//     // });
//     app.patch("/payment-success/:id", async (req, res) => {
//       try {
//         const id = req.params.id;

//         if (!ObjectId.isValid(id)) {
//           return res.status(400).send({ error: "Invalid application ID" });
//         }

//         // 🔐 Check if already paid
//         const existingPayment = await paymentsCollection.findOne({
//           applicationId: id,
//         });

//         if (existingPayment) {
//           return res.send({ message: "Payment already processed" });
//         }

//         const application = await myApplicationsCollection.findOne({
//           _id: new ObjectId(id),
//         });

//         if (!application) {
//           return res.status(404).send({ error: "Application not found" });
//         }

//         const transactionId = `TXN-${Date.now()}-${id.slice(-6)}`;

//         const paymentDoc = {
//           applicationId: id,
//           userEmail: application.userEmail,
//           scholarshipName: application.scholarshipName,
//           universityName: application.universityName,
//           amount: application.applicationFees,
//           currency: "usd",
//           paymentMethod: "stripe",
//           transactionId,
//           paymentStatus: "paid",
//           paymentDate: new Date(),
//         };

//         await paymentsCollection.insertOne(paymentDoc);

//         await myApplicationsCollection.updateOne(
//           { _id: new ObjectId(id) },
//           {
//             $set: {
//               paymentStatus: "paid",
//               transactionId,
//               paymentDate: new Date(),
//             },
//           }
//         );

//         res.send({ success: true });
//       } catch (error) {
//         console.error("PAYMENT ERROR:", error);
//         res.status(500).send({ error: "Internal Server Error" });
//       }
//     });

//     // Payment --- API's
//     app.post("/create-checkout-session", async (req, res) => {
//       const { applicationId } = req.body;

//       const application = await myApplicationsCollection.findOne({
//         _id: new ObjectId(applicationId),
//       });

//       if (!application) {
//         return res.status(404).send({ error: "Application not found" });
//       }

//       if (application.paymentStatus === "paid") {
//         return res.send({ message: "Already paid" });
//       }

//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         mode: "payment",
//         customer_email: application.userEmail,
//         line_items: [
//           {
//             price_data: {
//               currency: "usd",
//               product_data: {
//                 name: application.scholarshipName,
//                 description: application.universityName,
//               },
//               unit_amount: application.applicationFees * 100,
//             },
//             quantity: 1,
//           },
//         ],

//         success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success/${applicationId}`,

//         cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel/${applicationId}`,

//         metadata: {
//           applicationId: applicationId,
//         },
//       });

//       res.send({ url: session.url });
//     });

//     // Ping test
//     await client.db("admin").command({ ping: 1 });
//     console.log("🔥 MongoDB Connected Successfully (Grant Genius)");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }

// run().catch(console.dir);

// app.get("/", (req, res) => {
//   res.send("Jarif! Grant is Genius!");
// });

// // Server Start
// app.listen(port, () => {
//   console.log(`🚀 Server running on port: ${port}`);
// });

require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

/* ================= FIREBASE ADMIN ================= */
const admin = require("firebase-admin");
const serviceAccount = require("./grant-genius-firebase-adminSDK.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

/* ================= FIREBASE TOKEN VERIFY ================= */
const verifyFBToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    req.tokenEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
};

/* ================= MONGODB ================= */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mkuqnbp.mongodb.net/?appName=Cluster0`;

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
    const scholarshipsCollection = db.collection("all-scholarship");
    const myApplicationsCollection = db.collection("my-applications");
    const paymentsCollection = db.collection("payments");
    const moderatorRequestsCollection = db.collection("moderator-requests");

    /* ================= USERS ================= */
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      res.send(await usersCollection.find(query).toArray());
    });

    app.get("/users/:id", async (req, res) => {
      res.send(
        await usersCollection.findOne({ _id: new ObjectId(req.params.id) })
      );
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const exists = await usersCollection.findOne({ email: user.email });
      if (exists) return res.send({ message: "User already exists" });

      user.role = "student";
      user.createdAt = new Date();
      res.send(await usersCollection.insertOne(user));
    });

    /* ================= MODERATOR REQUEST ================= */
    app.post("/moderator-request", verifyFBToken, async (req, res) => {
      if (req.decoded.email !== req.body.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const exists = await moderatorRequestsCollection.findOne({
        email: req.body.email,
      });

      if (exists) {
        return res
          .status(400)
          .send({ message: "Moderator request already submitted" });
      }

      res.send(
        await moderatorRequestsCollection.insertOne({
          ...req.body,
          status: "pending",
          requestDate: new Date(),
        })
      );
    });

    /* ================= SCHOLARSHIPS ================= */
    app.get("/all-scholarship", async (req, res) => {
      const email = req.query.email;
      const filter = email ? { postedUserEmail: email } : {};
      res.send(await scholarshipsCollection.find(filter).toArray());
    });

    app.get("/all-scholarship/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid scholarship ID" });
      }

      const scholarship = await scholarshipsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!scholarship) {
        return res.status(404).send({ error: "Scholarship not found" });
      }

      res.send(scholarship);
    });

    app.post("/all-scholarship", async (req, res) => {
      res.send(await scholarshipsCollection.insertOne(req.body));
    });

    app.delete("/all-scholarship/:id", async (req, res) => {
      res.send(
        await scholarshipsCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        })
      );
    });

    /* ================= APPLICATIONS ================= */
    app.get("/my-applications", verifyFBToken, async (req, res) => {
      if (req.query.email !== req.decoded.email) {
        return res.status(403).send({ error: "Forbidden" });
      }

      res.send(
        await myApplicationsCollection
          .find({ userEmail: req.query.email })
          .toArray()
      );
    });

    app.post("/my-applications", async (req, res) => {
      const application = {
        ...req.body,
        applicationStatus: "pending",
        paymentStatus: req.body.applicationFees > 0 ? "unpaid" : "paid",
        applicationDate: new Date(),
      };

      res.send(await myApplicationsCollection.insertOne(application));
    });

    /* ================= PAYMENT SUCCESS ================= */
    // app.patch("/payment-success/:id", verifyFBToken, async (req, res) => {
    //   const { id } = req.params;

    //   if (!ObjectId.isValid(id)) {
    //     return res.status(400).send({ message: "Invalid application ID" });
    //   }

    //   // 1️⃣ Find application
    //   const application = await myApplicationsCollection.findOne({
    //     _id: new ObjectId(id),
    //   });

    //   if (!application) {
    //     return res.status(404).send({ message: "Application not found" });
    //   }

    //   // 2️⃣ Security check
    //   if (application.userEmail !== req.decoded.email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   // 3️⃣ Update application payment status
    //   await myApplicationsCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: { paymentStatus: "paid" } }
    //   );

    //   // 4️⃣ Save payment history
    //   await paymentsCollection.insertOne({
    //     applicationId: id,
    //     userEmail: application.userEmail,
    //     scholarshipName: application.scholarshipName,
    //     amount: application.applicationFees,
    //     paymentDate: new Date(),
    //     status: "success",
    //   });

    //   res.send({ success: true });
    // });
    app.patch("/payment-success/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid application ID" });
      }

      const application = await myApplicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).send({ message: "Application not found" });
      }

      if (application.userEmail !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      // 🔒 STOP if already paid
      if (application.paymentStatus === "paid") {
        return res.send({ success: true, message: "Already processed" });
      }

      // 1️⃣ Mark application as paid
      await myApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } }
      );

      // 2️⃣ Check if payment already exists
      const existingPayment = await paymentsCollection.findOne({
        applicationId: id,
      });

      if (!existingPayment) {
        await paymentsCollection.insertOne({
          applicationId: id,
          userEmail: application.userEmail,
          scholarshipName: application.scholarshipName,
          amount: application.applicationFees,
          paymentDate: new Date(),
          status: "success",
        });
      }

      res.send({ success: true });
    });

    /* ================= STRIPE CHECKOUT (🔥 FIXED) ================= */
    app.post("/create-checkout-session", verifyFBToken, async (req, res) => {
      try {
        const { applicationId } = req.body;

        if (!ObjectId.isValid(applicationId)) {
          return res.status(400).send({ error: "Invalid application ID" });
        }

        const application = await myApplicationsCollection.findOne({
          _id: new ObjectId(applicationId),
        });

        if (!application) {
          return res.status(404).send({ error: "Application not found" });
        }

        if (application.userEmail !== req.decoded.email) {
          return res.status(403).send({ error: "Forbidden access" });
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
        });

        res.send({ url: session.url });
      } catch (error) {
        console.error("STRIPE ERROR:", error);
        res.status(500).send({ error: "Stripe session failed" });
      }
    });

    /* ================= PAYMENT HISTORY ================= */
    app.get("/payment-history", verifyFBToken, async (req, res) => {
      if (req.query.email !== req.decoded.email) {
        return res.status(403).send({ error: "Forbidden" });
      }

      res.send(
        await paymentsCollection
          .find({ userEmail: req.query.email })
          .sort({ paymentDate: -1 })
          .toArray()
      );
    });

    console.log("🔥 MongoDB Connected Successfully (Grant Genius)");
  } finally {
  }
}

run().catch(console.dir);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("Jarif! Grant is Genius!");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port: ${port}`);
});
