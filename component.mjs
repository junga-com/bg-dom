import {
	ComponentMount, ComponentUnmount,
	ComponentReplaceChildren, bgComponent, reHTMLContent, ComponentGetMountedName,
	lifeCycleChecker,
	ComponentReplaceChild,
	ComponentToEl,
	ComponentToBG,
	ComponentGetParent,
	ComponentNormalize,
	ComponentMountAdd,
	ComponentDestroyChild,
	ComponentDestroyChildren,
	ComponentAppendChild,
	ComponentInsertBefore,
	ComponentRemoveChild,
	ComponentConstruct,
	ComponentGetName,
	ComponentGet,
	ComponentMakeDOMNode,
	ComponentDestroyDOMNode
}                                from './componentCore';
import { ComponentParams }       from './ComponentParams';
import { Disposables }           from './Disposables';
import { RegisterGlobalService } from './GlobalServices';
import { BGError }               from './BGError';

// LifeTest tracks all Component instances and records when significant state tranisitions ocur. When this is enabled, none of them
// will be garbage collected b/c the tracking mechanism keeps strong references to each component.
// If destroy is called on a component, we assume that it and its coresponding dom object will be eligible for GC but that is not
// necessarily true. If destroy has not been called, they difinately wont be GC'd so making sure destroy is called is the first step.
const LifeTest=true;

// GCTest uses the FinalizationRegistry to track how many component instances have been garbage collected vs created. FinalizationRegistry
// is not yet available in nodejs. Its available in nodejs 13.x with a harmony flag.
export const GCTest  =true && (global.FinalizationRegistry);


// Component is a base class to make writing DOM components easier.
// The spirit of this Component class is to provide a clean, concise, powerful syntax for the developer to build the DOM structure
// with interactive components explicitly.
//
// Towards this goal there is a notion that for identification purposes a DOM node and a non-DOM object that represents and extends
// it are the same. The componentCore library provides efficient bidirectional navigation between them. This Component class provides
// one possibility of non-DOM object that extends a DOM object but the the meat of this class's implementation is in the componentCore.js
// library. The Button Hierachy is another example that is not related to this class but can be used very similarly becasue it also
// deferes much of its implementation to componentCore.js. Both DOM nodes and non-DOM objects that use componentCore.js to extend DOM
// nodes can be passed arround interchangably. The library functions that operate on these objects take advantage of efficient
// navigation between the objects that represent the same node.
//
// This component class does not use a render pattern and does not try to get involved automagically with reducing DOM changes for
// the developer.
// Instead it provides a clean syntax for the developer to create their component instance structure which produces the corresponding
// DOM structure. The developer then takes the responsibilty of modifying the DOM as needed in response to its own behavior.
//
// When building the Component/HTML hierachy the developer can name important components and leave unnamed Components that are not
// interesting to the interactive operations. This allows the HTML structure to vary without disrupting the code that drives the
// behavior. Named components become properties of the Parent named component. Code in a Component can always refere to itself even
// if it is unamed.
// TODO: the comment above describes a work in progress. The rules for how named references bubble are still forming.
//
// Features:
//    * uses ComponentParams class to create a compact, flexible constructor syntax. (Note you can create your own component base
//      class that uses ComponentParams to provide compatible constructor syntax
//    * get/set label whichis the direct text content of this node. The label can be easily specified in the construction syntax
//    * mount/umount methods to add/remove children easily. See Component::mount for details. Lifecyle of children are managed.
//       ** named children become properties of the component so that code can easily navigate to them via <parent>.<childname>.
//    * collects multiple content/children parameters in the constructor and uses mount() to make them children
//    * onmount,onunmount, and onremount virtual functions can be overridden (feature from redom)
//
// Examples:
//     new Component('$span.explanation This is how it is done'); // <span class="explanation">This is how it is done</span>
//     new Component('explanation:$span This is how it is done'); // 'explanation' will be a class and also the name used for component navigation.
//     new Component({color:'blue'});                            // CSS styles...
//     new Component({tabIndex:3});                              // DOM properties...
//     new Component(new Component('myChild:.leftSide'));        // sub component child content
//     new Component(treeView.getElement());                     // DOM node child content
//     new Component('How you doin?');                           // Set direct text content of the new DOM node
//     new Component('<div><div>How you doin?</div><div>Wasss uuppp!</div></div>');        // Define the DOM node directly with HTML
//     new Component([new Component('Hi'), new Component('there'), ['yall']]);             // multiple child node content
//     new Component({color:'blue'}, {tabIndex:3}, new Component('yes'), 'myCom:$span.bigger'); // many parameters, in any order will work.
//
//     new Component('increaseFont:$button.coolLook Make it bigger', {
//         onClick: () => {this.increaseFont(1)},
//         color: 'blue'
//     })
//
// Note a few things...
//     * an arbitrary number of string, object, or function construction parameters can be specified in any order.
//     * information in parameters on the left, override the same information provided by parameters on their right.
//     * a string parameter will always be parsed as a tagIDClasses syntax
//       * the string parameter is the text label by default but can be adorn with the component name, tag, id, can classes.
//     * parameters that are Component instances, DOM Nodes, and Arrays will be recognized as child content to add.
//     * Any other object parameter will be a container for any number of named parameters.
//
// Params:
// The constructor implements a free form parameter list. Parameters are distringuished by type.
//     type:string  : tagIDClasses syntax for encoding name,tagName,idName,classList,iconName,textContent
//                   [name:][$<tagName>][#<idName>][.className1[.className2...]][ icon-<name>][ textContent]
//     type:object<component> : child content components. extending HTMLElement or being a DOM node or an object with an 'el' attribrute
//     type:array             : array of child components. all elements are interpretted as content so strings becomes text elements
//     type:object<other>     : Parameter Object where keys can be any of the param names listed below
//     type:function          : unamed callback to be added to default callback list
// Named Params
//    tagIDClasses : shortcut syntax multiple common data about the component.
//                   [name:][$<tagName>][#<idName>][.className1[.className2...]][ icon-<name>][ textContent]
//                   Note that each part of this string has a unique character that identifies it. name's character is a suffix,
//                   the others are prefix. If present, each part must be in the given order.  The first space or comma will cause
//                   everything after it to be textContent even if it contains one of the speacial characters (:$#.). If the text
//                   content starts with a valid html tag (<something... >), textContent will be treated as HTML, otherwise it will
//                   be plain text. If you want valid HTML to be treated as plain text, prefix it with an extra space.
//                   If you are only providing textContent in the string that comes from a variable, it is safest to prefix it with
//                   a space or comma in case the text happens to contain a [:$#.] character before the first space or comma.
//    name:string    : a variable name used for this component. Typically this makes sense relative to its parent.
//                     * Will be added to classList so its a shortcut for adding this one, special className
//                     * If this component is mounted to a parent component, it will be available as <parent>.<name>
//    tagName:string : <tagName> The name of the dom/html element type. <div> is the default.
//    idName:string  : #id property on the DOM object. Should not be used for reusable components but useful for high level singlton components.
//    class:stringSet: space separated list of classNames
//    label:string   : text that will be set as the direct content of the node. If it begins with a tag it will be parsed as html.
//    content:<multiple> : innerHTML specified in multiple ways -- text, html, DOM node, Component instance, or an array of multiple of those
//    paramNames:stringSet: (specified by derived classes) space separated list of additional parameter names that this type of component supports.
//    defaultCB:function: a function that will be registered in the component's default callback event.
//    <Additional Component properties>  :<any> : any name documented by any class in the component hierarchy being created can specified
//    <Style properties>:string: any style name can be specified. This library maintains a map of known style names. If you find that
//                   it does not recognize the name you specify as a style, you can force it by moving it into a {styl: ..} sub-object.
//    <DOM properties>:string: any name that is not otherwise recognize will be set in the DOM Node that is created.
// See Also:
//    ComponentParams
// Usage:
//    new Component(<tagIDClasses> [,<content>] [,options] [,<callback>])
export class Component
{
	static logStatus()
	{
		if (!GCTest && !LifeTest) {
			console.log('no runtime debugging information for Components are enabled. See component.js GCTest and LifeTest constants');
		}

		GCTest && console.log((''+Component.unCollectedCount).padStart(6)+' : instances not yet garage collected');

		lifeCycleChecker && lifeCycleChecker.logStatus();
	}

	constructor(...p)
	{
		const componentParams = new ComponentParams(...p);

		// if you give the Component the param {trace:true} it will set this.trace and you can do if (this.trace) console.log(...) ;
		if (componentParams.trace)
			this.trace = componentParams.trace;

		// this implements dynamic construction where the parameters determine the specific component class to construct
		// TODO: assert that componentParams.Constructor derives from Component?
		if (componentParams.Constructor && componentParams.Constructor  != new.target)
			return new componentParams.Constructor(componentParams);

		// b/c we pass in 'this' to ComponentMakeDOMNode it will initialize this with all the properties expected of a bgComponent. We do
		// this before setting any other this.props so that the memory layout of all bgComponent will share a common layout up to
		// that point. This is not functional in the code but may aid in some transparent runtime optimizations.
		// properties set: name, mounted, mountedUnamed, el, bgComponent
		ComponentMakeDOMNode(componentParams, this)

		this.disposables = new Disposables();
		this.componentParams = componentParams;
		this.optParams = this.componentParams.optParams;
		this.defaultChildConstructor = componentParams.defaultChildConstructor;

		if (GCTest) {
			Component.instFinalChecker.register(this);
			Component.unCollectedCount++;
		}

		// TODO: consider treating text content as any other content which gets appended to 'content' array as thery are encountered
		//       instead of reducing them to one 'label'
		// TODO: consider if getLabel/setLabel methods should be moved to a derived "Input extends Component" class.
		// TODO: consider renaming label to something like 'stringContent'
		if (this.el && this.componentParams.optParams.label) {
			this.label = this.componentParams.optParams.label;
			if (/^@HTML/.test(this.label) || reHTMLContent.test(this.label))
				this.el.innerHTML = this.label.replace(/^@HTML/,"");
			else
				this.el.innerText = this.label.replace(/^@TEXT/,"");
		}

		if (this.el && this.componentParams.content)
			this.mount(this.componentParams.content);

		// if there is a defaultCB and the derived class did not specify a defaultCBName to capture it for its own purposes,
		// assign it to the onclick attribute -- the most generic of DOM callbacks.
		//  If a derived class whats to support the default callbacks in a different way, they should specify {defaultCBName:'<someName>'}
		if (!this.componentParams.defaultCBName.capturing && this.componentParams.callbacks['defaultCB'].length > 0) {
			this.el.onclick = this.componentParams.getCompositeCB('defaultCB');
			// consume the defaultCB so that something else does not use it for another purpose (see comment above)
			this.componentParams.callbacks['defaultCB'] = [];
		}
	}

	destroy() {
		this.disposables.dispose();
		deps.objectDestroyed(this);
		ComponentDestroyDOMNode([this, this.el, this]);
	}

	getParent()      { return ComponentGetParent(this); }
	toEl()           { return this.el; }
	getName()        { return ComponentGetName(this); }
	getMountedName() { return ComponentGetMountedName(this); }

	// These 4 methods are compatible with the same named methods from DOM:Node (older API from Node)

	// Add the specified child content to the end of this component's children
	// Params:
	//    <childContent> : this can be a single child DOM Node/Element just like Node.appendChild but it can also be a variable
	//            length list of child content and each one can be any bgComponent or a string or an array of Component construction
	//            parameters.
	appendChild(...childContent) {
		ComponentAppendChild([this, this.el, this], ...childContent);
	}

	// Add the specified child content before the specified <insertBefore> child.
	// Note that the order of the parameters are reversed compared to the Node.insertBefore which allow a variable number of
	// <childContent> parameters.
	// Params:
	//    <referenceChild> : an existing child of this component that the new <childContent> will be inserted before.
	//    <childContent> : this can be a single child DOM Node/Element just like Node.appendChild but it can also be a variable
	//            length list of child content and each one can be any bgComponent or a string or an array of Component construction
	//            parameters.
	insertBefore(referenceChild, ...childContent) {
		ComponentInsertBefore([this, this.el, this], referenceChild, ...childContent);
	}
	removeChild(...childContent) {
		ComponentRemoveChild([this, this.el, this], ...childContent);
	}
	replaceChild(child, newContent) {
		ComponentReplaceChild([this, this.el, this], child, newContent);
	}

	// From Parent (newer API from ParentNode interface implemented in Element. these are similar to the older DOM API above)
	append(...childContent) {
		ComponentAppendChild([this, this.el, this], ...childContent);
	}
	prepend(...childContent) {
		ComponentInsertBefore([this, this.el, this], this.el.firstChild, ...childContent)
	}
	replaceChildren(...childContent) {
		ComponentReplaceChildren([this, this.el, this], ...childContent);
	}

	// From child (newer API from ChildNode interface implemented in Element)
	remove() {
		ComponentRemoveChild(this.parent, this);
	}
	replaceWith() {
		ComponentInsertBefore(this.parent, this, ...childContent)
		this.remove();
	}
	after(...childContent) {
		ComponentInsertBefore(this.parent, this.el.nextSibling, ...childContent)
	}
	before(...childContent) {
		ComponentInsertBefore(this.parent, this, ...childContent)
	}



	// add children to this Component.
	// Note that there is a family of methods for adding child content that use this mount method. You may want to use one of those
	// instead of mount directly. Those methods are named after corresponding DOM functions.
	//
	// This is a wrapper over the <domNode>.appendChild/insertBefore methods. It adds two features.
	//    1. The child content can be specified in more flexible ways
	//    2. It maintains named links in the parent to the child under these circumstances
	//        * If a name is available for a child node
	//        * the parent has the [bgComponent] key (indicating that it is opting into this behavior)
	//
	// ChildContent Types:
	// Several types of children content are supported.
	//     component : object(w/.el)       : any JS object with a 'el' property (el should be a DOM Node)
	//     DOMNode   : object(w/.nodeType) : DOMNodes are identified by having a 'nodeType' property
	//     plain text: string(s[0]!="<")   : Plain text will be appended as a text node.
	//                                       Prepend string with '@TEXT' to force it to be treated as plain text and not html
	//     html text : string(s[0]=="<")   : text starting with '<' will be converted to a component whose outerHTML is the provided text
	//                                       Prepend string with '@HTML' to force it to be treated as html and not plain text
	//     multiple Children : array       : multiple children can be given in an array. Each array element can be any of the
	//                                       supported types including a nested array. Array nesting will not affect how the child
	//                                       hiearchy is built -- all children will be traversed and added to this component directly.
	//                                       The one difference is if name is specified and content is an array, the <name> property
	//                                       created in the parent will be an array with elements poiting to the children. Any
	//                                       children in the array that have a name property will have a reference added as that
	//                                       name reardless of whether the array itself is named. Typically, arrays will not be named
	//                                       and there is no difference between adding the children individually or within an array.
	// Params:
	//    name:string          : the variable-like name of the child. If not provided, <childContent>.name will be used. If that
	//                           does not exist, childContent will be unamed with regard to its parent.
	//                           The special name 'unnamed' is recognized as no name being pass. This could be useful to avoid ambiguity
	//    childContent:<multi> : the content to be added to this component's children. It can be given in any of the types described above.
	//    insertBefore:object  : (optional) the existing child to insert childContent before as a DOM Node or component object.
	//                           Default is append to end fo existing
	// Usage:
	// Note that if first param is a single word content and the insertBefore is specified it will incorrectly be interpreted as
	// Form1.  You can pass 'unnamed' as the first paramter avoid ambiguity and still result in an unnamed child.
	//    Form1: <obj>.mount(<name>, <childContent> [,<insertBefore>])
	//    Form2: <obj>.mount(<childContent> [,<insertBefore>])
	mount(...p) {
		return ComponentMount([this, this.el, this], ...p);
	}

	// remove a child from this Component.
	// this does not destroy the child. the child object is returned
	// Params:
	//    <nameOrChild>  : the child being unmounted. Can be the bgComp (DOM node or BG node) or the string name of the child in
	//                     the context of this parent
	unmount(nameOrChild) {
		return ComponentUnmount([this, this.el, this], nameOrChild);
	}

	resetContent() {
		ComponentDestroyChildren([this, this.el, this]);
		this.setLabel("");
	}


	// override these to take actions when the component is added or removed from the DOM
	// mount/unmount events happen when the node is attached or removed from its direct parent
	// connected events happen when the node is part of a subtree that is mounted or unmounted to the main tree starting at document.documentElement
	onPreMount() {}
	onMount() {}
	onPreUnmount() {}
	onUnmount() {}
	onPreConnected() {}
	onConnected() {}
	onPreDisconnected() {}
	onDisconnected() {}

	getLabel() {return this.label || ''}

	setLabel(label) {
		this.label = label || '';
		if (/^@HTML/.test(this.label) || reHTMLContent.test(this.label))
			this.el.innerHTML = this.label.replace(/^@HTML/,"");
		else
			this.el.innerText = this.label.replace(/^@TEXT/,"");
	}

	fireOnChangeCB(...p) {
		return this.componentParams.getCompositeCB('defaultCB',true)(...p)
	}

	getSize() {
		var rect=this.el.getBoundingClientRect()
		return {x:rect.width, y:rect.height}
	}
	getClientSize() {
		return {x:this.el.clientWidth, y:this.el.clientHeight}
	}

	addTooltip(text,cmdForKeyBinding) {
		if (cmdForKeyBinding)
			this.disposables.add(atom.tooltips.add(this.el, {title: text, keyBindingCommand: cmdForKeyBinding}));
		else
			this.disposables.add(atom.tooltips.add(this.el, {title: text}));
	}

	hide() {this.el.style.display = 'none';}
	show() {this.el.style.display = null;}  // setting to null removes the inline style letting the next cascade value take affect.

	focus() {this.el.focus()}
	blur()  {this.el.blur()}

	// usage: setClass(theClass, enabled=true)
	// add a single class to the component. If enable is false, it removes the class instead. This is a convenient way to add or
	// remove a class based on a bolean value.
	setClass(theClass, enabled=true)
	{
		if (enabled)
			this.el.classList.add(theClass);
		else
			this.el.classList.remove(theClass);
		return enabled;
	}

	addClasses(...classes) {
		classes = classes.flat();
		var classArray=[];
		for (var cls of classes) {
			if (cls) {
				if (typeof cls != 'string')
					throw new BGError("DOM classes must be a string item is '"+(typeof cls)+"'", {classes, cls});
				classArray = classArray.concat(cls.split(/[:,\s]+/));
			}
		}
		classArray = classArray.filter(cls=>(!!cls));
		if (classArray.length>0)
			this.el.classList.add(...classArray)
	}


	toEl() { return this.el; }
	getName() { return ComponentGetName(this); }
	getMountedName() { return ComponentGetMountedName(this); }
}

// expose some Component... functions as static methods of component
Component.sym            = bgComponent;
Component.mount          = ComponentMount;
Component.unmount        = ComponentUnmount;
Component.replaceChildren = ComponentReplaceChildren;
Component.replaceChild   = ComponentReplaceChild;
Component.toEl           = ComponentToEl;
Component.toBG           = ComponentToBG;
Component.getParent      = ComponentGetParent;
Component.normalize      = ComponentNormalize;
Component.mountAdd       = ComponentMountAdd;
Component.destroyChild   = ComponentDestroyChild;
Component.appendChild    = ComponentAppendChild;
Component.insertBefore   = ComponentInsertBefore;
Component.removeChild    = ComponentRemoveChild;
Component.construct      = ComponentConstruct;
Component.getName        = ComponentGetName;
Component.getMountedName = ComponentGetMountedName;
Component.get            = ComponentGet;
Component.wrapNode       = ComponentParams.wrapNode;

lifeCycleChecker && (Component.lifeCycleChecker=lifeCycleChecker)


if (GCTest) {
	Component.unCollectedCount=0;
	Component.instFinalChecker = new FinalizationRegistry((heldValue) => {
		Component.unCollectedCount--;
	})
}


RegisterGlobalService('1.0.0', null, 'bg',       ()=>Object.create(null))
RegisterGlobalService('1.0.1', bg,   'Component',()=>Component)
