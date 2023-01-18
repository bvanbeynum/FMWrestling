import path from "path";
import { merge } from "webpack-merge";
import common from "./webpack.common.js";

export default merge(common, {
	mode: "production",
	devtool: "source-map",
	output: {
		path: path.resolve("./client/static"),
		filename: "[name].js",
		publicPath: "/",
		clean: true
	}
});
