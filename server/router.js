import express from "express";
import data from "./data.js";
import api from "./api.js";
import browser from "express-useragent";

const router = express.Router();

// ************************* Middleware

router.use(api.serverInitialize);
router.use(api.authPortal);

// ************************* API

router.post("/api/requestaccess", [api.authAPI, browser.express()], api.requestAccess);

// ************************* Data

router.get("/data/user", api.authInternal, data.userGet);
router.post("/data/user", api.authInternal, data.userSave);
router.delete("/data/user", api.authInternal, data.userDelete);

router.get("/data/devicerequest", api.authInternal, data.deviceRequestGet);
router.post("/data/devicerequest", api.authInternal, data.deviceRequestSave);
router.delete("/data/devicerequest", api.authInternal, data.deviceRequestDelete);

router.get("/data/scorecall", api.authInternal, data.scoreCallGet);
router.post("/data/scorecall", api.authInternal, data.scoreCallSave);
router.delete("/data/scorecall", api.authInternal, data.scoreCallDelete);

router.get("/data/wrestler", api.authInternal, data.wrestlerGet);
router.post("/data/wrestler", api.authInternal, data.wrestlerSave);
router.delete("/data/wrestler", api.authInternal, data.wrestlerDelete);

router.get("/data/dual", api.authInternal, data.dualGet);
router.post("/data/dual", api.authInternal, data.dualSave);
router.delete("/data/dual", api.authInternal, data.dualDelete);

export default router;
