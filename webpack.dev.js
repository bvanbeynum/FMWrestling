import path from "path";
import { merge } from "webpack-merge";
import common from "./webpack.common.js";

export default merge(common, {
	mode: "development",
	devtool: "inline-source-map",
	output: {
		path: path.resolve("./client/dev"),
		filename: "[name].js",
		publicPath: "/",
		clean: true
	}
});
