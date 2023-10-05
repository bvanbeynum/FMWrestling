import React, { useEffect, useState } from "react";

const TeamWrestlersEdit = props => {

	const emptyWrestler = { firstName: "", lastName: "", division: "", weightClass: "" };

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ newWrestler, setNewWrestler ] = useState(null);
	const [ isSaving, setIsSaving ] = useState(false);

	return (

<div aria-label="Add Wrestler" role="button" className={ `panel ${ !newWrestler ? "button" : "" }` } onClick={ () => { if (!newWrestler) { setNewWrestler({...emptyWrestler}) } }}>
	
	{
	isSaving && props.savingError ?

	<div className="panelError">{ props.savingError }</div>

	: isSaving ?

	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>

	: newWrestler ?
	
	<div>
		<label>
			<span>First Name</span>
			<input type="text" value={ newWrestler.firstName } onChange={ event => setNewWrestler(wrestler => ({...wrestler, firstName: event.target.value })) } aria-label="First Name" />
		</label>
		
		<label>
			<span>Last Name</span>
			<input type="text" value={ newWrestler.lastName } onChange={ event => setNewWrestler(wrestler => ({...wrestler, lastName: event.target.value })) } aria-label="Last Name" />
		</label>

		<label>
			<span>Division</span>
			<input type="text" value={ newWrestler.division } onChange={ event => setNewWrestler(wrestler => ({...wrestler, division: event.target.value })) } aria-label="Wrestler Division" />
		</label>

		<label>
			<span>Weight Class</span>
			<input type="number" value={ newWrestler.weightClass } onChange={ event => setNewWrestler(wrestler => ({...wrestler, weightClass: event.target.value })) } aria-label="Wrestler Weight Class" />
		</label>

		<div className="row">
			<button onClick={ () => { setIsSaving(true); props.addWrestler(newWrestler) } } aria-label="Save">
				{/* Check */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
				</svg>
				<div>save</div>
			</button>

			<button aria-label="Cancel" onClick={ () => setNewWrestler(null) }>
				{/* Cancel */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
				</svg>
				<div>cancel</div>
			</button>
		</div>
	</div>


	:

	<h3>Add Wrestler</h3>

	}

</div>

	)

}

export default TeamWrestlersEdit;
