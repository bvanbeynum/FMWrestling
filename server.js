import path from "path";
import app from "./server/app.js";
import mongoose from "mongoose";
import config from "./server/config.js";
import express from "express";

// Declarations =======================================================================

const port = config.port || 9201;
const currentDirectory = path.join(path.resolve(process.cwd()), "/web");

mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });

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

app.listen(port, () => {
	console.log(`${ (new Date()).toLocaleDateString() } ${ (new Date()).toLocaleTimeString() }: App listening on port ${port}`);
});
