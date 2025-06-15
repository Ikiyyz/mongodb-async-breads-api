var express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router({ mergeParams: true });
const path = require("path");

module.exports = function (db) {
    const Todo = db.collection("todos");

    router.get("/", async (req, res) => {
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
            } = req.query;

            const pageInt = parseInt(page) || 1;
            let params = {};

            if (title) {
                params.title = new RegExp(title, "i");
            }

            if (startdate || enddate) {
                params.deadline = {};
                if (startdate) {
                    const start = new Date(startdate);
                    start.setHours(0, 0, 0, 0);
                    params.deadline.$gte = start;
                }
                if (enddate) {
                    const end = new Date(enddate);
                    end.setHours(23, 59, 59, 999);
                    params.deadline.$lte = end;
                }
            }

            if (complete === "true") {
                params.complete = true;
            } else if (complete === "false") {
                params.complete = false;
            }

            const userId = new ObjectId(req.params.userId);
            params.executor = userId;

            const count = await Todo.countDocuments(params);
            const limit = 10;
            const offset = limit * (pageInt - 1);
            const pages = Math.ceil(count / limit);

            const sortParams = {};
            sortParams[sortBy] = sortMode === "asc" ? 1 : -1;

            const todo = await Todo.find(params)
                .limit(limit)
                .skip(offset)
                .sort(sortParams)
                .toArray();
                
            res.status(200).json({ 
                data: todo, 
                total: count, 
                pages, 
                page: pageInt, 
                limit 
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    router.get("/:id", async (req, res) => {
        try {
            const { userId, id } = req.params;

            const todo = await Todo.findOne({
                _id: new ObjectId(id),
                executor: new ObjectId(userId),
            });

            if (!todo) {
                return res.status(404).json({ message: "Todo not found" });
            }

            res.status(200).json(todo);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    router.post("/", async (req, res) => {
        try {
            const { title } = req.body;

            if (!title) {
                throw new Error("Title is required!");
            }

            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 1);

            const todo = {
                title,
                deadline,
                complete: false,
                executor: new ObjectId(req.params.userId),
            };

            const result = await Todo.insertOne(todo);
            const insertedTodo = await Todo.findOne({ _id: result.insertedId });

            res.status(201).json(insertedTodo);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    });

    router.put("/:id", async function (req, res) {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);

            const updatedData = { ...req.body };

            if (updatedData.deadline) {
                updatedData.deadline = new Date(updatedData.deadline);
            }

            await Todo.updateOne({ _id }, { $set: updatedData });
            const todo = await Todo.findOne({ _id });

            if (!todo) throw new Error("Todo not exist!");

            res.status(201).json(todo);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    router.delete("/:id", async function (req, res) {
        try {
            const { id } = req.params;
            const _id = new ObjectId(id);
            
            const todo = await Todo.findOne({ _id });
            if (!todo) throw new Error("Todo not exist!");
            
            await Todo.deleteOne({ _id });

            res.status(201).json(todo);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};  