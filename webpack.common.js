import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
	entry: {
	},
	plugins: [
		new HtmlWebpackPlugin({ 
			filename: "working.html",
			title: "Working",
			favicon: "./client/media/favicon.ico",
			chunks: [ ],
			template: "./client/src/working.html"
		})
	],
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/i,
				exclude: /(node_modules|bower_components)/i,
				loader: "babel-loader",
				options: { presets: [ "@babel/env" ]}
			},
			{
				test: /\.css$/i,
				use: [ "style-loader", "css-loader" ]
			},
			{
				test: /\.(png|gif|jpg|ico)$/i,
				type: "asset/resource"
			}
		]
	},
	resolve: { extensions: [ "*", ".js", ".jsx" ]}
};
