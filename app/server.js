const path = require("path");
const Koa = require("koa");
const serve = require("koa-static");
const Router = require("@koa/router");
const multer = require("@koa/multer");
const cors = require("@koa/cors");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const { MongoClient, ServerApiVersion } = require("mongodb");
// Replace your MongoDB URI Here
const uri =
  ""; 
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let database;
client.connect((err) => {
  if (err) {
    console.error("Failed to connect to the database.");
  } else {
    console.log("Connected to MongoDB Atlas.");
    database = client.db("SciDex");
  }
});

const app = new Koa();
app.use(bodyParser());

app.use(serve(path.join(__dirname, "./")));

const router = new Router();

const PORT = 3000;

const UPLOAD_DIR = path.join(__dirname, "/uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Write request data in database
/**
router.post('/HIP', async (ctx) => {
  const data = ctx.request.body;
  console.log(data);
  
  ctx.body = 'Data received successfully!';
  fs.readFile('db.json', function (err, content) {
    var json = JSON.parse(content)
    json.push(data)
    fs.writeFile("db.json", JSON.stringify(json), 'utf8', function(error) {
    
      console.log('Hello');
     });
    
})
  
});
*/

router.post("/HIP", async (ctx) => {
  let data = ctx.request.body;
  console.log(data);

  // Add score field to the data
  data.score = 0;

  try {
    const collection = database.collection("manuscripts");
    await collection.insertOne(data);
    ctx.body = "Data received successfully!";
    console.log("Data written to MongoDB");
  } catch (error) {
    console.error("Error writing data to MongoDB:", error);
    ctx.status = 500;
    ctx.body = "Error writing data to MongoDB";
  }
});

router.delete("/HIP/:id", async (ctx) => {
  const id = ctx.params.id;
  console.log(`Deleting record with id: ${id}`);

  try {
    const collection = database.collection("manuscripts");
    const result = await collection.deleteOne({ id: parseInt(id) });

    if (result.deletedCount > 0) {
      ctx.body = "Record deleted successfully!";
      console.log("Record deleted from MongoDB");
    } else {
      ctx.status = 404;
      ctx.body = "Record not found";
      console.log("Record not found in MongoDB");
    }
  } catch (error) {
    console.error("Error deleting data from MongoDB:", error);
    ctx.status = 500;
    ctx.body = "Error deleting data from MongoDB";
  }
});

router.post("/REVIEW", async (ctx) => {
  const data = ctx.request.body;
  console.log(data);

  try {
    const collection = database.collection("reviews");
    await collection.insertOne(data);
    ctx.body = "Data received successfully!";
    console.log("Data written to MongoDB");
  } catch (error) {
    console.error("Error writing data to MongoDB:", error);
    ctx.status = 500;
    ctx.body = "Error writing data to MongoDB";
  }
});

//Deleting a review
router.delete("/REVIEW/:id/:responseNum", async (ctx) => {
  const id = ctx.params.id;
  const responseNum = ctx.params.responseNum;
  console.log(`Deleting review with id: ${id}, responseNum: ${responseNum}`);

  try {
    const collection = database.collection("reviews");
    const result = await collection.deleteOne({
      id: parseInt(id),
      responseNum: parseInt(responseNum),
    });

    if (result.deletedCount > 0) {
      ctx.body = "Review deleted successfully!";
      console.log("Review deleted from MongoDB");
    } else {
      ctx.status = 404;
      ctx.body = "Review not found";
      console.log("Review not found in MongoDB");
    }
  } catch (error) {
    console.error("Error deleting review from MongoDB:", error);
    ctx.status = 500;
    ctx.body = "Error deleting review from MongoDB";
  }
});

//Increment numReviews for a paper
router.put("/HIP/incrementNumReviews", async (ctx) => {
  const data = ctx.request.body;
  console.log(data);
  console.log(`Incrementing reviews for id: ${data.id}`); // Log the id to check if it's correct

  try {
    const collection = database.collection("manuscripts");
    const filter = { id: data.id };

    const document = await collection.findOne(filter);

    if (!document) {
      console.warn("No document found with the specified id");
      ctx.status = 404;
      ctx.body = "No document found with the specified id";
    } else {
      const numReviews = parseInt(document.numReviews, 10) || 0;
      const updatedNumReviews = numReviews + 1;

      const update = { $set: { numReviews: updatedNumReviews.toString() } };
      await collection.updateOne(filter, update);

      ctx.body = "Number of reviews incremented successfully!";
      console.log("Number of reviews incremented");
    }
  } catch (error) {
    console.error("Error incrementing number of reviews:", error);
    ctx.status = 500;
    ctx.body = "Error incrementing number of reviews";
  }
});

// Increment the reviewer's reviews count for an Ethereum address
router.get("/HIP/getReviewerCount/:address", async (ctx) => {
  const address = ctx.params.address;

  try {
    const collection = database.collection("reviewers");
    const filter = { address: address };
    const projection = { _id: 0, reviewCount: 1 }; // Only return the reviewCount field
    const result = await collection.findOne(filter, { projection });

    if (result) {
      ctx.body = result;
      console.log("Reviewer count fetched:", result.reviewCount);
    } else {
      ctx.body = { reviewCount: "0" }; // Return reviewCount as a string, similar to the database
      console.log("No reviews found for the given address");
    }
  } catch (error) {
    console.error("Error fetching reviewer count:", error);
    ctx.status = 500;
    ctx.body = "Error fetching reviewer count";
  }
});

// Get the number of reviews for an Ethereum address
router.put("/HIP/incrementReviewerCount", async (ctx) => {
  const data = ctx.request.body;
  console.log(data);

  try {
    const collection = database.collection("reviewers");
    const filter = { address: data.address };

    const document = await collection.findOne(filter);

    if (!document) {
      const newDocument = { address: data.address, reviewCount: "1" };
      await collection.insertOne(newDocument);
      ctx.body =
        "Reviewer count incremented successfully! (New document created)";
    } else {
      const reviewCount = parseInt(document.reviewCount, 10) || 0;
      const updatedReviewCount = reviewCount + 1;
      const update = { $set: { reviewCount: updatedReviewCount.toString() } };
      await collection.updateOne(filter, update);

      ctx.body = "Reviewer count incremented successfully!";
    }

    console.log("Reviewer count incremented");
  } catch (error) {
    console.error("Error incrementing reviewer count:", error);
    ctx.status = 500;
    ctx.body = "Error incrementing reviewer count";
  }
});

//Send HIP to frontend
router.post("/getMyJSON", async (ctx) => {
  try {
    const collection = database.collection("manuscripts");
    const data = await collection.find().toArray();
    ctx.body = data;
  } catch (error) {
    console.error("Error getting data from MongoDB:", error);
    ctx.status = 500;
    ctx.body = "Error getting data from MongoDB";
  }
});

router.get("/reviews/:id", async (ctx) => {
  const id = ctx.params.id;

  try {
    const manuscriptCollection = database.collection("manuscripts");
    const manuscriptDoc = await manuscriptCollection.findOne({
      id: parseInt(id),
    });
    console.log(id);
    if (!manuscriptDoc) {
      ctx.status = 404;
      ctx.body = { error: "Document not found in the collection." };
      return;
    }

    const numReviews = manuscriptDoc.numReviews;
    const reviewsCollection = database.collection("reviews");

    const reviews = await reviewsCollection
      .find({ id: parseInt(id) })
      .limit(parseInt(numReviews))
      .toArray();
    console.log("Fetched reviews:", reviews);

    ctx.status = 200;
    ctx.body = reviews;
  } catch (error) {
    console.error(error);
    ctx.status = 500;
    ctx.body = { error: "An error occurred while fetching reviews." };
  }
});

// Getting the number of HIPs in the database
router.get("/HIP/getLatestId", async (ctx) => {
  try {
    const collection = database.collection("manuscripts");

    const latestDocument = await collection
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    if (latestDocument.length === 0) {
      ctx.body = "0";
    } else {
      ctx.body = (parseInt(latestDocument[0].id, 10) + 1).toString();
    }
  } catch (error) {
    console.error("Error fetching the latest document id:", error);
    ctx.status = 500;
    ctx.body = "Error fetching the latest document id";
  }
});

// Route to vote
router.post("/vote", async (ctx) => {
  const { id, ethereumAddress, vote } = ctx.request.body;

  try {
    const voteCollection = database.collection("votes");
    const filter = { id: id, ethereumAddress: ethereumAddress };

    // Find the existing vote
    let existingVoteDocument = await voteCollection.findOne(filter);
    let existingVote = existingVoteDocument
      ? parseInt(existingVoteDocument.vote)
      : 0;

    // If the new vote is the same as the existing vote, do nothing
    if (vote === existingVote) {
      ctx.body = "Vote already recorded!";
      return;
    }

    const update = { $set: { vote: vote } };
    const options = { upsert: true }; // update the document if it exists, insert a new document if it does not

    // Update the vote document
    await voteCollection.updateOne(filter, update, options);

    // Also update the score in the 'manuscripts' collection
    const manuscriptCollection = database.collection("manuscripts");
    const manuscriptDocument = await manuscriptCollection.findOne({
      id: parseInt(id),
    });
    let score = manuscriptDocument ? parseInt(manuscriptDocument.score) : 0;

    // If there was an existing vote, undo it
    if (existingVote !== 0) {
      score -= existingVote;
    }

    // Apply the new vote
    score += parseInt(vote);

    const scoreUpdate = { $set: { score: score } };

    await manuscriptCollection.updateOne(
      { id: parseInt(id) },
      scoreUpdate,
      options
    );

    ctx.body = "Vote recorded successfully!";
  } catch (error) {
    console.error("Error recording vote:", error);
    ctx.status = 500;
    ctx.body = "Error recording vote";
  }
});

// Route to get votes by ethereum address
router.get("/votes/:ethereumAddress", async (ctx) => {
  const { ethereumAddress } = ctx.params;

  try {
    const voteCollection = database.collection("votes");

    // Find all votes by this ethereum address
    const votes = await voteCollection
      .find({ ethereumAddress: ethereumAddress })
      .toArray();

    ctx.body = votes;
  } catch (error) {
    console.error("Error getting votes:", error);
    ctx.status = 500;
    ctx.body = "Error getting votes";
  }
});

// Route for uploading single files
router.post("/upload-single-file", upload.single("file"), (ctx) => {
  ctx.body = {
    message: `file ${ctx.request.file.filename} was saved on the server`,
    url: `http://localhost:${PORT}/${ctx.request.file.originalname}`,
  };
});

app.use(cors());
app.use(router.routes()).use(router.allowedMethods());
app.use(serve(UPLOAD_DIR));

(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas.");
    database = client.db("SciDex");

    app.listen(PORT, () => {
      console.log(`Server starting at port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to the database:", err);
  }
})();
