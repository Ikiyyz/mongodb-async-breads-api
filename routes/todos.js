var express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router({ mergeParams: true });
const path = require("path");

module.exports = function (db) {
  router.get("/", async (req, res, next) => {
    const wantsHtml = req.accepts(["html", "json"]) === "html";
    if (wantsHtml) {
      return res.sendFile(path.join(__dirname, "../public/todos.html"));
    }

    try {
      const {
        title,
        startdate,
        enddate,
        complete,
        sortMode = "asc",
        sortBy = "deadline",
        page = "1",
        limit: limitQuery = "5",
      } = req.query;

      const pageInt = parseInt(page) || 1;
      const allowedLimits = ["5", "10", "all"];
      const isValidLimit = allowedLimits.includes(limitQuery);
      const limit =
        isValidLimit && limitQuery !== "all" ? parseInt(limitQuery) : 0;
      const skip = limit > 0 ? (pageInt - 1) * limit : 0;

      let params = {};

      if (title) {
        params.title = new RegExp(title, "i");
      }

      if (startdate || enddate) {
        params.deadline = {};
        if (startdate) {
          params.deadline.$gte = new Date(startdate);
        }
        if (enddate) {
          params.deadline.$lte = new Date(enddate);
        }
      }

      if (complete === "true" || complete === "false") {
        params.complete = complete === "true";
      }

      const sort = {
        [sortBy]: sortMode === "desc" ? -1 : 1,
      };

      const totalData = await Todo.countDocuments(params);
      const totalPages = limit > 0 ? Math.ceil(totalData / limit) : 1;

      const todos = await Todo.find(params)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        data: todos,
        page: pageInt,
        totalPages,
        totalData,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /:id - Detail todo
  router.get("/:id", async (req, res) => {
    try {
      const todoId = req.params.id;
      const todo = await db.collection("todos").findOne({
        _id: ObjectId(todoId),
      });

      if (!todo) {
        return res.status(404).json({ message: "Todo not found." });
      }

      res.json(todo);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST / - Tambah todo (hanya title di body)
  router.post("/", async (req, res) => {
    try {
      const { title } = req.body;

      // Validasi title
      if (!title) {
        return res.status(400).json({ message: "Title is required." });
      }

      const executorId = req.params.userId;

      // Validasi executor
      const user = await db
        .collection("users")
        .findOne({ _id: ObjectId(executorId) });
      if (!user) {
        return res.status(404).json({ message: "Executor (user) not found." });
      }

      // Deadline otomatis: besok
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);

      const newTodo = {
        title,
        complete: false,
        deadline,
        executor: ObjectId(executorId),
      };

      const result = await db.collection("todos").insertOne(newTodo);
      const insertedTodo = await db
        .collection("todos")
        .findOne({ _id: result.insertedId });

      res.status(201).json(insertedTodo);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

    // PUT /:id - Edit todo
    router.put("/:id", async (req, res) => {
    })
  return router;
};
