require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const decoded = Buffer.from(process.env.GRANT_SERVICE_KEY, "base64").toString(
  "utf-8"
);

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
    // await client.connect();
    const db = client.db("grant-geniusDB");

    const usersCollection = db.collection("users");
    const scholarshipsCollection = db.collection("all-scholarship");
    const myApplicationsCollection = db.collection("my-applications");
    // const applicationsCollection = db.collection("applications");
    const paymentsCollection = db.collection("payments");
    const moderatorRequestsCollection = db.collection("moderator-requests");
    const moderatorsCollection = db.collection("moderators");
    const reviewsCollection = db.collection("reviews");

    /* =================  VERIFY ADMIN ================= */
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Admin access only" });
      }

      next();
    };

    /* =================  VERIFY MODERATOR ================= */

    const verifyModerator = async (req, res, next) => {
      const email = req.decoded.email;

      const user = await usersCollection.findOne({ email });

      if (user?.role !== "moderator" && user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      next();
    };

    /* ================= ADMIN-STATS ================= */
    app.get("/admin-stats", verifyFBToken, verifyAdmin, async (req, res) => {
      try {
        const usersCount = await usersCollection.countDocuments();
        const scholarshipsCount = await scholarshipsCollection.countDocuments();
        const applicationsCount =
          await myApplicationsCollection.countDocuments();

        const payments = await paymentsCollection.find().toArray();
        const totalRevenue = payments.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );

        res.send({
          users: usersCount,
          scholarships: scholarshipsCount,
          applications: applicationsCount,
          revenue: totalRevenue,
        });
      } catch (error) {
        console.error("ADMIN STATS ERROR:", error);
        res.status(500).send({ message: "Failed to load admin stats" });
      }
    });

    app.get(
      "/applications-by-category",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const result = await myApplicationsCollection
          .aggregate([
            {
              $match: {
                category: { $exists: true, $ne: "Unknown" },
              },
            },
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                count: 1,
              },
            },
            { $sort: { count: -1 } },
          ])
          .toArray();

        res.send(result);
      }
    );

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

    // UPDATE USER PROFILE
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const { name, photoURL } = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            photoURL,
          },
        }
      );

      res.send(result);
    });

    app.delete("/users/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid user ID" });
      }

      const result = await usersCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ success: true });
    });

    app.patch("/users/role/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).send({ message: "Role is required" });
      }

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ success: true });
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

    app.get(
      "/moderator-requests/status/:status",
      verifyFBToken,
      async (req, res) => {
        const { status } = req.params;
        const result = await moderatorRequestsCollection
          .find({ status })
          .toArray();
        res.send(result);
      }
    );

    app.patch(
      "/moderator-requests/approve/:id",
      verifyFBToken,
      async (req, res) => {
        const { id } = req.params;

        // 1️⃣ Find request
        const request = await moderatorRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!request) {
          return res.status(404).send({ message: "Request not found" });
        }

        // 2️⃣ Prevent double approve
        if (request.status === "approved") {
          return res.send({ message: "Already approved" });
        }

        // 3️⃣ Insert into moderators collection
        await moderatorsCollection.insertOne({
          name: request.name,
          email: request.email,
          experience: request.experience,
          availability: request.availability,
          role: "moderator",
          approvedAt: new Date(),
        });

        // 4️⃣ Update request status
        await moderatorRequestsCollection.updateOne(
          { _id: request._id },
          { $set: { status: "approved" } }
        );

        // 5️⃣ Update user role
        await usersCollection.updateOne(
          { email: request.email },
          { $set: { role: "moderator" } }
        );

        res.send({ message: "Moderator approved successfully" });
      }
    );

    app.patch(
      "/moderator-requests/reject/:id",
      verifyFBToken,
      async (req, res) => {
        await moderatorRequestsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { status: "rejected" } }
        );

        res.send({ message: "Request rejected" });
      }
    );

    /* ================= MODERATORS ================= */
    // app.post("/moderators", async (req, res) => {
    //   try {
    //     const moderator = req.body;
    //     const result = await moderatorsCollection.insertOne({
    //       ...moderator,
    //       createdAt: new Date(),
    //     });
    //     res.status(201).send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to create moderator" });
    //   }
    // });

    app.post("/moderators", async (req, res) => {
      try {
        const moderator = req.body;

        const exists = await moderatorsCollection.findOne({
          email: moderator.email,
        });

        if (exists) {
          return res.status(409).send({
            message: "Moderator request already exists",
          });
        }

        const result = await moderatorsCollection.insertOne({
          ...moderator,
          status: "pending",
          createdAt: new Date(),
        });

        res.status(201).send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to create moderator" });
      }
    });

    // app.get("/moderators", async (req, res) => {
    //   try {
    //     const result = await moderatorsCollection.find().toArray();
    //     res.send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to fetch moderators" });
    //   }
    // });

    app.get("/moderators/status/:status", async (req, res) => {
      try {
        const { status } = req.params;

        const result = await moderatorsCollection.find({ status }).toArray();

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch moderators by status" });
      }
    });

    app.get("/moderators/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await moderatorsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).send({ error: "Moderator not found" });
        }

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch moderator" });
      }
    });

    // app.patch("/moderators/:id", async (req, res) => {
    //   try {
    //     const { id } = req.params;
    //     const updatedData = req.body;

    //     const result = await moderatorsCollection.updateOne(
    //       { _id: new ObjectId(id) },
    //       {
    //         $set: {
    //           ...updatedData,
    //           updatedAt: new Date(),
    //         },
    //       }
    //     );

    //     if (result.matchedCount === 0) {
    //       return res.status(404).send({ error: "Moderator not found" });
    //     }

    //     res.send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to update moderator" });
    //   }
    // });
    // app.patch("/moderators/approve/:id", async (req, res) => {
    //   try {
    //     const { id } = req.params;

    //     const result = await moderatorsCollection.updateOne(
    //       { _id: new ObjectId(id) },
    //       {
    //         $set: {
    //           status: "approved",
    //           approvedAt: new Date(),
    //         },
    //       }
    //     );

    //     if (result.matchedCount === 0) {
    //       return res.status(404).send({ error: "Moderator not found" });
    //     }

    //     res.send({ message: "Moderator approved" });
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to approve moderator" });
    //   }
    // });
    app.patch("/moderators/approve/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await moderatorsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "approved",
              approvedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Moderator not found" });
        }

        res.send({ message: "Moderator approved successfully" });
      } catch (err) {
        res.status(500).send({ error: "Failed to approve moderator" });
      }
    });

    app.delete("/moderators/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await moderatorsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Moderator not found" });
        }

        res.send({ message: "Moderator deleted successfully" });
      } catch (err) {
        res.status(500).send({ error: "Failed to delete moderator" });
      }
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

    app.put("/all-scholarship/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid scholarship ID" });
      }

      const updatedScholarship = req.body;

      const result = await scholarshipsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedScholarship }
      );

      res.send(result);
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

    // app.post("/my-applications", async (req, res) => {
    //   const application = {
    //     ...req.body,
    //     applicationStatus: "pending",
    //     paymentStatus: req.body.applicationFees > 0 ? "unpaid" : "paid",
    //     applicationDate: new Date(),
    //   };

    //   res.send(await myApplicationsCollection.insertOne(application));
    // });

    app.post("/my-applications", async (req, res) => {
      const application = {
        ...req.body,

        // ✅ ONE consistent field
        category: req.body.category || req.body.subjectCategory || "Unknown",

        applicationStatus: "pending",
        paymentStatus: req.body.applicationFees > 0 ? "unpaid" : "paid",
        applicationDate: new Date(),
      };

      const result = await myApplicationsCollection.insertOne(application);
      res.send(result);
    });

    /* ================= applications-details ================= */

    // 🔐 MODERATOR / ADMIN – GET ALL APPLICATIONS
    app.get(
      "/applications",
      verifyFBToken,
      verifyModerator,
      async (req, res) => {
        const applications = await myApplicationsCollection
          .find()
          .sort({ applicationDate: -1 })
          .toArray();

        res.send(applications);
      }
    );

    app.get("/applications/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;

      const application = await myApplicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).send({ message: "Not found" });
      }

      if (application.userEmail !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden" });
      }

      res.send(application);
    });

    app.get(
      "/applications/moderator/:id",
      verifyFBToken,
      verifyModerator,
      async (req, res) => {
        const appData = await myApplicationsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(appData);
      }
    );

    app.patch("/applications/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;

      const update = {
        $set: {
          applicationStatus: req.body.applicationStatus,
          feedback: req.body.feedback,
        },
      };

      const result = await myApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        update
      );

      res.send(result);
    });
    app.patch(
      "/applications/:id",
      verifyFBToken,
      verifyModerator,
      async (req, res) => {
        const { applicationStatus, feedback } = req.body;

        const result = await myApplicationsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $set: {
              applicationStatus,
              feedback,
              reviewedAt: new Date(),
            },
          }
        );

        res.send(result);
      }
    );

    /* ================= REVIEWS ================= */
    app.get("/reviews/public", async (req, res) => {
      const { scholarshipId } = req.query;
      const reviews = await reviewsCollection
        .find({ scholarshipId })
        .sort({ reviewDate: -1 })
        .toArray();
      res.send(reviews);
    });

    // app.post("/reviews", verifyFBToken, async (req, res) => {
    //   try {
    //     const {
    //       applicationId,
    //       scholarshipId,
    //       userEmail,
    //       ratingPoint,
    //       reviewComment,
    //     } = req.body;

    //     // 🔒 Email security
    //     if (userEmail !== req.decoded.email) {
    //       return res.status(403).send({ message: "Forbidden" });
    //     }

    //     // 🔍 Find application
    //     const application = await applicationsCollection.findOne({
    //       _id: new ObjectId(applicationId),
    //       userEmail,
    //     });

    //     if (!application) {
    //       return res.status(404).send({ message: "Application not found" });
    //     }

    //     // ❌ Review permission check
    //     if (
    //       application.applicationStatus !== "approved" ||
    //       (application.applicationFees > 0 &&
    //         application.paymentStatus !== "paid")
    //     ) {
    //       return res.status(403).send({ message: "Not allowed to review" });
    //     }

    //     // 🚫 Prevent duplicate review
    //     const alreadyReviewed = await reviewsCollection.findOne({
    //       applicationId,
    //       userEmail,
    //     });

    //     if (alreadyReviewed) {
    //       return res.status(409).send({ message: "Review already submitted" });
    //     }

    //     // ✅ Create review object
    //     const reviewDoc = {
    //       applicationId,
    //       scholarshipId,
    //       userEmail,
    //       userName: application.userName,
    //       userImage: application.userImage,
    //       universityName: application.universityName,
    //       ratingPoint,
    //       reviewComment,
    //       reviewDate: new Date(),
    //     };

    //     const result = await reviewsCollection.insertOne(reviewDoc);

    //     res.send(result);
    //   } catch (error) {
    //     console.error("REVIEW ERROR:", error);
    //     res.status(500).send({ message: "Failed to add review" });
    //   }
    // });
    app.post("/reviews", verifyFBToken, async (req, res) => {
      try {
        const {
          applicationId,
          scholarshipId,
          userEmail,
          ratingPoint,
          reviewComment,
        } = req.body;

        if (userEmail !== req.decoded.email) {
          return res.status(403).send({ message: "Forbidden" });
        }

        const application = await myApplicationsCollection.findOne({
          _id: new ObjectId(applicationId),
          userEmail,
        });

        if (!application) {
          return res.status(404).send({ message: "Application not found" });
        }

        if (
          application.applicationStatus !== "approved" ||
          (application.applicationFees > 0 &&
            application.paymentStatus !== "paid")
        ) {
          return res.status(403).send({ message: "Not allowed to review" });
        }

        const alreadyReviewed = await reviewsCollection.findOne({
          applicationId,
          userEmail,
        });

        if (alreadyReviewed) {
          return res.status(409).send({ message: "Review already submitted" });
        }

        const reviewDoc = {
          applicationId,
          scholarshipId,
          userEmail,
          userName: application.userName,
          userImage: application.userImage,
          universityName: application.universityName,
          ratingPoint,
          reviewComment,
          reviewDate: new Date(),
        };

        const result = await reviewsCollection.insertOne(reviewDoc);
        res.send(result);
      } catch (error) {
        console.error("REVIEW ERROR:", error);
        res.status(500).send({ message: "Failed to add review" });
      }
    });

    app.delete(
      "/reviews/:id",
      verifyFBToken,
      verifyModerator,
      async (req, res) => {
        const id = req.params.id;

        const result = await reviewsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      }
    );

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
    // app.patch("/payment-success/:id", verifyFBToken, async (req, res) => {
    //   const { id } = req.params;

    //   if (!ObjectId.isValid(id)) {
    //     return res.status(400).send({ message: "Invalid application ID" });
    //   }

    //   const application = await myApplicationsCollection.findOne({
    //     _id: new ObjectId(id),
    //   });

    //   if (!application) {
    //     return res.status(404).send({ message: "Application not found" });
    //   }

    //   if (application.userEmail !== req.decoded.email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   // 🔒 STOP if already paid
    //   if (application.paymentStatus === "paid") {
    //     return res.send({ success: true, message: "Already processed" });
    //   }

    //   // 1️⃣ Mark application as paid
    //   await myApplicationsCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: { paymentStatus: "paid" } }
    //   );

    //   // 2️⃣ Check if payment already exists
    //   const existingPayment = await paymentsCollection.findOne({
    //     applicationId: id,
    //   });

    //   if (!existingPayment) {
    //     await paymentsCollection.insertOne({
    //       applicationId: id,
    //       userEmail: application.userEmail,
    //       scholarshipName: application.scholarshipName,
    //       amount: application.applicationFees,
    //       paymentDate: new Date(),
    //       status: "success",
    //     });
    //   }

    //   res.send({ success: true });
    // });

    // app.patch("/payment-success/:id", verifyFBToken, async (req, res) => {
    //   const { id } = req.params;
    //   const { transactionId } = req.body; // 👈 get from frontend

    //   const application = await myApplicationsCollection.findOne({
    //     _id: new ObjectId(id),
    //   });

    //   if (!application) {
    //     return res.status(404).send({ message: "Application not found" });
    //   }

    //   if (application.userEmail !== req.decoded.email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   if (application.paymentStatus === "paid") {
    //     return res.send({ success: true });
    //   }

    //   // 1️⃣ Mark paid
    //   await myApplicationsCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: { paymentStatus: "paid" } }
    //   );

    //   // 2️⃣ Save payment WITH transactionId
    //   await paymentsCollection.insertOne({
    //     applicationId: id,
    //     userEmail: application.userEmail,
    //     scholarshipName: application.scholarshipName,
    //     universityName: application.universityName,
    //     amount: application.applicationFees,
    //     paymentDate: new Date(),

    //     // ✅ THIS FIXES YOUR ISSUE
    //     transactionId: transactionId || "N/A",

    //     status: "success",
    //   });

    //   res.send({ success: true });
    // });
    app.patch("/payment-success/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;

      const application = await myApplicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).send({ message: "Application not found" });
      }

      if (application.userEmail !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      if (application.paymentStatus === "paid") {
        return res.send({ success: true });
      }

      // ✅ Generate transaction ID HERE
      const transactionId = `TXN-${Date.now()}-${id.slice(-6)}`;

      await myApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } }
      );

      await paymentsCollection.insertOne({
        applicationId: id,
        userEmail: application.userEmail,
        scholarshipName: application.scholarshipName,
        universityName: application.universityName,
        amount: application.applicationFees,
        paymentDate: new Date(),
        paymentMethod: "stripe",
        currency: "usd",

        // ✅ GUARANTEED VALUE
        transactionId,

        paymentStatus: "paid",
      });

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
    // app.get("/payment-history", verifyFBToken, async (req, res) => {
    //   if (req.query.email !== req.decoded.email) {
    //     return res.status(403).send({ error: "Forbidden" });
    //   }

    //   res.send(
    //     await paymentsCollection
    //       .find({ userEmail: req.query.email })
    //       .sort({ paymentDate: -1 })
    //       .toArray()
    //   );
    // });
    app.get("/payment-history", verifyFBToken, async (req, res) => {
      if (req.query.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden" });
      }

      const payments = await paymentsCollection
        .find({ userEmail: req.query.email })
        .sort({ paymentDate: -1 })
        .toArray();

      res.send(payments);
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
