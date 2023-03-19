import React from "react";

const weightClasses = [
	{ name: 106, wrestlers: [{ name: "Lincoln Greene", grade: "Fr" }, { name: "Luke van Beynum", grade: "Fr" }] },
	{ name: 113, wrestlers: [{ name: "Jacob Nally", grade: "So" }, { name: "Grayson Thom", grade: "Fr" }] },
	{ name: 120, wrestlers: [{ name: "Tucker Gibson", grade: "So" }] },
	{ name: 126, wrestlers: [{ name: "Aiden Eubanks", grade: "Jr" }] },
	{ name: 132, wrestlers: [{ name: "Logan Shope", grade: "Jr" }] },
	{ name: 138, wrestlers: [{ name: "Gavin Mitcheson", grade: "Jr" }, { name: "Landon Niel", grade: "Jr" }] },
	{ name: 145, wrestlers: [{ name: "Caleb Brock", grade: "Sr" }] },
	{ name: 152, wrestlers: [{ name: "Noah Kitchton", grade: "Sr" }, { name: "Taylor Johnson", grade: "Jr" }] },
	{ name: 160, wrestlers: [{ name: "Cade Simpson", grade: "Jr" }] },
	{ name: 170, wrestlers: [{ name: "Harrison Knoll", grade: "Sr" }, { name: "Jack Kadish", grade: "So" }] },
	{ name: 182, wrestlers: [{ name: "TJ Miller", grade: "Sr" }, { name: "Sebastian Villatoro", grade: "Jr" }] },
	{ name: 195, wrestlers: [{ name: "Billy Smith", grade: "Jr" }, { name: "Josh Richardson", grade: "Jr" }] },
	{ name: 220, wrestlers: [{ name: "Henry Debbout", grade: "Sr" }] },
	{ name: 285, wrestlers: [{ name: "Grayson Sykes", grade: "So" }] }
]

const Roster = (props) => {
	return (
		<div className="subsection roster">
			<h2>Meet the Team</h2>

			<div className="actions">
				<div className="button">Varsity</div>
				<div className="button">JV</div>
				<div className="button">Middle</div>
				<div className="button">Rec</div>
			</div>

			{
			weightClasses.map((weight) =>
				<div key={ weight.name } className="weightContainer">
					<div className="weight">{ weight.name }</div>
					<div className="wrestlers">
					{
					weight.wrestlers.map((wrestler, wrestlerIndex) =>
						<div key={ wrestlerIndex } className="listItem wrestlerItem">{ wrestler.name } ({ wrestler.grade })</div>
					)
					}
					</div>
				</div>
			)
			}
		</div>
	)
};

export default Roster;