import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import connectMongoDB from "./db/connectMongoDb.js";
import cookieParser from "cookie-parser";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({extended : true})) // to parse form data of urlencoded
app.use(cookieParser()) // to parst cookies

app.use("/api/auth", authRoutes); // authRoute is just like variable name it is importing router

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
  connectMongoDB();
});
