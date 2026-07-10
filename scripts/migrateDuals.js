import mongoose from "mongoose";
import config from "../server/config.js";

async function run() {
	console.log("Connecting to database...");
	await mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });
	console.log("Connected successfully!");

	// Get all duals using the schema's raw model to bypass validation of old documents
	const DualRaw = mongoose.connection.collection("duals");
	const dualDocs = await DualRaw.find({}).toArray();
	console.log(`Found ${dualDocs.length} dual meets to migrate.`);

	for (const doc of dualDocs) {
		console.log(`Migrating dual against ${doc.opponent} on ${doc.dualDate}...`);
		
		// If already migrated, skip or re-process
		if (doc.matches && !doc.wrestlers) {
			console.log(`Dual against ${doc.opponent} is already in the new format. Skipping.`);
			continue;
		}

		const oldWrestlers = doc.wrestlers || [];
		
		// Group wrestlers into pairs by weight class
		const weightClasses = [];
		const weightMap = new Map();
		oldWrestlers.forEach((w) => {
			const wt = w.weight || "106";
			if (!weightMap.has(wt)) {
				weightMap.set(wt, []);
				weightClasses.push(wt);
			}
			weightMap.get(wt).push(w);
		});

		const matches = [];
		for (let i = 0; i < weightClasses.length; i++) {
			const wt = weightClasses[i];
			const pair = weightMap.get(wt);
			
			// In the old format:
			// pair[0] is home wrestler (Fort Mill)
			// pair[1] is visitor wrestler (Opponent)
			const homeW = pair[0] || { name: "", results: 0, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };
			const visitorW = pair[1] || { name: "", results: 0, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };

			const homeScore = homeW.results || 0;
			const visitorScore = visitorW.results || 0;

			// Determine win type and who is the winner
			let winType = "";
			const homeIsWinner = homeScore > visitorScore;
			const visitorIsWinner = visitorScore > homeScore;
			
			const winningScore = Math.max(homeScore, visitorScore);
			if (winningScore === 6) {
				const isForfeit = (homeIsWinner ? visitorW.name : homeW.name)?.toLowerCase().includes("forfeit");
				winType = isForfeit ? "FF" : "F";
			} else if (winningScore === 5) {
				winType = "TF";
			} else if (winningScore === 4) {
				winType = "MD";
			} else if (winningScore === 3) {
				winType = "DEC";
			} else {
				winType = "DEC"; // Default fallback
			}

			matches.push({
				matchSqlId: null,
				weightClass: wt,
				winType: winType,
				sort: i + 1,
				wrestlers: [
					{
						name: homeW.name || "",
						team: "Fort Mill",
						isWinner: homeIsWinner,
						scores: {
							takedowns: homeW.scores?.takedowns || 0,
							escapes: homeW.scores?.escapes || 0,
							reversals: homeW.scores?.reversals || 0,
							nearfalls: homeW.scores?.nearfalls || 0
						}
					},
					{
						name: visitorW.name || "",
						team: doc.opponent || "Visitor",
						isWinner: visitorIsWinner,
						scores: {
							takedowns: visitorW.scores?.takedowns || 0,
							escapes: visitorW.scores?.escapes || 0,
							reversals: visitorW.scores?.reversals || 0,
							nearfalls: visitorW.scores?.nearfalls || 0
						}
					}
				]
			});
		}

		// Update the document in MongoDB
		await DualRaw.updateOne(
			{ _id: doc._id },
			{
				$set: {
					matches: matches,
					division: doc.division || "Varsity",
					modified: new Date()
				},
				$unset: {
					wrestlers: ""
				}
			}
		);
		console.log(`Dual against ${doc.opponent} migrated successfully.`);
	}

	console.log("All dual meets migrated successfully.");
	await mongoose.disconnect();
}

run().catch(err => {
	console.error("Migration failed:", err);
	process.exit(1);
});
