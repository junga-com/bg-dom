import { Component } from './component'   // for RadioButtonGroup
import { ComponentParams, reHTMLContent } from './componentUtils'
import { Disposables } from './Disposables'


// Button is a BGComponent to represent html/dom buttons. It does not derive from Component but its equivalent to it. Button is
// often used alone but is also the base of a hierarchy of Buttons with various behaviors.
// Params:
// This uses the ComponentParams flexible parameters. The params important to this class are mentioned but others are supported too.
//    <bgNodeID>  : string in the ComponentParams::<tagIDClasses> format to specify the button name, id, classes, label, etc...
//        <name> : <name>: the variable name used to access this button from its parent. Should be unique within the parent's children
//        <tagName> : $<tagName> default is 'button'
//        <id>      : #<idName> the html id of the button
//        <classes> : .<class1>.<class1> ... extra classes to add to the button
//        <label>   : ' '<label> After a space, everything else is the label to be displayed in the button
//        <icon>    : ' 'icon-<iconName> If the label begins with 'icon-' it is interpretted as an icon name to be displyed in the button
//    <onActivatedCB>(btn) : (default for unnamed function parameters) a callback function invoked when this button is activated
//                 by click or keyboard. The button component that fires the callback is passed to the callback.
//    <pressed>  : if true, the button will start in the pressed state
//    <focusOnMouseClick> : if true, change the focus to the button when its clicked with the mouse. This is the default for html
//         buttons but this component changes it so that it will not steal the focus with mouse clicked. The user can still give
//         it the focus by keyboard navigation. Setting this option to true, returns to the default behavior where the focus will
//         be left on the button after clicking. Typically toolbar buttons should not steal the focus but form buttons may want to.
//    <DOM properties and styles>    : any DOM property or style can be specified
// See Also:
//    ComponentParams : to see what other parameters are accepted by this class constructor
export class Button {
	constructor(tagIDClasses,  ...p) {
		var componentParams = new ComponentParams(
			{
				tagIDClasses: '$button.btn',
				paramNames  : 'focusOnMouseClick,icon',
				nameForCB   :'onActivatedCB'
			},
			tagIDClasses,
			...p
		);

		if (componentParams.optParams.icon)
			componentParams.className += " icon "+componentParams.optParams.icon;

		// b/c we pass in 'this' to makeHtmlNode it will initialize this with all the properties expected of a bgComponent. We do
		// this before setting any other this.props so that the memory layout of all bgComponent will share a common layout up to
		// that point. This is not functional in the code but may aid in some transparent runtime optimizations.
		// properties set: name, mounted, mountedUnamed, el, bgComponent
		componentParams.makeHtmlNode(this);

		this.disposables = new Disposables();
		this.componentParams = componentParams;
		this.optParams     = componentParams.optParams;

		this.iconName      = componentParams.optParams.icon;
		this.onActivatedCB = componentParams.getCompositeCB(false, 'onActivatedCB');

		this.setLabel(componentParams.optParams.label);
		this.el.onclick = (e)=>{this.rawOnClick(e)};

		if (! componentParams.optParams["focusOnMouseClick"])
			this.el.onmousedown = ()=>{this.lastFocused=document.activeElement}

		// TODO: should this ComponentMount any specified child content? or should buttons not support child content?
	}

	destroy() {
		this.disposables.dispose();
		deps.objectDestroyed(this);
		this.componentParams.destroyHtmlNode(this);
	}

	rawOnClick(e) {
		this.lastFocused && this.lastFocused.focus(); this.lastFocused=null;
		this.onClick(e);
	}
	onClick(e) {
		this.onClickCB && this.onClickCB(this, e);
		this.onActivated(e);
	}
	onActivated(e) {
		this.onActivatedCB && this.onActivatedCB(this, e);
	}

	getLabel() {return this.label || ''}

	setLabel(label) {
		this.label = label || '';
		if (reHTMLContent.test(this.label))
			this.el.innerHTML = this.label;
		else
			this.el.innerText = this.label;
	}

	addTooltip(text,cmdForKeyBinding) {
		this.disposables.add(atom.tooltips.add(this.el, {title: text, keyBindingCommand: cmdForKeyBinding}));
	}
}




// ToggleButton is a two-state, bi-stable button. When activated it toggles between pressed/selected/true and
// unpressed/unselected/false. The default callback is onStateChangeCB instead of onActivatedCB. onStateChangeCB is passed the
// pressed state and the button object. The presence of the .selected CSS class determines the component's state and styling.
// Button Content:
// The button can be given inner/child content just like any Component but typically, the content of the button would be a text label
// or an icon like these examples.
//       new ToggleButton("myButtonName: TheLabelText"); // button displays 'TheLabelText'
//       new ToggleButton("myButtonName: icon-file");    // button displays the 'file' icon from the available resources (atom has Octicons library)
// Params:
// This uses the ComponentParams flexible parameters. The params important to this class are mentioned but others are supported too.
//    <bgNodeID>  : string in the ComponentParams::<tagIDClasses> format to specify the button name and optionally other things
//    <onStateChangeCB(isPressed, btn) : (default for unnamed function parameters) a callback function invoked when the button's
//                 state is changed. The current pressed state and the button object are passed as parameters
//    <pressed>  : if true, the button will start in the pressed state
//    <focusOnMouseClick> : if true, change the focus to the button when its clicked with the mouse. This is the default for html
//         buttons but this component changes it so that it will not steal the focus with mouse clicked. The user can still give
//         it the focus by keyboard navigation. Setting this option to true, returns to the default behavior where the focus will
//         be left on the button after clicking. Typically toolbar buttons should not steal the focus but form buttons may want to.
// See Also:
//    ComponentParams : to see what other parameters are accepted by this class constructor
//    Button : for common behavior to all button hierarchy classes
export class ToggleButton extends Button {
	constructor(bgNodeID, ...options) {
		super({paramNames: 'pressed', nameForCB:'onStateChangeCB'}, bgNodeID, ...options);
		this.setPressedState(Boolean(this.optParams["pressed"]));
		this.onStateChangeCB = this.componentParams.getCompositeCB(false, 'onStateChangeCB');
	}
	onActivated(e) {
		this.el.classList.toggle("selected");
		super.onActivated(e);
		this.onStateChange(this.isPressed());
	}
	onStateChange(newState) {
		this.onStateChangeCB && this.onStateChangeCB(newState, this);
	}

	setState(newState) {
		if (newState != this.isPressed()) {
			this.setPressedState(newState);
			super.onActivated();
			this.onStateChange(this.isPressed());
		}
	}

	isPressed() {
		return this.el.classList.contains("selected");
	}
	setPressedState(state) {
		this.el.classList.toggle("selected", state);
	}

}



// CommandButton is a Button that invokes a Atom command when clicked. It is constructed from the command name and handles the
// onActivatedCB itself. It gleans default values to create a tool tip
// properties
// Params:
//     cmdName  : the Atom command that the button will invoke. Same syntax as keymaps.
//     [name:][icon-<icnName> ][label] : The second parameter is a string that contains 1 to 3 attributes of the button.
//           name : variable-like name used for the button. Useful to identify which button was activated when multiple buttons share
//                a single onActivatedCB callback. A container component may also use this as the property name to store this button in.
//           icon-<icnName> : a name of one of the icons in the Atom Style Guide (ctrl-shift-G). The icon will appear to left of label
//           label: The text displayed in the button.
//     options  : an object with various optional keys
// Options:
//     target   : target context node for the command. default is atom.workspace.getElement()
//     <DOM properties and styles>    : See Component
//     children : array of children components passed to Component::mount. See Component::mount
export class CommandButton extends Button {
	constructor(tagIDClasses, cmdName, ...options) {
		super(tagIDClasses, {paramNames:'target'}, ()=>this.onClick(),  ...options);
		this.cmdName = cmdName;

		this.cmdTarget = this.optParams["target"] || atom.workspace.getElement();
		const allCommands = atom.commands.findCommands({target: this.cmdTarget});
		const command = allCommands.filter((command) => command.name === cmdName)[0] || {displayName:'unknown', description:'unknown'};

		if (!this.getLabel() && !this.iconName) {
			this.setLabel(command.displayName);
			this.toolTipTitle = command.description;
		} else
			this.toolTipTitle = command.displayName;

		setTimeout(()=>{
			this.toolTipDispose = atom.tooltips.add(this.el, {title: this.toolTipTitle, keyBindingCommand: this.cmdName}); //,  keyBindingTarget: this.cmdTarget
		}, 1000);
	}
	onClick() {
		atom.commands.dispatch(this.cmdTarget, this.cmdName);
	}
	destroy() {
		this.toolTipDispose.dispose();
		super.destroy();
	}
}



// OneShotButton stays pressed when its activated and wont fire its onActivatedCB again until it is reset. Calling reset or
// setPressedState(false) makes it appear unpressed and it can then be pressed (activated) again. It is used by RadioButtonGroup
// which resets all the other buttons when any button in the group is pressed.
// Params:
// This uses the ComponentParams flexible parameters. The params important to this class are mentioned but others are supported too.
//    <bgNodeID>  : string in the ComponentParams::<tagIDClasses> format to specify the button name and optionally other things
//    <onActivatedCB>(btn) : (default for unnamed function parameters) a callback function invoked when this button is activated
//                 by click or keyboard. This button object is passed to the callback.
//    <pressed>  : if true, the button will start in the pressed state
//    <focusOnMouseClick> : if true, change the focus to the button when its clicked with the mouse. This is the default for html
//         buttons but this component changes it so that it will not steal the focus with mouse clicked. The user can still give
//         it the focus by keyboard navigation. Setting this option to true, returns to the default behavior where the focus will
//         be left on the button after clicking. Typically toolbar buttons should not steal the focus but form buttons may want to.
// See Also:
//    ComponentParams : to see what other parameters are accepted by this class constructor
//    Button : for common behavior to all button hierarchy classes
export class OneShotButton extends ToggleButton {
	constructor(bgNodeID, ...options) {
		super({nameForCB:'onActivatedCB'}, bgNodeID,  ...options);
	}
	reset() {
		this.setPressedState(false);
	}
	onActivated(e) {
		if (!this.isPressed()) {
			super.onActivated(e);
		}
	}
}

// A RadioButtonGroup is a container of components that support the setPressedState(true|false) method and the onStateChangeCB=(value)=>{} property.
// The OneShotButton component is typically use and is the default that will be used to create children when the constructor parameter includes
// component construction arrays for content.
// When any of the children components fire their activation event, the 'value' property of the RadioButtonGroup will be updated and all the
// other children will have their setPressedState(false) methods called. The effect is that exactly one child will be in the pressed at a time.
// Params:
//    <tagIDClasses>  : string in Component::tagIDClasses format to typically specify the name and additional classes.
//    <initialValue>  : the child name that will be pressed initially
// Options:
//    Options can be specified in a flexible way. See ComponentParams
//    <unamedCB>      : a callback that gets called whenever the value changes. value is passed to the callback.
//    <content>       : the child content should consist typically of two or more components like ToggleButton that support the
//                         <component>.setPressedState(true|false) method.
//                         <component>.onStateChangeCB=(state, button)=>{...} property.
//                      See ComponentParams for information about specifying child content. The OneShotButton component is the default
//                      child component that will be constructed from construction data arrays in the content.
//    <DOM properties and styles>    : See ComponentParams
export class RadioButtonGroup extends Component {
	constructor(tagIDClasses, initialValue, ...options) {
		super(tagIDClasses, {defaultConstructor:OneShotButton}, '$div.btn-group.mutex', ...options);
		this.value = initialValue;

		// since we did not create the child buttons directly, iterate them to set our callback which implements the mutually exclusive nature
		// if a child does not support onStateChangeCB, we expect it will ignore it and this will do no harm
		for (const child of this.mounted) {
			this[child].onStateChangeCB=(state, button)=>{if (state) this.setValue(button.name)};
		}

		this.setValue(this.value);
	}

	setValue(buttonName) {
		for (const child of this.mounted)
			this[child].setPressedState && this[child].setPressedState((child == buttonName));
		if (this.value != buttonName) {
			this.value = buttonName;
			this.fireOnChangeCB(buttonName);
		}
	}
}
