import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
	entry: {
		portal: "./client/portal/index.jsx",
		teamschedule: "./client/portal/teamschedule.jsx",
		allschedule: "./client/portal/allschedule.jsx",
		users: "./client/portal/users.jsx",
		roles: "./client/portal/roles.jsx",
		requests: "./client/portal/requests.jsx",
		dual: "./client/portal/dual.jsx",
		opponent: "./client/portal/opponent.jsx",
		opponentLive: "./client/portal/opponentlive.jsx",
		opponentEvent: "./client/portal/opponentevent.jsx",
		opponentreport: "./client/portal/opponentreport.jsx",
		wrestlerSearch: "./client/portal/wrestlersearch.jsx",
		wrestler: "./client/portal/wrestler.jsx",
		noaccess: "./client/portal/noaccess.jsx",
		tournamentsummary: "./client/portal/tournamentsummary.jsx",
		dualreport: "./client/portal/dualreport.jsx",
		teamweightclass: "./client/portal/teamweightclass.jsx",
		teamleaderboard: "./client/portal/teamleaderboard.jsx",
		parentemail: "./client/portal/parentemail.jsx",
		aiemail: "./client/portal/aiemail.jsx",
		wrestlerreport: "./client/portal/wrestlerreport.jsx",
		newwrestler: "./client/portal/newwrestler.jsx",
		duplicates: "./client/portal/duplicates.jsx",
		wrestlerduplicate: "./client/portal/wrestlerduplicate.jsx"
	},
	plugins: [
		new HtmlWebpackPlugin({ 
			filename: "./portal/aiemail.html",
			title: "Fort Mill Wrestling - AI Email",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "aiemail" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/parentemail.html",
			title: "Fort Mill Wrestling - Parent Email List",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "parentemail" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
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
			filename: "./portal/dual.html",
			title: "Fort Mill Wrestling - Dual Match",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "dual" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/dualreport.html",
			title: "Fort Mill Wrestling - Duals Overview",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "dualreport" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/teamweightclass.html",
			title: "Fort Mill Wrestling - Weight Classes",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "teamweightclass" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/teamleaderboard.html",
			title: "Fort Mill Wrestling - Leaderboard",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "teamleaderboard" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/teamschedule.html",
			title: "Fort Mill Wrestling - Team Schedule",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "teamschedule" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/allschedule.html",
			title: "Fort Mill Wrestling - All Events Schedule",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "allschedule" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/tournamentsummary.html",
			title: "Fort Mill Wrestling - Tournament Summary",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "tournamentsummary" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/opponent.html",
			title: "Fort Mill Wrestling - Opponent",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "opponent" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/opponentlive.html",
			title: "Fort Mill Wrestling - Live View",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "opponentLive" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/opponentevent.html",
			title: "Fort Mill Wrestling - Opponent Events",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "opponentEvent" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/opponentreport.html",
			title: "Fort Mill Wrestling - Opponent Overview",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "opponentreport" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/wrestlersearch.html",
			title: "Fort Mill Wrestling - Wrestlers",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "wrestlerSearch" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/wrestler.html",
			title: "Fort Mill Wrestling - Wrestler Details",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "wrestler" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/wrestlerreport.html",
			title: "Fort Mill Wrestling - Wrestler Performance Report",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "wrestlerreport" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/newwrestler.html",
			title: "Fort Mill Wrestling - New Wrestlers",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "newwrestler" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/duplicates.html",
			title: "Fort Mill Wrestling - Duplicates",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "duplicates" ],
			templateContent: "<html><body><div id='root'></div></body></html>"
		}),
		new HtmlWebpackPlugin({ 
			filename: "./portal/wrestlerduplicate.html",
			title: "Fort Mill Wrestling - Wrestler Search",
			favicon: "./client/media/favicon.ico",
			meta: {
				viewport: "width=device-width, initial-scale=1"
			},
			chunks: [ "wrestlerduplicate" ],
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
