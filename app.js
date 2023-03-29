// Imports =======================================================================

import path from "path";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import busboy from "connect-busboy";
import router from "./server/router.js";

// Declarations =======================================================================

const app = express();
const { json, urlencoded } = bodyParser;
const currentDirectory = path.resolve(process.cwd());

// Config =======================================================================

app.set("x-powered-by", false);
app.set("root", currentDirectory);
app.use(json({ limit: "50mb" }));
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(busboy()); 

// Routes =======================================================================

app.use(router);

app.use("/media", express.static(path.join(currentDirectory, "/client/media")));

export default app;
