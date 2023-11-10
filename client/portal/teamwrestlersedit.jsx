import React, { useEffect, useState } from "react";

const TeamWrestlersEdit = props => {

	const emptyWrestler = { firstName: "", lastName: "", division: "", weightClass: "" };

	const [ wrestler, setWrestler ] = useState(null);

	useEffect(() => {
		if (props.wrestler) {
			setWrestler(props.wrestler);
		}
	}
	, [ props.wrestler ]);

	useEffect(() => {
		if (!props.isSaving && wrestler) {
			setWrestler(null);
		}
	}, [ props.isSaving ]);

	return (

<div aria-label="Edit Wrestler" role="button" className={ `panel ${ !wrestler ? "button" : "" }` } onClick={ () => { if (!wrestler) { setWrestler({...emptyWrestler}) } }}>
	
	{
	
	props.isSaving ?

	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>

	: wrestler ?
	
	<div>
		<label>
			<span>First Name</span>
			<input type="text" value={ wrestler.firstName } onChange={ event => setWrestler(wrestler => ({...wrestler, firstName: event.target.value })) } aria-label="First Name" />
		</label>
		
		<label>
			<span>Last Name</span>
			<input type="text" value={ wrestler.lastName } onChange={ event => setWrestler(wrestler => ({...wrestler, lastName: event.target.value })) } aria-label="Last Name" />
		</label>

		<label>
			<span>Division</span>
			<input type="text" value={ wrestler.division } onChange={ event => setWrestler(wrestler => ({...wrestler, division: event.target.value })) } aria-label="Wrestler Division" />
		</label>

		{
		!props.wrestler ?
		<label>
			<span>Weight Class</span>
			<input type="number" value={ wrestler.weightClass } onChange={ event => setWrestler(wrestler => ({...wrestler, weightClass: event.target.value })) } aria-label="Wrestler Weight Class" />
		</label>
		: "" }

		<div className="row">
			<button onClick={ () => props.saveWrestler(wrestler) } aria-label="Save">
				{/* Check */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
				</svg>
				<div>save</div>
			</button>

			<button aria-label="Cancel" onClick={ () => { if (props.wrestler) { props.cancelEdit() } else { setWrestler(null) } } }>
				{/* Cancel */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
				</svg>
				<div>cancel</div>
			</button>

			{
			props.wrestler ?
			<button aria-label="Delete" onClick={ () => props.saveWrestler() }>
				{/* Trash */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
				</svg>
				<div>delete</div>
			</button>
			: ""
			}
		</div>
	</div>


	:

	<h3>Add Wrestler</h3>

	}

</div>

	)

}

export default TeamWrestlersEdit;
