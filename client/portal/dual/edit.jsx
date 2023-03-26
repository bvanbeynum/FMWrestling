import React from "react";

const Edit = (props) => {
	return (

<div className="list">

	{
	props.weightClasses.map((weightClass, weightClassIndex) =>
		<div key={ weightClassIndex } className="panel"></div>
	)
	}
	
	<div className="panel new" onClick={ props.addWeightClass }>+</div>
	
</div>

		)
	};
	
export default Edit;
