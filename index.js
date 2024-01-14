const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();

// middlewares
app.use(cors());
app.use(express.json());

// Verify JWT Token Middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }

    req.decoded = decoded;
    next();
  });
};

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASS}@cluster0.5732rtt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const ubJewellersDB = client.db("ubJewellersDB");
    const productCollection = ubJewellersDB.collection("products");
    const reviewCollection = ubJewellersDB.collection("reviews");
    const navNotificationCollection =
      ubJewellersDB.collection("navNotifications");
    const categoryCollection = ubJewellersDB.collection("categories");
    const cartCollection = ubJewellersDB.collection("cart");

    // generate JWT Token related api
    app.post("/jwt", async (req, res) => {
      const userEmailObj = req.body;

      const token = jwt.sign(userEmailObj, process.env.JWT_SECRET_KEY, {
        expiresIn: "2h",
      });

      res.send({ token });
    });

    // NAV NOTIFICATIONS GET METHOD
    app.get("/nav-notifications", async (req, res) => {
      const result = await navNotificationCollection.find({}).toArray();
      res.send(result);
    });

    // PRODUCTS RELATED GET METHOD
    app.get("/products", async (req, res) => {
      // search  query
      const productSearchText = req.query?.searchText;

      if (productSearchText === "") {
        return res.send([]);
      }

      if (productSearchText) {
        const result = await productCollection
          .find({
            $or: [
              { name: { $regex: productSearchText, $options: "i" } },
              { category: { $regex: productSearchText, $options: "i" } },
            ],
          })
          .toArray();
        return res.send(result);
      }
      const result = await productCollection.find({}).toArray();
      res.send(result);
    });

    // filter by category, price, sortOrder size, carate, search
    app.get("/products/filter", async (req, res) => {
      const category = req.query?.category?.toLowerCase() || "all";
      const minPrice = parseFloat(req.query?.minPrice) || 0;
      const maxPrice =
        parseFloat(req.query?.maxPrice) || Number.POSITIVE_INFINITY;
      let priceSortOrder = req.query?.priceOrder || "all";
      const size = req.query?.size?.toLowerCase() || "all";
      const carate = parseInt(req.query?.carate) || "all";
      const searchText = req.query?.search?.toLowerCase() || "";

      let result;

      // filter by category

      if (category === "all") {
        result = await productCollection.find({}).toArray();
      } else {
        result = await productCollection
          .find({ category: { $regex: category, $options: "i" } })
          .toArray();
      }

      // filter by price
      result = result.filter(
        (product) => product.price >= minPrice && product.price <= maxPrice
      );

      // sort by price
      if (priceSortOrder !== "all") {
        result.sort((a, b) => {
          return priceSortOrder === "asc"
            ? a.price - b.price // ascending order
            : b.price - a.price; // descending order?
        });
      }

      // filter by size
      if (size !== "all") {
        result = result.filter(
          (product) => product.size.toLowerCase() === size
        );
      }

      // filter by carate
      if (carate !== "all") {
        result = result.filter((product) => product.carate === carate);
      }

      // filter by search
      if (searchText !== "") {
        result = result.filter(
          (product) =>
            product.name.toLowerCase().includes(searchText) ||
            product.category.toLowerCase().includes(searchText)
        );
      }

      res.send(result);
    });

    // CATEGORIES GET METHOD
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find({}).toArray();
      res.send(result);
    });

    // ALL REVIEWS GET METHOD
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    // CART RELATED API
    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find({}).toArray();
      res.send(result);
    });
    app.post("/cart", async (req, res) => {
      const body = req.body;
      const result = await cartCollection.insertOne(body);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("UB-Jewellers Server is up and running!");
});

app.listen(port, () => {
  console.log("ub-jewellers server is running on port:", port);
});
