import React, {useState} from "react";
import ReactDOM from "react-dom/client";

const css = {
	loginPage: {
		fontFamily: "verdana, sans-serif",
		fontSize: "12px",
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center"
	},
	iconContainer: {
		width: "140px",
		margin: "20px",
	},
	icon: {
		fill: "rgb(118 185 0)",
		stroke: "rgb(40 151 40)",
		strokeWidth: "0.5px"
	},
	content: {
		margin: "20px",
		color: "rgb(132 133 137)",
		display: "flex",
		flexDirection: "column"
	},
	requestContainer: {
		margin: "20px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center"
	},
	requestInput: {
		margin: "10px"
	},
	input: {
		border: "1px solid rgb(185 182 182)",
		padding: "5px 8px"
	},
	button: {
		margin: "20px",
		padding: "13px 40px",
		backgroundColor: "rgb(118 185 0)",
		borderRadius: "5px",
		border: "3px solid rgb(40 151 40)",
		color: "rgb(255 255 255)",
		fontWeight: "bold",
		fontWize: "16px",
		cursor: "pointer"
	},
	updateContainer: {
		display: "flex",
		alignItems: "center",
		flexDirection: "column",
		margin: "20px",
		fontWeight: "bold"
	},
	errorContainer: {
		display: "flex",
		alignItems: "center",
		flexDirection: "column",
		margin: "20px",
		fontWeight: "bold",
		color: "red"
	}
}

const NoAccess = () => {

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isError, setIsError] = useState(false);
	const [isSending, setIsSending] = useState(false);

	const submit = () => {
		if (name && name.length > 0 && email && email.length > 0) {
			setIsSending(true);

			fetch(`/api/requestaccess`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name, email: email }) })
				.then(response => {
					if (response.ok) {
						return response.text();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(() => {
					setIsSubmitted(true);
					setIsSending(false);
				})
				.catch(error => {
					console.warn(error);
					setIsError(true);
					setIsSending(false);
				});
		}
	};
	
	return (

<div style={css.loginPage}>
	<div style={css.iconContainer}>
		<svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24" fill="black" style={css.icon}>
			<g>
				<path d="M12,1L3,5v6c0,5.55,3.84,10.74,9,12c5.16-1.26,9-6.45,9-12V5L12,1L12,1z M11,7h2v2h-2V7z M11,11h2v6h-2V11z"/>
			</g>
		</svg>
	</div>
	
	<div style={css.content}>
		<div>
			This is a restricted site that requires pre-approval to use. If you'd like access to this site, please contact the owner.
		</div>
		
		{
		isSubmitted ?

		<div style={ css.updateContainer }>
			Your request has been forwarded to an administrator
		</div>

		: isError ?

		<div style={ css.errorContainer }>
			There was an error submitting your request
		</div>

		: isSending ?

		<div style={ css.errorContainer }>
			Submitting request
		</div>

		:

		<div style={css.requestContainer}>
			<div style={css.requestInput}>
				<input type="text" placeholder="Name" value={name} onChange={ event => setName(event.target.value) } style={css.input} />
			</div>

			<div style={css.requestInput}>
				<input type="email" placeholder="Email" value={email} onChange={ event => setEmail(event.target.value) } style={css.input} />
			</div>

			<div style={css.requestInput}>
				<button style={css.button} onClick={ submit }>Request Access</button>
			</div>
		</div>

		}
	</div>
</div>

	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<NoAccess />);
export default NoAccess;
