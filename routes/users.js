var express = require("express");
const { ObjectId } = require("mongodb");
var router = express.Router();

// GET / - Browse, Search, Sort, Pagination
module.exports = function (db) {
  const User = db.collection("users");
  router.get("/", async function (req, res) {
    try {
      const {
        query = "",
        page = 1,
        limit: limitQuery = "all",
        sortMode = "asc",
        sortBy = "_id",
      } = req.query;

      let params = {};
      if (query.trim() !== "") {
        params = {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { phone: { $regex: query, $options: "i" } },
          ],
        };
      }

      const allowedLimits = ["5", "10", "all"];
      const isValidLimit = allowedLimits.includes(limitQuery);
      const limit =
        isValidLimit && limitQuery !== "all" ? parseInt(limitQuery) : 0;
      const pageInt = parseInt(page) || 1;
      const offset = limit > 0 ? (pageInt - 1) * limit : 0;

      const sort = {
        [sortBy]: sortMode === "desc" ? -1 : 1,
      };

      const total = await User.countDocuments(params);
      const pages = limit > 0 ? Math.ceil(total / limit) : 1;

      const users = await User.find(params)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .toArray();

      res.status(200).json({
        data: users,
        total,
        pages,
        page: pageInt,
        limit,
        offset,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET /:id - Detail user
  router.get("/:id", async function (req, res) {
    try {
      const { id } = req.params;
      const _id = new ObjectId(id);
      const user = await User.findOne({ _id });

      if (!user) return res.status(404).json({ message: "User not found" });

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
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
  router.put("/:id", async function (req, res, next) {
    try {
      const { id } = req.params;
      const _id = new ObjectId(id);

      await User.updateOne({ _id }, { $set: req.body });
      const user = await User.findOne({ _id });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /:id - Delete
  router.delete("/:id", async function (req, res) {
    try {
      const { id } = req.params;
      const _id = new ObjectId(id);

      const user = await User.findOne({ _id });
      if (!user) return res.status(404).json({ message: "User not found" });

      await User.deleteOne({ _id });

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
};
