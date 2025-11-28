import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true, //! read more about credentials
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended, limit: "16kb" })); //encode the url like instead of %20 it will use +
app.use(express.static("public"));
app.use(cookieParser());

export { app };
