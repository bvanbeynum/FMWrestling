import path from "path";
import app from "./server/app.js";
import mongoose from "mongoose";
import config from "./server/config.js";
import express from "express";

// Declarations =======================================================================

const port = config.port || 9201;
const currentDirectory = path.resolve(process.cwd());

mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {
	useNewUrlParser: true, 
	useUnifiedTopology: true,
	socketTimeoutMS: 300000,
	connectTimeoutMS: 300000
});

// Configure webpack ====================================================

if (config.mode === "development") {
	Promise.all([
		import("webpack"),
		import("webpack-dev-middleware"),
		import("./webpack.dev.js")
	])
	.then(([webpack, webpackDevMiddleware, webpackConfig]) => {
		const webpackLoader = webpack.default;
		const middleware = webpackDevMiddleware.default;

		const compilier = webpackLoader(webpackConfig.default);
		app.use(middleware(compilier, { publicPath: "/" }));
	});
}
else {
	app.use(express.static(path.join(currentDirectory, "/client/static")));
}

// listen (start app with node server.js) ======================================

const server = app.listen(port, () => {
	console.log(`${ (new Date()).toLocaleDateString() } ${ (new Date()).toLocaleTimeString() }: App listening on port ${port}`);
});

// Extend Node.js HTTP server timeouts (in milliseconds)
server.requestTimeout = 300000;    // 5 minutes (time allowed to receive full request)
server.headersTimeout = 305000;    // Must be slightly higher than requestTimeout
server.timeout = 300000;           // Socket timeout limit
server.keepAliveTimeout = 300000;  // Idle Keep-Alive socket timeout limit