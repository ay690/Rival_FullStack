import express from "express";
import prisma from "./db.js";

const app = express();

const port = process.env.PORT || 4000;

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany(); 
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});