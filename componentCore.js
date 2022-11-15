import { BGError }            from './BGError';
import { ComponentParams }    from './ComponentParams'
import { domTreeChanges }     from './DomHooks'

import { el as redomHtml }    from 'redom';


// Library componentCore
// This library implements the core bgdom component functionality that is used by the Component and Button (and other?) class
// hierarchies.
//
// bgComponents extend DOM nodes by creating a JS object with an 'el' property that points to its corresponding DOM node. A GC
// friendly form of backlink from the DOM node to the JS object is provided by a WeakMap. This library provides functions that
// miorror the DOM functions to build the hierarchy that will accept either a native DOMNode (ie. Element) or a java object linked
// to a native DOMNode. Many DOMNodes will not have corresponding 'extra' objects but every 'extra' object (aka BGNode) will be linked
// to a DOMNode.
//
// A major motivation is to allow bgComponents to have named children to make writing functions and methods more natural. For eample,
// a view bgComponent could have named members for the various children that make up the view so that they can easily be scripted
// to provide functionality. myView.expandBtn.click().
//
// Terminology:
//     DOMNode : the native JS object used by the browser. i.e. document.createElement('div') returns a DOMNode.
//     BGNode   : a JS object that extends a DOMNode. Its 'el' property points to the DOMNode. a weakmap allows ComponentToBG to
//                navigate from a DOMNode to its BGNode if one exists.
//                The BGNode objects created by this library additionally has the bgComponent Symbol set which indicates that it
//                opts into the full navigation system.
//     BGComp   : can be either a BGNode or a DOMNode. Its imporatant for the user of this API to be able to work with nodes logically
//                without having to constantly deal with two objects so functions are typically written to receive and return BGComp
//                objects, and code that receives a BGComp typically uses [myBGNode,myDOMNode,myBGComp] = ComponentNormalize(myBGComp)
//                when it needs to access features specific to the DOM or internal BG system members.
//                You can think of it this way. Either a BGNode or DOMNode JS object identifies the logical node but when you want
//                to use a DOM feature or member variables that are only in the BGNode, you need to work with one specific JS Object
//                or the other.
//
// Hierarchies:
// DOMNodes form a well understood tree hierachy. BGNodes form a sparse reflection of the DOM tree hierarchy. Its sparse in two ways.
// First, in the horizontal dimension, when traversing the children of a BGNode, its DOMNode children that do not have BGNodes will
// not be traversed. Second, in the vertical dimension, when traversing the direct children of a BGNode, the DOMNode of a child
// might be an arbitrarily deep descendant of the DOMNode of the parent. i.e. the BGNode child can skip over some of the parent
// chain of the DOMNodes.
//
// The significance of the difference between the DOMNode hierarchy and the BGNode hierarchy is that the DOM hierarchy necessarily
// reflects the nuances of presentation whereas the BGNode hierarchy is free to more directly represent the logical structure of
// the data.
// Example -- A view component node has a checkbox input to toggle some state. Logically, the input is a direct descendant of the
// view but in order to display it correctly, with ARIA support, we decide to nest the <input> DOMNode within a <label> DOM node.
// furthermore, we may decide that we have to put the <label> node inside a <div> or <span> to achieve some presentation objective.
// The code that scripts the view should not have to change based on how we structure the DOMNode for presentation.
//
// We often think about HTML defining the structure of the DOM tree and CSS defines the presentation but any web designer knows that
// that separation is not actually independent. This allows another level of separation so that the BGNode hierarchy can more
// precisely represent the logical structure.
//
// BGNode <--> DOMNode Navigation:
// Given a BGNode we can get to its corresponding DOMNode (aka element) via its 'el' member variable. A BGNode must have an 'el'.
// The function 'DOMNode ComponentToEl(BGComp)' provides an abstraction for this navigation that also provides error checking and
// the property of idempotency, meaning that if BGComp has already been converted to its DOMNode it will return it unchanged.
//
// Given a DOMNode we can navigate to to its corresponding BGNode using a WeakMap. This allows us to leave the browser's DOMNode
// object untouched and also will not prevent Garbage Collection (GC) from recovering the pair of objects if nothing else references
// them.
//
// Duck Typing and Opting into the Full Navigation:
// A BGNode JS object does not have to be any particular type of object. This library duck types them. Many functions of this library
// will use the 'el' member variable of an object even if that object was not created by this library.
// However, features that modify the object passed in will not do so unless the object has the bgComponent Symbol set. You can allow
// third party objects to fully participat in the features of this library by assigning is bgComponent Symbol property.
//       e.g.   myObj[bgComponent] = true
//
// DOM Modification:
// Even though this library does not modify each individual DOMObject that it works with, the library does modify the DOM's Node
// and Element prototypes. It does this because it is the only way I can think of to generate efficient triggers for lifecyle
// methods (like onMount, onUnmount, etc...)
//
// Adding Properties and Attributes:
// Attributes are the HTML side of member variables and properties are the Javascript side. Properties are normal javascript member
// variables. Attributes are accessed with <DOMNode>.(has|get|set|remove)Attibutes and the <DOMNode>.attributes array. Attributes
// are always strings and properties can be any javascript type.
//
// We can think of each DOMNode having a fixed set of standard attributes based on it type (aka nodeName). Those attributes (with at
// least one exception) are automatically kept in sync for us by the DOM. We can read or write either way and they both will have
// the same value (except the attribute is always the string representation of the value).
//
// The 'value' attribute of <input> elements is one exception. Changes only flow from attribute to java object.
//
// We can add both custom attributes and custom java object properties but they will not be kept in sync by the DOM. Since this library
// links an additional javascript object to the DOMNode javascript object, we can put our custom properties there. We typically do not
// sync those with either the DOMNode javascript object nor its attributes because its easy and efficient to get the BGNode (the
// extra object) for a DOMNode.
//
// There are two reasons I know of that we might want to add a custom attribute. If the component is being created from html text,
// only custom attributes can be added in the tag text. (e.g. <div myCustomName="foo"). Second, custom attributes can be accessed
// in css via selectors like div[myCustomName="foo"]. Using a custom attribute like this is similar to using a class but whereas
// classes are single tags, attributes are name value pairs.
//
// Custom attribute names that start with 'data-' are treated specially by the DOM and are sync'd between corresponding javascript
// properties in e.dataset.<name>  where name is the attribute name with 'data-' removed. Note that attribute names are case
// insensitive. You can prefix a character in the dataset attribute name with '-' to make its corresponding character in el.dataset.<name>
// Capital. For example, the attribute 'data-my-var' would be el.dataset.myVar



// Symbols that we use to identify participating objects and to record their non-DOM parent and the name that that parent uses for it
export const bgComponent       =Symbol.for('bgComponent');
export const bgComponentName   =Symbol.for('bgComponentName');
export const bgComponentParent =Symbol.for('bgComponentParent');


// compiled common Regular Expressions
export const reEmpty        = /^\s*$/;
export const reHTMLContent  = /^\s*<[^>]+>/;
export const reVarName      = /^[_a-zA-Z][_a-zA-Z0-9]*(\[.*\])?$/;





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Navigating the DOM tree.

// usage: <DOMNode> ComponentToEl(<BGComp> bgComp)
// return the DOMNode associated with the object passed in. Use this instead of <bgComp>.el when <bgComp> is of unknown type and
// might already be a DOMNode.
// Note that the BGNodes created by this library can be identified by having the bgComponent property set but this function does
// not care if bgComp is one of ours. If it has an el that is a DOMNode, we're good.
// Params:
//   <BGComp> : this can be either a DOMNode already or an object with an <bgComp>.el which is a DOMNode
export function ComponentToEl(bgComp)
{
	if (bgComp) {
		if (bgComp.nodeType)    return bgComp;
		if (bgComp.el.nodeType) return bgComp.el;
	}
	throw new BGError("bgComp could not be identified as anything that leads to a DOMNode", {bgComp});
}

// usage: BGNode ComponentToBG(<bgcomp>, <forceFlag>)
// return the BGNode object associated with <el> (the DOMNode). If there is no BGNode object for this DOMNode, the <forceFlag>
// determines what to return.
//
// How We Associate BGNodes With DOMNodes:
// To be able to navigate from a DOMNode to its corresponding BGNode, we have to extend the DOMNode. Tradititionally it is problematic
// to extend the browser's objects but JS now has several facilities that make it more robust.
// A bgComponent can be a DOM node/element or an object that has an 'el' property that is the DOM node/element. Given an Object with
// an 'el' property, the el property navigates to the DOM node/element. To go the other way, we use a WeakMap instead of extending the
// DOM node. An alternate implementation would be to add a WeakRef property to the DOM node/element that points back to the associated
// object but WeakRef is not yet available in Atom's nodejs version.
//
// Params:
//    <bgcomp>    : typically a DOMNode but could also be a BGNode. If its not either of these it will throw an exeception regardless
//                  of the value of <forceFlag>
//    <forceFlag> : indicate what to return if there is no BGNode for a DOMNode passed in
//                  (default)  : throw exception
//                  'null'     : return null
//                  'force'    : return <bgcomp> even though its a DOMNode and not a BGNode
//                  'climb'    : climb up the parent chain of bgcomp to find a BGNode
export function ComponentToBG(bgcomp, forceFlag) {
	// we cant do nothin with nothin
	if (!bgcomp)
		throw new BGError("the bgcomp passed in is null or undefined", {bgcomp});

	// its already a BGNode
	if (('el' in bgcomp) && ('nodeType' in bgcomp.el))
		return bgcomp;

	// this is the typical, direct link
	var ret=ComponentMap.get(bgcomp);
	if (ret)
		return ret;

	// as long as bcomp is a DOMNode, its ok that we did not find a BGNode
	if (!(nodeType in bgcomp))
		throw new BGError("the bgcomp passed in is neither a BGNode nor DOMNode", {bgcomp});

	// now, what do do if there is no direct link
	switch (forceFlag) {
		case 'climb':
			if (!('parentElement' in bgcomp))
				throw Error("bgcomp is not a DOM Node because it has no parentElement member");

			console.assert(false, "please confirm that the 'climb' option to ComponentToBG is working and then remove this assert and the error msg below it");
			var p=bgcomp;
			while ((p=p.parentElement) && !(ret=ComponentMap.get(p)));
			console.warn("check this. ComponentToBG()", {passedIn:bgcomp, foundViaClimb:ret});
			return ret;

		case 'force':
			return bgcomp;

		case 'null':
			return null;

		default:
			throw new BGError("the bgcomp does not have a corresponding BGNode object", {bgcomp});
	}
}
export const ComponentMap = new WeakMap();


// usage: <BGComp> ComponentGetParent(bgComp)
// returns the best bgComp parent of bgComp
// it tries to return a BGNode but will return a DOMNode if it has to.
// if bgComp is null or it cannot find a parent, it throws an exception
export function ComponentGetParent(bgComp) {
	if (!bgcomp)
		throw new BGError("the bgcomp passed in is null or undefined", {bgcomp});
	const [bgObj, bgEl] = ComponentNormalize(bgComp);
	if (bgObj && (bgComponentParent in bgObj)) return bgObj[bgComponentParent];
	if (bgObj && bgObj.parent)                 return bgObj.parent;
	if (bgEl  && bgEl.parentElement)           return ComponentToBG(bgEl.parentElement, "force");
	throw new BGError("no parent could be found for bgComp", {bgComp});
}



// pass in bgComp as either the extra object associated with a DOM object or as the DOM object itself and it returns
// [<obj>,<el>,<either>] where <obj> or <el> may be null but <either> will never be null. If both exist, <either> will be <obj>
//
// Params:
//    <bgComp>  : a reference to a bgComponent which can be the DOM element or the business logic object associated with it
//    <forceFlag> : default false. If true the <obj> returned in the first array position will be <either> instead of <obj>
// Return Value:
//    [obj,el,either] : where....
//       <obj> : is the extra object associated with the DOM object (or null if there is none)
//       <el>  : is the DOM object itself.
//       <either> : is <obj> if it exists or <el> otherwise so that <either> is non-null unless <bgComp> is null
export function ComponentNormalize(bgComp) {
	// ComponentNormalize is idempotent so if an array is passed in, we can quickly return it. If the array only has two elements,
	// fill in the thrid <either> element so that ComponentNormalize always returns an rray with 3 elements.
	if (bgComp && Array.isArray(bgComp)) {
		if (bgComp.length == 2)
			bgComp.push(bgComp[0] || bgComp[1]);
		return bgComp;
	}
	if (bgComp && (bgComponent in bgComp))
		return [bgComp, bgComp.el, bgComp]
	const el  = ComponentToEl(bgComp);
	const obj = ComponentToBG(el);
	return [obj, el, obj||el]
}





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get the ID/name of a bgComp (which can be either a DOMNode or a BGNode).

// usage: <string> NodeTraceName(node)
// return a human friendly name for <node>.
// Params:
//    <node> : can be either a DOMNode or the extra obj (bgNode) that this library maintains for some DOMNodes
export function NodeTraceName(node)
{
	if (!node)
		return typeof node // null or undefined
	if (typeof node == 'string')
		return "(name:"+node+")"
	if (bgComponent in node)
		return "" +(node.constructor.name)+ ":" +(node[bgComponentName] || node.label)+ ":ch:" +node.mounted.length+ "/" +node.mountedUnamed.length+ "";
	if (typeof node == 'object')
		return ""+ (node.constructor.name)+ ":" +node.tagName+ "." +node.className;
	else
		return "(unexpected type)" + typeof node + ": " + node;
}

// usage: <string> ComponentGetName(<BGCComp> bgComp, <boolean> terseFlag)
// return the best name for the bgComp. If is has a name field, use that, otherwise use the makeTagIDClasses algorithm
export function ComponentGetName(bgComp, terseFlag) {
	if (!bgComp)
		return '';

	const [bgObj, bgEl] = ComponentNormalize(bgComp);

	if (bgObj)
		return bgObj[bgComponentName];
	else if (bgObj && typeof bgObj.name=='string')
		return bgObj.name;
	else
		return ComponentParams.makeTagIDClasses(bgEl, terseFlag);
}

// return the hierarchical name of this bgComp in the DOM
export function ComponentGetMountedName(bgComp, terseFlag) {
	var mountedName = ComponentGetName(bgComp, terseFlag);
	var p=ComponentGetParent(bgComp);
	while (p) {
		mountedName = ComponentGetName(p, terseFlag) + '/' + mountedName;
		p=ComponentGetParent(p);
	}
	return mountedName;
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mounting and Unmounting
// To be mounted, means that the bi directional link is established between parent and child BGComps.
// The DOM makes a link between the DOMNode of the parent and the DOMNode of the child.
// In addition to that a link is made betwen the BGNodes of parent and child.


// usage: ComponentMount(<parent>, <name>, <childContent> [,<insertBefore>])
// usage: ComponentMount(<parent>, <childContent> [,<insertBefore>])
// Form a parent<->child relationship between DOM Elements.
// This is a wrapper over the <domNode>.appendChild/insertBefore methods. It adds two features.
//    1. The child content can be specified in more flexible ways
//    2. It maintains named links in the parent to the child under these circumstances
//        * If a name is available for a child node
//        * the parent has the [bgComponent] key (indicating that it is opting into this behavior)
//    3. if a child is not named, it forms an unnamed relationship
//
// ChildContent Types:
// Several types of children content are supported.
//     component : object(w/.el)       : any JS object with a 'el' property (el should be a DOMNode)
//     DOMNode   : object(w/.nodeType) : DOMNodes are identified by having a 'nodeType' property
//     plain text: string(s[0]!="<")   : Plain text will be appended as a text node.
//                                       Prepend string with '@TEXT' to force it to be treated as plain text and not html
//     html text : string(s[0]=="<")   : text starting with '<' will be converted to a component whose outerHTML is the provided text
//                                       Prepend string with '@HTML' to force it to be treated as html and not plain text
//     multiple Children : array       : multiple children can be given in an array. Each array element can be any of the
//                                       supported types including a nested array. Array nesting will not affect how the child
//                                       hiearchy is built -- all children will be traversed and added to this component directly.
//                                       The one difference is if name is specified and content is an array, the <name> property
//                                       created in the parent will be an array with elements pointing to the children. Any
//                                       children in the array that have a name property will have a reference added as that
//                                       name regardless of whether the array itself is named. Typically, arrays will not be named
//                                       and there is no difference between adding the children individually or within an array.
// ComponentUnmount:
//     To avoid memory leaks, ComponentMount and ComponentUnmount should be called in matching pairs. If you call ComponentMount
//     then you should call ComponentUnmount to undo the cyclic references when the dom element is no longer needed.
//
// Params:
//    <parent>       : the parent to mount the children to
//    <name>         : the variable-like name of the child being added in the context of the parent.
//                     If not provided, <childContent>.name will be used. Normaly names like this are a property of the parent and
//                     not the child but in the case of the DOM tree, there is a single hierarchy so the usual problem is less of a
//                     problem and it makes for a much nicer syntax to create content trees b/c the children can be specified in
//                     arrays with their names embedded in their state.
//                     If no name exist, the childContent will be unamed with regard to its parent.
//                     The special name 'unnamed' is recognized as no name being passed. This is useful in overriding a child's name property
//    <childContent> : the children to be mounted to this component. It can be given in any of the types described above.
//    <insertBefore> : (optional) the existing child to insert childContent before as a DOMNode or component object.
//                     Default is append to end of $parent. Unlike the plain DOM API, this can be a non-direct descendant of $parent.
//                     If you want to mount the child at the end of a descendant node, pass in <insertBefore> as an object with
//                     the property "appendTo" like... , {appendTo:<descendant node>}).
// Usage:
// The name parameter is optional but for readability, it must be in the p1 position if provided.
// Note that if the p1 param is a single word content and the insertBefore is specified it will incorrectly be interpreted as
// Form1.  You can pass 'unnamed' as the first paramter to avoid this ambiguity and still result in an unnamed child.
//    Form1: ComponentMount(<parent>, <name>, <childContent> [,<insertBefore>])
//    Form2: ComponentMount(<parent>, <childContent> [,<insertBefore>])
export function ComponentMount($parent, p1, p2, p3, trace) {
	// detect form1 and form2
	var name, childContent, insertBefore;
	// if p3 is specified the user must have called with 3 params so it must be form 1
	// The only other form 1 cases is when p2 is specified and p1 is a valid name
	// When p1 is content that happens to also be a valid name and insertBefore is specified, it will be incorrectly classified.
	const p2Specified = (typeof p2 != 'undefined');
	const p3Specified = (typeof p3 != 'undefined');
	const p1CanBeAName= (typeof p1 == 'string' && reVarName.test(p1));
	if ((p3Specified) || (p2Specified && p1CanBeAName)) {
		name         = p1; if (name == "unnamed") name='';
		childContent = p2
		insertBefore = p3
	} else {
		childContent = p1
		insertBefore = p2
	}

	console.assert($parent, "ComponentMount called with null parent", {$parent, name, childContent,insertBefore})
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);



	// when specifying children content, sometimes its convenient to allow the expression to result null, so just ignore this case
	if (childContent == null)
		return;

	// check the content type. some types need special treatment and some are invalid.
	switch (typeof childContent) {
		// ChildContent can be null but not undefined. This is either a logic error in Form1/Form2 detection or the caller explicitly
		// passed 'undefined' as the content
		case 'undefined':
			console.assert(false, "encounted undefined ChildContent. null is ok but not undefined.");

		// string content can be either plain text content or the html describing a subtree (determined by the reHTMLContent RegExp)
		case 'string':
			var element;
			if (/^@HTML/.test(childContent.trim()) || reHTMLContent.test(childContent)) {
				element = document.createElement('div');
				element.innerHTML = childContent.trim().replace(/^@HTML/,"");
				element = element.firstChild;
			}
			else
				element = document.createTextNode(childContent.replace(/^@TEXT/,""));

			childContent = element;
			break;

		case 'object':
			// iterate an array of children and recursively add them
			if (Array.isArray(childContent)) {
				for (var i =0; i<childContent.length; i++) {
					var aryElement = childContent[i]

					// if its an array, since its nested inside the childContent array (this block) treat it as construction
					// parameters to ComponentConstruct. If the parent has a defaultChildType property it will be added to the
					// params as the 'defaultConstructor' so that it will be used for the 'Constructor' if the params do not
					// specify one
					if (Array.isArray(aryElement)) {
						aryElement = ComponentConstruct(
							(parent.defaultChildType) ? {defaultConstructor:parent.defaultChildType} : null,
							...aryElement);
					}
					// call ComponentMount explicitly with all the params to avoid any ambiguity -- if insertBefore is undefined, pass null
					var mountedChild = ComponentMount([parentObj, parentEl, parent], (!name || name.endsWith("[]"))?name:name+"[]", aryElement, insertBefore || null, trace);
				}
				return childContent;
			}
			//else any other object does not need special treatment and drops though to the rest of the method
			break;

		default:
			console.assert(false, "Invalid arguments. ChildContent needs to be an object, array or string", {childContent:childContent,p1:p1,p2:p2,p3:p3, type:typeof childContent});
	}

	if (typeof childContent.onPreMount == 'function')
		childContent.onPreMount()

	const [childObj,  childEl, child ] = ComponentNormalize(childContent);

	const isConnecting = parentEl.isConnected && ! childEl.isConnected;

	if (isConnecting)
		FireDOMTreeEvent(child, bgePreConnected);

	// do the work
	if (insertBefore) {
		if ("appendTo" in insertBefore) {
			const appendToEl = ComponentToEl(insertBefore["appendTo"]);
			appendToEl.appendChild(childEl);
		} else {
			const insertBeforeEl = ComponentToEl(insertBefore);
			if (!insertBeforeEl || !('parentNode' in insertBeforeEl) || !insertBeforeEl.parentNode)
				throw new BGError("insertBefore could not be converted to a DOM node", {insertBefore, parent,p1,p2,p3})

			// We allow insertBeforeEl to be a non-direct descendant. Maybe we should check and assert that insertParent is a descendant
			// of parentEl.
			const insertParent = insertBeforeEl.parentNode
			insertParent.insertBefore(childEl, insertBeforeEl);
		}
	} else {
		parentEl.appendChild(childEl);
	}

	if (isConnecting)
		FireDOMTreeEvent(child, bgeConnected);

	// since we just added child's el to parent's el, we can use ComponentMountAdd to for the link relationships
	ComponentMountAdd([parentObj, parentEl, parent], name, [childObj,  childEl, child ],   trace);

	return child;
}

// This mounts a child that is already a DOM node descendant of $parent into a named child
// Component Parent/Child Relationships:
// This function is the definitive location for bulding the parent/child. ComponentMount calls this after it joind the DOM elements
export function ComponentMountAdd($parent, name, $child, trace) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	const [childObj,  childEl,  child ] = ComponentNormalize($child);

	// if name was not explicitly passed in, see if we can get it from the content
	//BGDomLinks
	if (!name && child && (bgComponentName in child))
		name = child[bgComponentName];
	if (!name && child && typeof child.name == 'string')
		name = child.name;

	// make the obj level parent/child relationship link

	// add a member in the parent with the child's name pointing to the child
	if (bgComponent in parent) {
		if (name) {
			var match
			if (match=/^(?<basename>[^[]+)\[(?<index>.*)\]$/.exec(name)) {
				if (!Array.isArray(parent[match.groups.basename]))
					parent[match.groups.basename] = [];
				if (!match.groups.index) {
					match.groups.index = parent[match.groups.basename].length;
					name = match.groups.basename+"["+match.groups.index+"]"
				}
				if (parent[match.groups.basename][match.groups.index] && parent[match.groups.basename][match.groups.index]!=child)
					throw new BGError("the child's name in the parent is being used by something else",{childName:name, inParent:parent[match.groups.basename][match.groups.index], parent});
				parent[match.groups.basename][match.groups.index] = child;
				console.assert(parent[match.groups.basename][match.groups.index]);
			} else {
				console.assert(! /\[/.test(name),{name})
				if (parent[name] && parent[name]!=child)
					throw new BGError("the child's name in the parent is being used by something else",{childName:name, ParentAlreadySetWith:parent[name], parent, child});
				parent[name] = child;
			}

			if (!parent.mounted)
				parent.mounted = [];
			parent.mounted.push(name);
			if (childEl && childEl.classList) childEl.classList.add(name);

		} else {
			if (!parent.mountedUnamed)
				parent.mountedUnamed = [];
			parent.mountedUnamed.push(child);
// 2022-11 bobg: removing the pullup mechanism because I could not find any code in the older packages that rely on it and its too
//               problematic. We should replace it with a mechanism to specify containingContent and store the link ('containingEl')
//               to the higher node explicitly so that we manage children in el and containingEl can participate in the parent link (when needed)
// 			// this block pulls named bgComp components up through unamed components. For example, in a view component you create
// 			// a bunch of content, some named so that you can interact with them in the view's methods but some of the named components
// 			// are grouped in unamed panels for display organization. This block makes those unamed panels transparent wrt naming
// 			// so that the named components are accesible in the view as if they were not in the nested panels.
// 			// 2022-11 bobg: this caused problems when writing the VariablesView of the bg-atom-bash-debugger plugin.
// 			//               BGDBVarSimple has named children (vname,vtype,vvalue). We add many BGDBVarSimple nodes to
// 			//               the table and since they were unnamed, this block would pullup (vname,vtype,vvalue) into the table
// 			//               overwriting them with each new BGDBVarSimple and then destroying the view led to errors for the unmatched.
// 			//               This also revealed that deleting the named children from this unnamed obj is a bad idea because
// 			//               The BGDBVarSimple class my have logic that uses them.
// 			//               Changes:
// 			//                   1) I changed this code to throw an error if it would have overwritten something
// 			//                   2) I changed VariablesView to name the BGDBVarSimple rows (I added better support for name child arrays)
// 			// TODO: the .root mechanism is an opt out mechanism to prevent pullups. Maybe we should flip that to an opt in mechanism.
// 			//       I am not doing that now because I dont want to stop and find the places that rely on this pullup
// 			//       Also, maybe a better solution is to create another class like LightComponent() that does not have the bgComponent
// 			//       symbol. Then when a LightComponent is being mounted, this code can pullup the bgComponents that it contains
// 			//       because LightComponent's would never have logic.
// 			if ((bgComponent in child) && Array.isArray(child.mounted) && !child.root) {
// 				var cName;
// 				while (cName=child.mounted.shift()) {
// 					console.log("################################### pullup ",cName);
// 					var cChild
// 					if (match=/^(?<basename>[^[]+)\[(?<index>.*)\]$/.exec(cName))
// 						cChild = child[match.groups.basename][match.groups.index];
// 					else
// 						cChild = child[cName];
// 					console.assert(cChild);
//
// 					// the index may change so we need to keep track of both old and new just in case
// 					var newCName = cName;
//
// 					if (match) {
// 						// init newIndex with the one used in the child's named array but if its all numeric, reset it to "" so that
// 						// the following code will re-number it in the new parent
// 						var newIndex = match.groups.index;
// 						newCName = cName;
// 						if (/^[0-9]+$/.test(newIndex))
// 							newIndex = "";
//
// 						if (!Array.isArray(parent[match.groups.basename]))
// 							parent[match.groups.basename] = [];
// 						if (!newIndex) {
// 							newIndex = parent[match.groups.basename].length;
// 							newCName = match.groups.basename+"["+newIndex+"]"
// 						}
// 						if (parent[match.groups.basename][newIndex] && parent[match.groups.basename][newIndex]!=child)
// 							throw new BGError("the pullup mechanism (a work in progress) hit a name conflict while re-parenting child's named mounted child to parent. cName already exists in the parent", {cName, newCName, parent, child});
// 						parent[match.groups.basename][newIndex] = child;
// 						console.assert(parent[match.groups.basename][newIndex]);
// 					}
// 					else {
// 						if (parent[cName] && parent[cName]!=child[cName])
// 							throw new BGError("the pullup mechanism (a work in progress) hit a name conflict while re-parenting child's named mounted child to parent. cName already exists in the parent", {cName, parent, child});
// 						parent[cName]=child[cName];
// 					}
//
// 					if (!parent.mounted)
// 						parent.mounted = [];
// 					parent.mounted.push(newCName);
// 					if (childEl && childEl.classList) {
// 						childEl.classList.add(newCName);
// 						childEl.classList.remove(cName);
// 					}
//
// 					// remove the cName from child.mounted, but leave child[cName] in case child has logic that uses it.
// 					child.mounted = child.mounted.filter((c)=>{return c!=cName});
//
// 					// we already checked that (bgComponent in child) before entering this block
// 					child.parent=parent;
// 					child[bgComponentParent]=parent;
// 					child.name = newCName;
// 				}
// 			}
		}
	}

	// add a 'parent' member in the child pointing to the parent
	//BGDomLinks
	if (bgComponent in child) {
		if (child.parent && child.parent!==parent)
			throw new BGError("the child being mounted into a parent already has a member named 'parent' that points to something else", {parent, child, existingParent:child.parent });
		child.parent = parent;
		child[bgComponentParent] = parent;
		child.name = name;
		child[bgComponentName] = name;
	}

	lifeCycleChecker && lifeCycleChecker.mark(child, 'onMounted');
	if (typeof child.onMount == 'function')
		child.onMount()
}


// usage: <child> ComponentUnmount($parent, $child)
// Tear down the parent<->child relationship that ComponentMount created
// The difference between ComponentUnmount and ComponentDestroyChild is that whereas they both unmount the child, ComponentDestroyChild
// will also destroy it so that its no longer usable.
// Params:
//    <$parent>  : the parent bgComp of the relationship
//    <$child>   : the child being unmounted. Can be the bgComp or the name in the context of $parent
export function ComponentUnmount($parent, $child)
{
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	var name
	if (typeof $child == 'string') {
		name = $child;
		if ( (name.endsWith("]"))  && (match=/^(?<basename>[^[]+)\[(?<index>.*)\]$/.exec(name)) )
			$child = parent[match.groups.basename][match.groups.index];
		else
			$child = parent[name];

		if (!$child)
			throw new BGError("ComponentUnmount: unmounting a child by name that does not exist in the parent", {parent, name});
	}
	const [childObj,  childEl,  child ] = ComponentNormalize($child);

	if (parent.trace) console.log("t> ComponentUnmount(p:%s, c:%s) details%O", NodeTraceName(parent), NodeTraceName(child), {childName:child[bgComponentName], parent:parent, child:child, parentNamed:parent.mounted.join(),parentUnnamed:parent.mountedUnamed.join()});

	console.assert(child);

	if (typeof child.onPreUnmount == 'function')
		child.onPreUnmount()

	const isDisconnecting = childEl.isConnected;

	if (isDisconnecting)
		FireDOMTreeEvent(child, bgePreDisconnected);

	// remove from the DOM relation
	//TODO: to do this check right, we need to walk the parent chain to find parentEl b/c it might not be a direct child
	//console.assert(!!parentEl && !!childEl && childEl.parentNode===parentEl, "ComponentUnmount ill-specified relation to tear down", {parent:parent, name, child:child, namedChild:parent&&parent[name], parentEl, childEl})
	if (childEl) {
		childEl.remove();
	}

	if (isDisconnecting)
		FireDOMTreeEvent(child, bgeDisconnected);

	// remove the BG Node relation from the parent
	//BGDomLinks
	if (parent[bgComponent]) {
		// try 3 ways to get the name from the child
		if (!name && (bgComponentName in child))
			name=child[bgComponentName];
		if (!name && (bgComponent in child))
			name=child.name;

		// 2022-11 bobg: commented this block out. It seems probalematic. it has a break; which i think is not valid since we are not in a loop
		//               but i have not been getting errors so I think it fails. if it did not fail, I think it would mess up the code below
		//               because it would choose the named path and name would be an obj instead of a string.
		// we support adding a DOM node as a named child so we can not assume that child identifies its name in any way so
		// we have to iterate the named children and see if we find child
		if (!name) for (const cName of parent.mounted) if (parent[cName]===child) {
throw new BGError("yall see this?");
			name = cName
			break;
		}

		// remove an unnamed relation from the parent if the parent supports it
		if (!name && Array.isArray(parent.mountedUnamed)) {
			var i = parent.mountedUnamed.indexOf(child);
			if (i == -1)
				i = parent.mountedUnamed.indexOf(childEl);

			if (i != -1) {
				parent.mountedUnamed.splice(i,1);
			} else if (childObj) {
				// if  childObj exists, its one of ours, and we are only in this block if parent is one of ours so we should insist
				// that the mount relationship that we are undoing should exist
				throw new BGError("could not find (unnamed) child in parent.mountedUnamed", {parent:parent, child:child, mountedUnamedCopy:parent.mountedUnamed.slice(), name});
			}
		}

		// remove a named relation from the parent if the parent supports it
		if (name && Array.isArray(parent.mounted)) {
			const i = parent.mounted.indexOf(name);
			if (i != -1) {
				parent.mounted.splice(i,1);
				var match;
				if ( (name.endsWith("]"))  && (match=/^(?<basename>[^[]+)\[(?<index>.*)\]$/.exec(name)) )
					(function(a,i) {return delete a[i]})(parent[match.groups.basename], match.groups.index);
				else
					delete parent[name];
			}
			// if  childObj exists, its one of ours, and we are only in this block if parent is one of ours so we should insist
			// that the mount relationship that we are undoing should exist
			else if (childObj)
				throw new BGError("could not find (named) child in parent.mountedUnamed", {parent:parent, child:child, mountedCopy:parent.mounted.slice(), name});
		}
	}

	// remove the BG Node relation from the child if the child supports it
	if (child[bgComponent] && ("parent" in child))
		delete child[parent];

	lifeCycleChecker && lifeCycleChecker.mark(child, 'onUnmounted');
	if (typeof child.onUnmount == 'function')
		child.onUnmount()

	return child;
}




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Lifecycle Functions
// Create or destroy BGComp objects

// usage: <DOMNode> Html(tagIDClasses, ...p)
// This creates a plain DOMNode by using ComponentParams to process the arguments. This allows the same syntax for Component's
// constructor to be used to create DOMNodes.
export function Html(tagIDClasses, ...p)
{
	var componentParams = new ComponentParams(tagIDClasses, ...p);
	return ComponentMakeDOMNode(componentParams);
}


// usage: <DOMNode> ComponentMakeDOMNode(<ComponentParams>, [<obj>])
// Create and return a DOMNode/element that reflects the data in this ComponentParams instance and optionally turn <obj> into a
// BGNode object linked to the new DOMNode.
//
// If an <obj> is passed in, the DOMnode will be bi-directionally linked with it and the required state of a BGNode will be added
// to it. After this call <obj> will be a valid BGNode
//
// If bgComp is not provided, the new DOMNode will not be connected to any BGBone. Note that any DOMNode is also a valid BGComp even
// if it does not have a BGNode linked to it.
//
// Member Variables:
// When the <bgComp> parameter is passed in, these properties are set in it
//    <bgComponent>    : bgComponent is a Symbol that identifies bgComp as being a bgComponent full object
//    <name>           : the name of the node relative to its parent. Can be '' (unnamed)
//    <mounted>        : array of names (strings) of the named children of this component
//    <mountedUnamed>  : array of bgComponents objects of any unnamed children
//    <el>             : reference to the DOM node/element associated with this bgComponent
export function ComponentMakeDOMNode(componentParams, bgComp)
{
	// if the ctor params indicated that we are wrapping an existing node, use it, otherwise create a new one
	const el = componentParams.wrapNode || redomHtml(componentParams.makeREDOMTagString(), Object.assign({}, componentParams.props, {style:componentParams.styles}));
	global.lifeCycleChecker && lifeCycleChecker.mark(bgComp||el, 'ctor');
	domTreeChanges.addToWatch(el);

	// if bgComp is given, create a two way link between it and the el
	//BGDomLinks
	if (bgComp) {
		bgComp[bgComponent]  = true;
		bgComp[bgComponentName]  = componentParams.name;
		bgComp.name          = componentParams.name;
		bgComp.mounted       = [];
		bgComp.mountedUnamed = [];
		bgComp.el            = el;
		bgComp.root          = componentParams.root;
		ComponentMap.set(el,bgComp);
	}
	return el;
}

// usage: void ComponentDestroyDOMNode($bgComp)
// This is the complement to ComponentMakeDOMNode. A DOMNode created by ComponentMakeDOMNode typically should be destroyed by this
// function. If a BGNode was passed to ComponentMakeDOMNode to be linked with the new DOMNode, either that BGNode or the DOMNode
// returned by ComponentMakeDOMNode can be passed to this function.
// TODO: this assumes that $bgComp is not mounted. consider if we need to check and unmount it but I thikn its OK not to b/c
//       the component family seems to be focused on the children so we usually are destroying a node from its parent with
//       ComponentDestroyChild.  When we do have a top level node, its natural to unmount it when we are done and may not even destroy it
export function ComponentDestroyDOMNode($bgComp)
{
	const [bgCompObj,bgCompEl,bgComp] = ComponentNormalize($bgComp);

	if (bgComp.trace) console.log("t> ComponentDestroyDOMNode(%s) details%O", NodeTraceName(bgComp), {bgComp})

	if (bgCompObj) {

		var namedChildren = bgCompObj.mounted.slice();
		for (var childName of namedChildren) {
			ComponentDestroyChild(bgCompObj,childName);
		}

		var unnamedChildren = bgCompObj.mountedUnamed.slice();
		for (var child of unnamedChildren) {
			ComponentDestroyChild(bgCompObj,child);
		}

		console.assert(bgCompObj.mounted.length==0 && bgCompObj.mountedUnamed.length==0, {parent:[bgCompObj,bgCompEl,bgComp]});

		bgCompObj[bgComponent] = 'destroyed'
		ComponentMap.delete(bgCompEl);
		bgCompObj.el = null;
	}
	domTreeChanges.removeFromWatch(bgCompEl);
	global.lifeCycleChecker && lifeCycleChecker.mark(bgComp, 'destroyed');
}


// usage: <void> ComponentDestroyChild($parent, nameOrChild)
// This calls ComponentUnmount to break down the parent/child relationship and then calls destroy on the child
// The difference between ComponentUnmount and ComponentDestroyChild is that whereas they both unmount the child, ComponentDestroyChild
// will also destroy it so that its no longer usable.
// Params:
//    <parent>  : the parent bgComponent of the relationship
//    <name>    : the name of the child in the context of the parent or undefined if the child is unnamed
//    <child>   : if <name> is undefined, the child object must be passed in.
export function ComponentDestroyChild($parent, nameOrChild) {
	if ($parent.trace) console.log("t> ComponentDestroyChild(p:%s,c:%s) details%O", NodeTraceName($parent), NodeTraceName(nameOrChild), {$parent, nameOrChild})
	const childObj = ComponentUnmount($parent, nameOrChild);
	if (typeof childObj.destroy == 'function')
		childObj.destroy();
	else
		ComponentDestroyDOMNode(childObj);
	return childObj;
}

// usage: <void> ComponentDestroyChildren($parent)
// Unmounts all children from $parent and call their .destroy() methods to recover their resources
export function ComponentDestroyChildren($parent) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	while (parentEl.firstChild)
		ComponentDestroyChild([parentObj, parentEl, parent], parentEl.lastChild);

	if (parentObj)
		console.assert(parentObj.mounted.length==0 && parentObj.mountedUnamed.length==0);
}


// usage: <BGNode> ComponentConstruct(...p)
// This supports constructing a specific class of BGNode given an array of contruction params. This is typically done when adding
// child content to either constructing a Component class or calling ComponentMount (or something that calls ComponentMount).
// Example:
//    this.mount([
//       myChild,                // <myChild> is an existing BGComp
//       new <ClassName>(),      // <ClassName> is a class that uses this library (Component, Button, InputField, etc...)
//       ["$div", ...],          // construct the default type of component for the Parent (the parent is 'this' in this example)
//       [{Constructor:<classVariable>}, ...] // where <classVariable> is a variable that conatins a constructor
//    ])
// Params:
//    <p> : is an arbitrarily long list of parameters as described in 'man ComponentParams'. In that list somwhere the the
//          'Constructor' property can be specified. If not, 'defaultConstructor' will be used if its in the list. If that is not
//          present, 'global.bg.Component' is used. If that is not set an exception is thrown.
export function ComponentConstruct(...p) {
	//TODO: support dynamic construction of a specific Component type, based on the $<type> string field, maybe use customElements.define (CustomElementRegistry)
	const componentParams = new ComponentParams(...p);

	if (componentParams.Constructor) {
		return new componentParams.Constructor(...p);
	} else if (componentParams.defaultConstructor) {
		return new componentParams.defaultConstructor(...p);
	} else if (global.bg.Component) {
		return new global.bg.Component(componentParams);
	} else {
		throw new BGError("dynamic construction could not find a constructor to use. There probably should have been a global default set in 'global.bg.Component'");
	}
}














//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// Syntax Sugar -- create functions corresponding to the DOMNode (HTMLElement) methods to add and remove chidren
//
// Even though these are functions, typically they are used to implement a class. Examples are Component, Button, and InputControl
// These are each the root of a hierarchy. They can wrap these function where appropriate to make themselves more like use a DOMNode
// directly
//


export function ComponentAppendChild($parent, ...childContent) {
	ComponentMount($parent, null, childContent, null);
}

export function ComponentInsertBefore($parent, referenceChild, ...childContent) {
	ComponentMount($parent, null, childContent, referenceChild);
}

export function ComponentRemoveChild($parent, ...childContent) {
	const results=[];
	for (const childOrName of childContent) {
		const oldChild = ComponentDestroyChild($parent, childOrName);
		oldChild && results.push(oldChild);
	}
	return results;
}

export function ComponentReplaceChildren($parent, ...childContent) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	// TODO: This should be optimized to merge childContent with the existing childContent to minimumally change the dom
	ComponentDestroyChildren([parentObj, parentEl, parent]);
	ComponentMount([parentObj, parentEl, parent], null, childContent, null);
}

// remove <$child> from <$parent> and add <newContent> at the place where <$child> was.
// Params:
//    <$parent>   : the bgComp that contains $child
//    <$child>    : a bgComp that is a descendant of <$parent>. Unlike plain DOM API, this can be a non-direct descendant.
//                  if any of <newContent> are named, they will be linked directly to <$parent> even if there are other DOM nodes
//                  in the parent chain between where <newContent> is being added to the DOM.
//    <newContent> : one or more bgComp that will be added under <$parent> in place of <$child>
export function ComponentReplaceChild($parent, $child, ...newContent) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	const [childObj, childEl, child] = ComponentNormalize($child);

	// if child is empty, this function devolves into ComponentAppendChild. This makes sence to me because the only difference is
	// that this function accepts a child to indicate where to put the newContent and to be destroyed. If child is null, its
	// specifying the default position which is 'append' and null is already 'destroyed' so there is nothing to do
	// TODO: consider if this should throw an exception instead
	if (!child)
		return ComponentAppendChild([parentObj, parentEl, parent], ...newContent);

	if (!childEl)
		throw new BGError("trying to replace this child in its parent but the child does not have a DOMNode (child.el) so not sure where the new content should go. (note this code could look to parent.mounted to see what  was mounted before or after but not sure if that is realistic so we are starting with this exception to see if it happens) ", {parent:parent, child:child, newContent});

	// this code does not assume that child is a direct child of parent, but lets assert that it is a decendent.
	var tnode = childEl.parentNode;
	while (tnode && tnode !== parentEl)
		tnode = tnode.parentNode;
	if (!tnode)
		throw new BGError("trying to replace this child in its parent but it seems that the child is not a decendant of parent in the DOM", {parent:parent, child:child, newContent});

	// if child is last, we pass in the special object {appendTo:childEl.parentNode} that ComponentInsertBefore and ComponentMount
	// understands to mean insert at the end we do this instead of just calling ComponentAppendChild because childEl might not be
	// the direct child so the parent we set {appendTo:childEl.parentNode} might not be parentEl so we need to pass something as
	// insertBefore
	var insertLocation= (childEl.nextSibling)
		? childEl.nextSibling
		: {appendTo:childEl.parentNode};

	ComponentDestroyChild([parentObj, parentEl, parent], [childObj, childEl, child]);

	ComponentInsertBefore([parentObj, parentEl, parent], insertLocation, ...newContent)
}


const sLastFire = Symbol.for('bg_sLastFire');

// values for FireDOMTreeEvent methodName
export const bgePreConnected    = 'onPreConnected';
export const bgeConnected       = 'onConnected';
export const bgePreDisconnected = 'onPreDisconnected';
export const bgeDisconnected    = 'onDisconnected';

// usage: <void> FireDOMTreeEvent(<BGComp> startNode, <string> methodName, <boolean> propagationFlag)
// Params:
//    <startNode>  : the dom node that we are firing the event on. Its called 'start' because we send the event to all descendants
//    <methodName> : a string name of the event being fired. The event will call a method on the objects it fires on by the same name.
//                   There are four predefined string constants coresponding to the four events that this library fires itself.
//                   Note that the constant name does not include the 'on' prefix.
//                        bgePreConnected     : onPreConnected()    : just before the node is being added to the DOM
//                        bgeConnected        : onConnected()       : just after the node is being added to the DOM
//                        bgePreDisconnected  : onPreDisconnected() : just before the node is being removed from the DOM
//                        bgeDisconnected     : onDisconnected()    : just after the node is being removed from the DOM
//    <propagationFlag>: internal use. distinguish between the initial call and subsequent propagation to children. We need to
//                        'debounce' the initial call because our ComponentMount and ComponentUnmount fire events and the DOMHooks.js
//                        mechanism fires them and sometimes they both do.
// TODO: consider if we can remove the events fired by ComponentMount and ComponentUnmount because the latest implementation of
//       DOMHooks.js might be reliable in all cases.
export function FireDOMTreeEvent(startNode, methodName, propagationFlag) {
	if (!startNode) return;
	const [bgObj, bgEl, bgComp] = ComponentNormalize(startNode);

	// if this is the top node being connected/disconnected, debounce the event b/c sometimes it will be fired mutiple times b/c
	// there is no perfect place to call it from to to get all cases, there is some overlap that would be hard to eliminate
	// The DOM tree events are all things that will not be called twice in a row on the
	if (!propagationFlag) {
		if (bgComp[sLastFire]==methodName)
			return;
		bgComp[sLastFire]=methodName;
	}

	lifeCycleChecker && lifeCycleChecker.softMark(bgComp, methodName);

	if (bgComp[bgComponent] && methodName)
		bgComp.mountedName = ComponentGetMountedName(bgComp, true);

	(typeof bgComp[methodName] == 'function') && bgComp[methodName]();

	if (bgEl) for (const child of bgEl.children)
		FireDOMTreeEvent(child, methodName, true);
}



export class LifecycleChecker extends Map {
	get(obj) {
		obj.name
		var node = super.get(obj);
		if (!node) {
			node = {obj, __proto__:null};
			this.set(obj, node);
		}
		return node;
	}
	mark(obj, event) {
		const node = this.get(obj);
		if (!(event in node))
			node[event]=0;
		node[event]++;
	}
	softMark(obj, event) {
		const node = super.get(obj);
		if (node) {
			if (!(event in node))
				node[event]=0;
			node[event]++;
		}
	}
	logStatus() {
		var objsConnected=[];
		var objsLive=[];
		var cntDestroyed=0;
		const objsViolations = [];
		for (const [obj,node] of this) {
			const [bgObj,bgEl,bgComp] = ComponentNormalize(obj);
			if (bgEl && ((node.onConnected||0)-(node.onDisconnected||0))>0) {
				if (!bgEl || !bgEl.isConnected) {node.violation = "not connected but events indicate it should be"; objsViolations.push(node)}
				objsConnected.push(node);
			} else if (bgEl && bgEl.isConnected) {
				node.violation = "connected but onConnected/onDisconnected events indicate it should not be"; objsViolations.push(node)
			} else if (node.destroyed && ((node.onMounted||0)-(node.onUnmounted||0))>0) {
				node.violation = "unbalanced onMounted/onUnmounted events on a destroyed node, "; objsViolations.push(node)
			} else if (node.ctor!=1
					|| node.destroyed>1
					|| node.onConnected<node.onDisconnected) {
				node.violation = "general logic error in events seen"
				objsViolations.push(node);
			}

			if (!node.destroyed)
				objsLive.push(node);
			else
				cntDestroyed++;
		}
		console.log((''+this.size).padStart(6)    +' : tracked instances');
		console.log((''+objsLive.length).padStart(6)                    +' : currently alive');
		console.log((''+objsConnected.length).padStart(6)               +' : currently connected');
		console.log((''+objsViolations.length).padStart(6)              +' : in violation', objsViolations);
	}
	getConnected() {
		var objs=[];
		for (const [obj,node] of this) if (((node.onConnected||0)-(node.onDisconnected||0))>0)
			objs.push(node);
		return objs;
	}
	getLive() {
		var objs=[];
		for (const [obj,node] of this) if (!node.destroyed)
			objs.push(node);
		return objs;
	}
	getDestroyed() {
		var objs=[];
		for (const [obj,node] of this) if (node.destroyed)
			objs.push(node);
		return objs;
	}
	purgeDestroyed() {
		for (const [obj,node] of this) if (node.destroyed && !node.violation)
			this.delete(obj);
	}
}
export var lifeCycleChecker
if (false)
	lifeCycleChecker = new LifecycleChecker();
