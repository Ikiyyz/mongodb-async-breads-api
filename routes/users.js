var express = require("express");
const { ObjectId } = require("mongodb");
var router = express.Router();

module.exports = function (db) {
  const User = db.collection("users");

  // GET / - Browse, Search, Sort, Pagination
  router.get("/", async function (req, res) {
    try {
      const {
        search = "",
        page = 1,
        sortMode = "asc",
        sortBy = "name",
        limit: limitQuery = "all",
      } = req.query;

      let params = {};
      if (search.trim() !== "") {
        params = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        };
      }

      const allowedLimits = ["5", "10", "all"];
      const isValidLimit = allowedLimits.includes(limitQuery);
      const limit = isValidLimit && limitQuery !== "all" ? parseInt(limitQuery) : 0;
      const skip = limit > 0 ? (parseInt(page) - 1) * limit : 0;

      const sort = {
        [sortBy]: sortMode === "desc" ? -1 : 1,
      };

      const totalData = await User.countDocuments(params);
      const totalPages = limit > 0 ? Math.ceil(totalData / limit) : 1;

      const users = await User.find(params)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        data: users,
        page: parseInt(page),
        totalPages,
        totalData,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET /:id - Read
  router.get("/:id", async function (req, res) {
    try {
      const id = req.params.id;
      const user = await User.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // POST / - Add
  router.post("/", async function (req, res) {
    try {
      const { name, phone } = req.body;
      const result = await User.insertOne({ name, phone });
      const newUser = await User.findOne({ _id: result.insertedId });
      res.status(201).json(newUser);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // PUT /:id - Edit
  router.put("/:id", async function (req, res) {
    try {
      const id = req.params.id;
      const { name, phone } = req.body;
      const result = await User.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name, phone } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });
      const updatedUser = await User.findOne({ _id: new ObjectId(id) });
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // DELETE /:id - Delete
  router.delete("/:id", async function (req, res) {
    try {
      const id = req.params.id;
      const result = await User.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User deleted successfully" });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  return router;
};
