import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js"

import connectMongoDB from "./db/connectMongoDb.js";

import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to parse form data of urlencoded
app.use(cookieParser()); // to parst cookies

app.use("/api/auth", authRoutes); // authRoute is just like variable name it is importing router
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notification", notificationRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
  connectMongoDB();
});
