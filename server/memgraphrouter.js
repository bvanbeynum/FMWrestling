import express from "express";
import memgraph from "./memgraph.js";
import api from "./api.js";

const router = express.Router();

const authInternal = (request, response, next) => {
	if (api.authInternal(request.headers["x-forwarded-for"])) {
		next();
	}
	else {
		response.status(401).send("Unauthorized");
	}
};

// ************************* Memgraph Data Router

router.get("/memgraph/wrestlerfortmillpaths", authInternal, async (request, response) => {
	const results = await memgraph.wrestlerFortMillPathsGet({ sqlId: request.query.sqlid });

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/memgraph/wrestlergraph", authInternal, async (request, response) => {
	const results = await memgraph.wrestlerOpponentsGraphGet({ sqlId: request.query.sqlid, timeframeMonths: request.query.months });

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

export default router;
