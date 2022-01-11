import { Component, GCTest } from './component'   // for RadioButtonGroup
import { ComponentParams, reHTMLContent } from './componentUtils'
import { Disposables } from './Disposables'


// InputField is based on the construct of assocating an input tag with its label tag by making the input contained within the label
// tag. The alternative is to give the input tag an ID and set the 'for' attribute of the label equal to that ID.
// This Inputfield is a <label> at its top level. The text content used to create this Component is always interpreted as HTML and
// can optionally contain a simple '<input>' tag as a placeholder for where the actual <input> tag will be in the label's content.
// If it does not contain an '<input>' tag, then one will be appending at the end.
// The actual <input> component is passed as the 'inputCntr' property and will be inserted at the placeholder. The 'inputCntr' is
// typically specified by the derived class (eg. Checkbox or Textbox...) and the text content which determines the location of the
// 'inputCntr' is typically specified by the user who creates the field.
// Examples:
//      new Checkbox("chkbox1: Do you ken it? <input>") // label to the left of checkbox
//      new Checkbox("chkbox1: <input> Do you ken it?") // label to the right of checkbox
//
// The input field passes through the 'value' property and onchange events from its <input> tag so that users of an InputField can
// treat it as if its the <input> DOM node in most typical cases.
export class InputField {
	constructor(...p) {
		const componentParams = new ComponentParams("$label", ...p, {paramNames:"inputCntr inputCntrTag"});

		// this implements dynamic construction where the parameters determine the specific component class to construct
		if (componentParams.Constructor && componentParams.Constructor  != new.target)
			return new componentParams.Constructor(componentParams);

		componentParams.makeHtmlNode(this)

		this.disposables = new Disposables();
		this.componentParams = componentParams;
		this.optParams = this.componentParams.optParams;
		this.defaultChildType = componentParams.defaultConstructor;

		this.onActivatedCB = componentParams.getCompositeCB(false, 'onActivatedCB');
		this.el.onchange = (e)=>{this.rawOnChange(e)};

		// most inputCntr are "input" tags but seclectbox is "select"
		this.inputCntrTag = (this.inputCntrTag) ? this.inputCntrTag : "input"

		this.mountedName = Component.getMountedName(this, true);
		if (GCTest) {
			Component.instFinalChecker.register(this);
			Component.unCollectedCount++;
		}

		// the caller can provide html text for the inner field of the <label>.
		if (this.componentParams.optParams.label) {
			this.label = this.componentParams.optParams.label;
			this.el.innerHTML = this.label;
		}

		// If the innerHTML includes the placeholder '<input/>' then that will determine where we place the inputCntr.
		var placeholder = this.el.getElementsByTagName("input")
		console.assert(placeholder.length < 2, "constructing an Inputfield, more than one <input> child was specified in the innerHTML")
		placeholder = (placeholder.length >0) ? placeholder[0] : null;

		// the most declarative way to specify the input control is in the 'input' optional parameter
		if ("inputCntr" in this.componentParams.optParams) {
			this.componentParams.optParams["inputCntr"].name="inputCntr"
			Component.replaceChild(this, placeholder, this.componentParams.optParams["inputCntr"])
			console.assert(this.inputCntr);
			this.inputCntrTag = this.inputCntr.el.nodeName.toLowerCase()
		}

		// the caller may alternatively provide the input in the normal [...] content
		if (!this.inputCntr && this.componentParams.content, this.componentParams.content.length>0) {
			Component.replaceChild(this, placeholder, ...this.componentParams.content)
			this.componentParams.content=null

			// fixup this.inputCntr. We dont know how the caller provided the <input> in [...] or even if they did. If this.inputCntr
			// was not set by Component.replaceChild, maybe its a plain DOM node and we need to fix it up
			if (!this.inputCntr) {
				var inputCntr = this.el.getElementsByTagName("input");
				console.assert(inputCntr.length<2);
				if (inputCntr.length>0) {
					Component.mountAdd(this, "inputCntr", inputCntr[0]);
				}
			}
		}

		// if the caller provided both {input:...} and [...] content, append the content to the end
		if (this.componentParams.content)
			Component.mount(this, this.componentParams.content)

		// set the name of the input element
		if (this.inputCntr && this.inputCntr.el)
			this.inputCntr.el.name = this.name
	}

	_setInputCntr(inputCntr) {
		var placeholder = this.inputCntr
		if (!placeholder) {
			placeholder = this.el.getElementsByTagName("input")
			console.assert(placeholder.length < 2, "constructing an Inputfield, more than one <input> child was specified in the innerHTML")
			placeholder = (placeholder.length >0) ? placeholder[0] : null;
		}
		Component.replaceChild(this, placeholder, inputCntr)
		if (!this.inputCntr) {
			var inputCntr = this.el.getElementsByTagName("input");
			console.assert(inputCntr.length<2);
			if (inputCntr.length>0) {
				Component.mountAdd(this, "inputCntr", inputCntr[0]);
			}
		}
		// set the name of the input element
		if (this.inputCntr && this.inputCntr.el)
			this.inputCntr.el.name = this.name
	}

	destroy() {
		this.disposables.dispose();
		deps.objectDestroyed(this);
		this.componentParams.destroyHtmlNode(this);
	}


	setLabel(label) {
		const inputCntr = this.inputCntr;
		Component.unmount(this, this.inputCntr);
		this.label = label;
		this.el.innerHTML=label || '';
		this._setInputCntr(inputCntr);
	}
	getLabel() {
		return this.label || ''
	}

	rawOnChange(...e) {
		this.onActivated(...e);
	}
	onActivated(...e) {
		this.onActivatedCB && this.onActivatedCB(this, ...e);
	}

	get value() {
		return (this.inputCntr && this.inputCntr.el) ? this.inputCntr.el.value : null;
	}
	set value(v) {
		if (this.inputCntr && this.inputCntr.el)
			this.inputCntr.el.value = v
	}
}


export class Checkbox extends InputField {
	constructor(tagIDClasses,  ...p) {
		super("$label", {inputCntr: new Component("$input", {type:"checkbox"})}, tagIDClasses,  ...p)
	}

	get value() {
		return (this.inputCntr && this.inputCntr.el) ? this.inputCntr.el.checked : null;
	}
	set value(v) {
		if (this.inputCntr && this.inputCntr.el)
			this.inputCntr.el.checked = (v) ? true : false;
	}
}

export class Editbox extends InputField {
	constructor(tagIDClasses,  ...p) {
		super("$label", {inputCntr: new Component("$input", {type:"text"})}, tagIDClasses,  ...p)
	}
}


export class SelectOption extends Component {
	constructor(choice) {
		if (choice instanceof SelectOption)
			return choice;
		if (typeof choice == "string") {
			if (! /:/.test(choice)) choice=":"+choice
			var [value,label]=choice.split(":")
			choice={}
			if (/[*]/.test(value)) {
				choice.selected = true;
				value = value.replace("*","")
			}
			choice.label = label;
			if (value) choice.value = value;
		}
		super("$option", choice);
	}
}

export class Selectbox extends InputField {
	static optionsFromMap(map) {
		const ret=[];
		for (const key in map) {
			ret.push({
				value: key,
				label:map[key].toString()
			})
		}
		return ret;
	}

	constructor(...p) {
		super("$label", {
			inputCntr: new Component("$select"),
			paramNames: "choices"
		}, ...p)

		if (this.optParams.choices) {
			this.replaceOptions(this.optParams.choices);
		}
	}

	replaceOptions(choices) {
		if (typeof choices == "string")
			choices=choices.split(',');

		const newChoices=[]
		for (const choice of choices) {
			newChoices.push(new SelectOption(choice))
		}
		Component.replaceChildren(this.inputCntr, ...newChoices)
	}

	addOption(choice) {
		Component.appendChild(this.inputCntr, new SelectOption(choice))
	}
}
