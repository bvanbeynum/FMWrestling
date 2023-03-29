import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
	entry: {
		index: "./client/src/index.jsx",
		dual: "./client/portal/dual/dual.jsx",
		noaccess: "./client/portal/noaccess.jsx"
	},
	plugins: [
		new HtmlWebpackPlugin({ 
			filename: "index.html",
			title: "Fort Mill Wrestling",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "index" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/dual.html",
			title: "Fort Mill Wrestling - Dual",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "dual" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "noaccess.html",
			title: "Fort Mill Wrestling - Restricted Access",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "noaccess" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
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
