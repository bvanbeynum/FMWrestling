import express from "express";
import data from "./data.js";
import api from "./api.js";

const router = express.Router();

// ************************* Middleware

router.use(api.serverInitialize);

// ************************* API

// ************************* Data

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
