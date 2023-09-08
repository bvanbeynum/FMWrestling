import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
	entry: {
		index: "./client/public/index.jsx",
		portal: "./client/portal/index.jsx",
		posts: "./client/portal/posts.jsx",
		schedule: "./client/portal/schedule.jsx",
		users: "./client/portal/users.jsx",
		teams: "./client/portal/teams.jsx",
		roles: "./client/portal/roles.jsx",
		requests: "./client/portal/requests.jsx",
		dual: "./client/portal/dual/dual.jsx",
		floevent: "./client/portal/floevent.jsx",
		noaccess: "./client/portal/noaccess.jsx"
	},
	plugins: [
		// new HtmlWebpackPlugin({ 
		// 	filename: "index.html",
		// 	title: "Fort Mill Wrestling",
		// 	favicon: "./client/media/favicon.ico",
		// 	meta: {
		// 		viewport: "width=device-width, initial-scale=1"
		// 	},
		// 	chunks: [ "index" ],
		// 	templateContent: "<html><body><div id='root'></div></body></html>"
		// }),
		new HtmlWebpackPlugin({ 
			filename: "./portal/index.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "portal" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/posts.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "posts" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/users.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "users" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/teams.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "teams" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/roles.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "roles" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/requests.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "requests" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/schedule.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "schedule" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/floevent.html",
			title: "Fort Mill Wrestling - Portal",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "floevent" ],
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
			template: "./client/public/working.html"
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
