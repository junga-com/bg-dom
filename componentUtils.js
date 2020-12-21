import { el as redomHtml } from 'redom';
import { OnDemmandComponent } from './component'

// Library componentUtils
// This library implements the core bgdom component functionality that is used by the Compnent and Button (and other?) class
// hierarchies.
//
// bgComponents extend DOM nodes by creating a JS object with an 'el' property that points to its corresponding DOM node. A GC
// friendly form of backlink, from the DOM node to the JS object is provided by a WeakMap.
//
// A major motivation is to allow bgComponents to have named children to make writing functions and methods more natural. For eample,
// a view bgComponent could have named members for the various children that make up the view so that they can easily be scripted
// to provide functionality. myView.expandBtn.click().
//
//
//
// Exports:
//      class ComponentParams       : process an arbitrarily long paramether list to reduce it into one set of attributes to create
//                                    a DOM node and possibly a tree of content underneath it.
//      function ComponentMount     : attach a child to a parent in the DOM hiearchy
//      function ComponentUnmount   : deattach a child from a parent
//      function ComponentConstruct : dynamically construct a component. The class of the component is specified within the parameters


// Navigating the DOM tree.

// return the HTMLElement associated with the object passed in
// A bgComponent can be a DOM node/element or an object that has an 'el' property that is the DOM node/element.
// Use this instead of <obj>.el when <obj> is of unknown type.
export function ComponentToEl(component) {
	if (!component)
		return null;
	if (Array.isArray(component)) {
		var result = [];
		for (var c in component)
			result.push(ComponentToEl(c))
		return result
	} else if (component.nodeType || !component.el)
		return component;
	else
		return ComponentToEl(component.el);
}

// return the bgComp object associated with <el>.
// A bgComponent can be a DOM node/element or an object that has an 'el' property that is the DOM node/element. Given an Object with
// an 'el' property, the el property navigates to the DOM node/element. To go the other way, we use a WeakMap instead of extending the
// DOM node. An alternate implementation would be to add a WeakRef property to the DOM node/element that points back to the associated
// object but WeakRef is not yet available in Atom's nodejs version.
// Params:
//    <el>        : the element for which to return the corresponding JS object. It can a DOM node or the associated JS object
//    <forceFlag> : indicate what to return if there is no JS object for this DOM node
//                  (default)  : return undefined
//                  'force'    : return <el>
//                  'onDemmand': create and return a new JS object for <el>
export function ComponentToBG(el, forceFlag) {
	if (!el) return undefined;
	if (el in el && (nodeType in el.el))
		return el; // el is the associated object
	switch (forceFlag) {
		case 'onDemmand':
			var ret=ComponentMap.get(el);
			if (!ret)
				ret=new OnDemmandComponent(el);
			return ret;
		case 'force':     return ComponentMap.get(el) || el;
		default:          return ComponentMap.get(el);
	}
}
const ComponentMap = new WeakMap();

// returns the best bgComp parent of bgComp
export function ComponentGetParent(bgComp) {
	if (!bgComp)                     return undefined;
	const [bgObj, bgEl] = ComponentNormalize(bgComp);
	if (bgObj && bgObj.parent)       return bgObj.parent;
	if (bgEl  && bgEl.parentElement) return ComponentToBG(bgEl.parentElement, "force");
}





// pass in bgComp as either the extra object associated with a DOM object or as the DOM object itself and it returns [<obj>,<el>] where
// <obj> is the extra object (or null if none exist) and <el> is the DOM object.
// Params:
//    <bgComp>  : a reference to a bgComponent which can be the DOM element or the business logic object associated with it
//    <forceFlag> : default false. If true the <obj> returned in the first array position will be <either> instead of <obj>
// Return Value:
//    [obj,el,either] : where....
//       <obj> : is the extra object associated with the DOM object (or null if there is none)
//       <el>  : is the DOM object itself.
//       <either> : is <obj> if it exists or <el> otherwise so that <either> is non-null unless <bgComp> is null
export function ComponentNormalize(bgComp) {
	if (bgComp && Array.isArray(bgComp)) return bgComp;
	if (bgComp && (bgComponent in bgComp))
		return [bgComp, bgComp.el, bgComp]
	const el  = ComponentToEl(bgComp);
	const obj = ComponentToBG(el);
	return [obj, el, obj||el]
}

// compiled common Regular Expressions
export const reEmpty        = /^\s*$/;
export const reHTMLContent  = /^\s*<[^>]+>/;
export const reVarName      = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

// reTagIDClasses makes tagName the default text
// [name:][<tagName>][#<idName>][.className1[.className2...]][ textContent]
// TODO: 'label' would probably better be renamed to stringContent
export const reTagIDClasses   = /^((?<name>[_a-zA-Z0-9]*):)?(?<tagName>[-_a-zA-Z0-9]*)?(#(?<idName>[-_a-zA-Z0-9]*))?(?<className>[.][-!_.a-zA-Z0-9]*)?([\s,]((?<icon>icon-[-_a-zA-Z0-9]+)([\s,]|$))?(?<label>.*))?$/;

// reContentIDClasses makes content the default text and changes tagName to require a leading $
// the re group names are the parameter names. This re must match '' (all groups are optional)
// [name:][$<tagName>][#<idName>][.className1[.className2...]][ textContent]
export const reContentIDClasses = /^((?<name>[_a-zA-Z0-9]*):)?([$](?<tagName>[-_a-zA-Z0-9]*))?(#(?<idName>[-_a-zA-Z0-9]*))?(?<className>[.][-!_.a-zA-Z0-9]*)?(\s+|,|$)?((?<icon>icon-[-_a-zA-Z0-9]+)(\s+|,|$))?(?<label>.*)?$/;

export const bgComponent=Symbol.for('bgComponent');

// This map looks up a name and returns true if it is a known style property name. It is used to move options object's member names
// that the user puts at the top level into the 'style' sub-member. This makes it easier for users to specify just a few styles.
// without having the verbosity of creating the style sub-object.
// This list was created from https://www.w3schools.com/jsref/dom_obj_style.asp
const knownStyleProperties = {
	alignContent:            true,
	alignItems:              true,
	alignSelf:               true,
	animation:               true,
	animationDelay:          true,
	animationDirection:      true,
	animationDuration:       true,
	animationFillMode:       true,
	animationIterationCount: true,
	animationName:           true,
	animationTimingFunction: true,
	animationPlayState:      true,
	background:              true,
	backgroundAttachment:    true,
	backgroundColor:         true,
	backgroundImage:         true,
	backgroundPosition:      true,
	backgroundRepeat:        true,
	backgroundClip:          true,
	backgroundOrigin:        true,
	backgroundSize:          true,
	backfaceVisibility:      true,
	border:                  true,
	borderBottom:            true,
	borderBottomColor:       true,
	borderBottomLeftRadius:  true,
	borderBottomRightRadius: true,
	borderBottomStyle:       true,
	borderBottomWidth:       true,
	borderCollapse:          true,
	borderColor:             true,
	borderImage:             true,
	borderImageOutset:       true,
	borderImageRepeat:       true,
	borderImageSlice:        true,
	borderImageSource:       true,
	borderImageWidth:        true,
	borderLeft:              true,
	borderLeftColor:         true,
	borderLeftStyle:         true,
	borderLeftWidth:         true,
	borderRadius:            true,
	borderRight:             true,
	borderRightColor:        true,
	borderRightStyle:        true,
	borderRightWidth:        true,
	borderSpacing:           true,
	borderStyle:             true,
	borderTop:               true,
	borderTopColor:          true,
	borderTopLeftRadius:     true,
	borderTopRightRadius:    true,
	borderTopStyle:          true,
	borderTopWidth:          true,
	borderWidth:             true,
	bottom:                  true,
	boxDecorationBreak:      true,
	boxShadow:               true,
	boxSizing:               true,
	captionSide:             true,
	clear:                   true,
	clip:                    true,
	color:                   true,
	columnCount:             true,
	columnFill:              true,
	columnGap:               true,
	columnRule:              true,
	columnRuleColor:         true,
	columnRuleStyle:         true,
	columnRuleWidth:         true,
	columns:                 true,
	columnSpan:              true,
	columnWidth:             true,
	content:                 true,
	counterIncrement:        true,
	counterReset:            true,
	cursor:                  true,
	direction:               true,
	display:                 true,
	emptyCells:              true,
	filter:                  true,
	flex:                    true,
	flexBasis:               true,
	flexDirection:           true,
	flexFlow:                true,
	flexGrow:                true,
	flexShrink:              true,
	flexWrap:                true,
	cssFloat:                true,
	font:                    true,
	fontFamily:              true,
	fontSize:                true,
	fontStyle:               true,
	fontVariant:             true,
	fontWeight:              true,
	fontSizeAdjust:          true,
	fontStretch:             true,
	hangingPunctuation:      true,
	height:                  true,
	hyphens:                 true,
	icon:                    true,
	imageOrientation:        true,
	isolation:               true,
	justifyContent:          true,
	left:                    true,
	letterSpacing:           true,
	lineHeight:              true,
	listStyle:               true,
	listStyleImage:          true,
	listStylePosition:       true,
	listStyleType:           true,
	margin:                  true,
	marginBottom:            true,
	marginLeft:              true,
	marginRight:             true,
	marginTop:               true,
	maxHeight:               true,
	maxWidth:                true,
	minHeight:               true,
	minWidth:                true,
	navDown:                 true,
	navIndex:                true,
	navLeft:                 true,
	navRight:                true,
	navUp:                   true,
	objectFit:               true,
	objectPosition:          true,
	opacity:                 true,
	order:                   true,
	orphans:                 true,
	outline:                 true,
	outlineColor:            true,
	outlineOffset:           true,
	outlineStyle:            true,
	outlineWidth:            true,
	overflow:                true,
	overflowX:               true,
	overflowY:               true,
	padding:                 true,
	paddingBottom:           true,
	paddingLeft:             true,
	paddingRight:            true,
	paddingTop:              true,
	pageBreakAfter:          true,
	pageBreakBefore:         true,
	pageBreakInside:         true,
	perspective:             true,
	perspectiveOrigin:       true,
	position:                true,
	quotes:                  true,
	resize:                  true,
	right:                   true,
	tableLayout:             true,
	tabSize:                 true,
	textAlign:               true,
	textAlignLast:           true,
	textDecoration:          true,
	textDecorationColor:     true,
	textDecorationLine:      true,
	textDecorationStyle:     true,
	textIndent:              true,
	textJustify:             true,
	textOverflow:            true,
	textShadow:              true,
	textTransform:           true,
	top:                     true,
	transform:               true,
	transformOrigin:         true,
	transformStyle:          true,
	transition:              true,
	transitionProperty:      true,
	transitionDuration:      true,
	transitionTimingFunction:true,
	transitionDelay:         true,
	unicodeBidi:             true,
	userSelect:              true,
	verticalAlign:           true,
	visibility:              true,
	whiteSpace:              true,
	width:                   true,
	wordBreak:               true,
	wordSpacing:             true,
	wordWrap:                true,
	widows:                  true,
	zIndex:                  true
}



// Interpret and normalize an arbitrarily long list of parameters that describe the creation of a component.
// This supports a very flexible yet reasonably efficient pattern of providing information from multiple places using a compact
// easy to use syntax. Typically the parameter list is the result of the constructor(...p){super(<...>, ...p)} calls in a multilevel
// hierarchy.
//
// Levels:
//    user contruction params :(new SomeComponent(p1,p2))
//    componentClassA         :super (cA1,cA2, ...p, cA3)   (added in class's ctor -- class being constructed)
//    componentClassB         :super (cB1, ...p, cB2)       (added in class's ctor -- first super class)
//    componentClass...       :...                          (added in class's ctor -- all the super classes in the hierarchy chain)
//    Component class         :params==[cB1, cA1,cA2, p1,p2, cA3, cB2] The last class gets the whole list which is sends to this function
//
//    The concept of 'levels' will be used to describe the functionality of ComponentParams. Each level is a place that can provide
//    information about how the component should be constructed. This is true in all class hierarchies but the special nature of
//    programming to the DOM makes it particularly useful to be flexible in allowing each level to provide (almost) any information.
//
//    Each level can add its own information to the parameter list that it received from its caller and pass the combined result
//    onto its base class. The last base class (which may or may not be Component) uses ComponentParams to reduce the arbitrarily
//    long parameter list into one normalized set of information that is required to create a new DOM Node and possible a tree of
//    children underneath it. The Component class puts the resulting set of information in the this.componentParams property so that
//    it is available in each of the hierarchy's class's constructors after the super() call.
//
//    Information earlier in the parameter list (more to the left) will supercede information later in the list (more to the right).
//    with the same name. A component class can use this to decide whether the information it provides will be a default value that
//    the level above it can override or whether it is a mandatory value that can not be overridden.
//
// Passing Information as Named vs Unnamed (type based) :
//    No parameter passed to the ComponentParams constructor is identified by its position so there are really no positional parameters.
//    Parameters that are passed directly to this constructor or as elements in an array parameter are interpretted by examining their
//    type and structure (ducktyping) instead of by the position that they occupy in the list of parameters.
//
//    Named parameters are implemented by passing an object whose keys are the names of the parameters. Some of the objects in the
//    parameter list will be identified and used this way to pass explicitly named parameters. Other objects will be interpretted
//    differently if that match the ducktyping of another unamed parameter type (in particular content objects).
//
//    The reason unamed parameter types are supported is to provide a more user friendly, compact syntax for creating components.
//
// Unamed Params (type based):
// Note that strings and arrays are treated differently based on whether they appear in the first level of parameters passed into
// us or whether they are elements in a nested array.
// Top Level Type Interpretation
//   'string' : are interpretted as <tagIDClasses>
//              Note that strings inside Arrays are interpreted differently.
//
//   'array'  : each element inside the array is interpretted as child <content>.
//              Element Types
//                   'object'w/el       as <content> (same as first level, see below)
//                   'object'w/nodeType as <content> (same as first level, see below)
//                   'string' :         as <content> either innerHTML content or plain text determined by whether it begins with '<'
//                   'array'  :         as a parameter list that will be used to dynamically construct some component type.
//                              note: that second level arrays are interpretted differently than the first level
//
//    'object'w/el : objects with a property named 'el' are interpreted as child <content> to be added under the component being created
//
//    'object'w/nodeType : objects with a property named 'nodeType' are interpreted as child <content> to be added under the component being created
//
//    'object'(other) : are interpretted as an <options> object where the keys any of the names listed in the Mamed Parameters Section
//
//    'function' : are interpretted as an unnamedCB and added a composite this.unnamedCB[]. Its not uncommon
//          for a component type to support a callback that is unabiguous in the context of that component type so it can appear
//          anywhere in the parameter list and still be understood. Multiple levels could provide a callback in which case its
//          reasonable for the derived class to invoke each in turn when firing its event.
//
// Named (Logical) Parameters :
// These are the named 'parameters' that can be explicitly specified in a named parameter object that apprears in the
// 'positional parameter' list. Note that the names that are not in <> are the literal keys that will be recognized. Those that are
// in <> like <knownStyles> refer to a whole set of names that will be recognized -- in this case any of the CSS style attributes.
//    tagName       :string     : <tagName> The name of the dom/html element type
//    name          :string     : the variable name used for a component. Typically this is relative to its parent.
//    idName        :string     : the id attribute. Not typically used b/c it should only be used when it does not make sense for a page to contain more than one of the component class its used in.
//    classes       :stringSet  : space separated list of classNames
//    label         :string     : text that will be set as the direct content of this node. If is starts with an html tag (<div>) it will parsed as html
//    content       :<multiple> : innerHTML specified in multiple ways -- text, html, DOM node, Component instance, or an array of multiple of those
//    tagIDClasses  :string(aggregate): combined [<name>:][<tagName>][#<idName>][.<class>[.<class>...]][ <contentTestOrHTML>]
//    unnamedCB     :function   : a function that will be registered in the component's default callback event.
//    nameForCB     :string     : if set, unamed function type params will be put in optParam.<nameForCB> instead of unnamedCB
//    Constructor   :classFn    : this is used for dynamic construction of bgComponents. Even new Component(...) will honor this
//                                and return an instance of Constructor class.
//    defaultConstructor:classFn: This will cause ay dynamic construction of child content, either in these params or in later calls
//                                to component.mount(...) to be created with this classFn if a Constructor is not explicitly given
//    paramNames    :stringSet  : space separated list of parameter names that extend this list of named parameters. They will be placed in the optParams sub-object
//   SUB-OBJECT CONTAINERS
//    optParams     :object     : named parameters introduced by a component class for features it implements (as opposed to DOM recognized properties)
//                                keys in this sub-object can be any name in paramNames
//    props         :object     : Attributes / Properties to be set in the created DOM node. Keys of this object can be any property supportted by the DOM
//    styles        :object     : css styles to be set in the created DOM node. Keys of this object can be any style property name
//   OTHER NAMES
//    <paramNames>  :<any>      : any name listed in 'paramNames' will be recognized as an extended named property and put in 'optParams'
//    <knownStyles> :string     : any name listed in the knownStyleProperties map will be recognized as a style property and put in 'styles'
//    <unknownNames>:string     : any name that does not match any known name will be interpreted as a DOM propert and put in 'props'
//
// Flattening the Property, Styles, and optParam Namespaces:
//    An important way to make the syntax to build components more compact is the support to specify any (name,value) pair at the
//    top level of the named parameter object even if they really belong inside one of the optParam, styles, or props sub-objects.
//    The ComponentParams class will recognize what they are and move them into the correct sub-object so that component authors can
//    always access them in their proper place even if they were not specified there explicitly.
//
//    For each name which is not one of the fixed, known names above that appears at the top level, a map lookup will be required
//    to identify what it is. I consider this an acceptable tradeoff, but if you do not, explicitly specifying those names in their
//    proper sub-objects will avoid that map lookup.
//
//    Another issue is whether this will create name conflicts if the same name appears in more than one of the 3 subobjects. I know
//    of no conflict between CSS style and DOM prop names and I think that optNames should not be a problem because they are all
//    logically attributes of the same component/DOM Node concept. If a component author creates a parameter name with the same
//    name as a style or prop, they probably are refering to the same thing and need to confront why they are not reusing the builtin
//    style or property.
//
//    A component author can purposely create an optParam name (see paramNames) with the same name as a style or prop to prevent
//    it's base classes from setting it in the DOM node or doing special processing on that value. By doing this, if the value is
//    specified at any level, it will be moved to the optParams sub-object where the component author can decide what to do with it.
//
// Combining Knowledge Provided By Multiple Levels:
//   Each level in the hierarchy gets a chance to specify any of the information so repeated information will be inevitable. The process
//   of combining multiple sets of possibly overlapping information into one consistent set will be refered to in this class as 'reducing'.
//   i.e. we are reducing multiple sets into one set.
//
//   Named values are either single valued or multivalued. The default behavior is to read the information from left to right on
//   the parameter list and lock in the first ocurrance of each single valued named data and to append together each multivalued
//   named data.
//
//   A particular class in the component hierarchy can use this behavior to provide both default values that can be overriden by
//   things that use it or mandatory values that can not be overridden (by default). Parameters on the left override those on the right.
//
//   All named data except these are treated as single valued.
//     class : multivalued : classes are combined in a space separated list. If any className is prefixed with a '!' character, it
//           will cause class to become locked at that point and no additional classes will be added (as if it were a single valued)
//     paramNames : multivalued : will be combined into a space separated list. (does not support the '!' character like class does)
//     content : multivalued : content is kept in an array and each content parameter encountered will be appending to the array.
//           in the end, the array will be reversed so that the effect is that content provided by dervied classes will by default
//           appear after content provided in a base class.
//     unnamedCB : multivalued : combined into an array
//     optParams,props,styles : these are containers of named data and each key is treated separately according to its name.
//
export class ComponentParams {
	static makeTagIDClasses(el, terseFlag) {
		if (!el) return '';
		var tagIDClasses;
		if (el.nodeName) tagIDClasses=`\$${el.nodeName.toLowerCase()}`;
		if (el.id) tagIDClasses+=`#${el.id}`;
		if (!terseFlag && el.classList.length>0) tagIDClasses+=`.${Array.from(el.classList).join('.')}`;
		return tagIDClasses;
	}

	// params can be any number of the following in any order
	//   tagIDClasses:string, options:object, callback:function, domEl:object(w/nodeType), component:object(w/el), or content:array
	constructor(...params) {
		// first, make a quick pass to look for an instance of ourselves and return it if found instead of creating a new instance.
		// This supports dynamic construction of Components where the class of the component is embedded in the parameters then we
		// call the constructor passing in the already parsed ComponentParams. This avoids parsing ComponentParams twice. The
		// intermediate classes in the hierarchy will blindly add additional params in their super() calls so the ComponentParam
		// object may be in the middle of a list of params. we dont want to burden the component author with checking.
		for (var i=0; i<params.length; i++)
			if (params[i] instanceof ComponentParams)
				return params[i];

		// single valued params are defined as undefined and combinable params are initialized to their empty type
		this.tagName       = undefined;
		this.name          = undefined;
		this.idName        = undefined;
		this.nameForCB     = undefined;
		this.Constructor   = undefined;        // added to support dynamic construction
		this.defaultConstructor = undefined;   // added to support default type of child content
		this.className     = '';
		this.content       = [];
		this.optParams     = {};
		this.paramNames    = 'label icon ';
		this.props         = {};
		this.styles        = {};
		this.style         = {};
		this.unnamedCB     = [];
		this.lockedParams = {};
		this.mapOfOptParamNames = {};
		this.root=false; // root is a concept to determine how far name propagation travels up the parent chain.

		// short circuit ctor
		if (params.length>0 && params[0] == ComponentParams.wrapNode) {
			this.wrapNode = params[1];
			return
		}

		// next, make another quick pass to assemble all the paramNames so that we can correctly classify optional parameters declared
		// by all the component classes in the hierarchy. paramNames can only be set in options objects.
		for (var i=0; i<params.length; i++) {
			if (params[i] && typeof params[i] == 'object' && typeof params[i].paramNames == 'string')
				this.paramNames += ' '+params[i].paramNames;
		}
		// make a map of the optParams names for efficient classification lookups.
		for (var name of this.paramNames.replace(/\s*[,\s]\s*/g,' ').split(' '))
			this.mapOfOptParamNames[name] = true;


		// now do a second pass through the params that does the real work. The purpose is to reduce the arbitrarily long list of
		// tagIDClasses, options, functions, and content into one set of information about the component instance being created.
		for (var i=0; i<params.length; i++) if (params[i]) {
			switch (typeof params[i]) {
				case 'object':
					// arrays in the param list are interpretted as arrays of content
					if (Array.isArray(params[i])) {
						// it would make sense to spread the array into the the content array except we are appending in the wrong
						// direction. Its more efficient to append in the wrong direction and then in the end, reverse the array.
						// TODO:344 interpret the second level arrays as bgComponent construction params
						// 2020-10 changed this to spread the array into content to support TODO:344
						//this.reduceAttribute('content', params[i]);
						for (const aryContent of params[i])
							this.reduceAttribute('contentDeep', aryContent);

					// detect known DOM content types
					// TODO: maybe it would be better to test (params[i] instaceof HTMLElement) || (bgComponent in params[i]) ?
					} else if (('nodeType' in params[i]) || ('el' in params[i])) {
						this.reduceAttribute('content', params[i]);

					// all other objects are interpretted as an <options> object (the loop excludes null objects)
					} else {
						// its an options object that explicitly names the information so iterate and reduce the information inside
						for (var name in params[i])
							this.reduceAttribute(name, params[i][name]);
					}
					break;

				// note that we could check to see if the string matches the reContentIDClasses regex and treat it as content otherwise
				// but its more conservative to let reduceAttribute throw an exception since it could be a subtle error in syntax.
				case 'string':
					// its a tagIDClasses -- parse and process
					this.reduceAttribute('tagIDClasses', params[i]);
					break;

				case 'function':
					// its an unnamedCB
					this.reduceAttribute('unnamedCB', params[i]);
					break;

				default:
					console.assert(false, "unknown parameter type in Component parameter list. Expecting Objects, strings and functions", {index:i, paramValue:params[i], paramType:typeof params[i], componentParams:this})
			}
		}

		// the content array may have arbitrary nested arrays that could be flattened, but I think its not necessary because
		// ComponentMount handles it. Nesting arrays do not introduce a correspnding DOM Node layer -- mount will flatten them.
		// 2020-10 commented this out in support of TODO:344.
		//         Whether we reverse content determines the order of super( [],...p) or super(...,[]) which
		//         produces the correct ordering of children added by multiple levels in the component class hierarchy
		//         I think when I added this, it did not ocur to me that the class author can decide what order they want
		// TODO:344 interpret the second level arrays as bgComponent construction params
		//const b4=this.content.slice()
		//this.content.reverse();
		//console.log('reversed',{b4,after:this.content});

		// its actually called 'style' but it seems like it should be called 'styles' so make an alias so we can use either one.
		this.style = this.styles;

		// nameForCB gets reduced in the standard way so that the correct (usually the most derived) class's value gets set
		// see Button hierarchy for an example of how its used.
		if (this.nameForCB) {
			this.optParams[this.nameForCB] = this.unnamedCB;
		}
	}

	// return a classifier string which determines how to reduce the attribute
	classifyAttribute(name) {
		if (/^(content(Deep)?|paramNames|tagIDClasses|unnamedCB|root)$/.test(name))    return name;
		else if (/(className|class|classes|classNames)/.test(name))        return 'className';
		else if (/(tagName|name|idName|(default)?Constructor|nameForCB)/.test(name)) return 'top';
		else if (name == 'children')                                       return 'content';
		else if (name == 'optParams')                                      return 'optParams';
		else if (name == 'styles')                                         return 'styles';
		else if (name == 'style')                                          return 'styles';
		else if (name == 'props')                                          return 'props';
		else if (name in this.mapOfOptParamNames)                          return 'optParams';
		else if (name in knownStyleProperties)                             return 'styles';
		else                                                               return 'props';
	}


	// this function is used to process the contents of an options object for which the value has a name (unlike positional params)
	// We will classify the attribute based on its name and then reduced them differently based on their classification
	reduceAttribute(name, value) {
		// skip if there is no value.
		if (value == null)
			return;

		// the classifier will tell us how to reduce it
		var attrClassifier = this.classifyAttribute(name);

		var objContainer
		switch (attrClassifier) {
			case 'children':
			case 'content':
				// TODO:344 interpret the second level arrays as bgComponent construction params
				if (Array.isArray(value)) {
					for (const aryContent of value)
						this.content.push(aryContent);
				} else {
					this.content.push(value);
				}
				return;

				case 'contentDeep':
					// TODO:344 interpret the second level arrays as bgComponent construction params
					this.content.push(value);
					return;

			case 'className':
				// classes are not first come first server except that '!' prevents additional classes from base classes from being added.
				if (Array.isArray(value)) value = value.join(' ');
				if (/[!]/.test(value))
					this.lockedParams[name] = true;
				this.className += " "+value.replace(/[!.]/g, ' ');
				return;

			case 'paramNames':
				// we already collected the paramNames in a first pass so that we can classify in the second pass so just ignore here
				return;

			case 'tagIDClasses':
				var matched = reContentIDClasses.exec(value);
				console.assert(!!matched, "invalid tagIDClasses string syntax. ", {name:name,value:value});

				// the group names in reContentIDClasses correspond to the real attribute names so matched.group can be reduced like
				// any options object
				for (var name in matched.groups)
					this.reduceAttribute(name, matched.groups[name]);
				return;

			case 'unnamedCB':
				this.unnamedCB.push(value);
				return;

			case 'root':
				this.root=value;
				return;

			// set the objContainer on these so that we can handle them all with a common algorithm below
			case 'top':       objContainer = this;           break;
			case 'props':     objContainer = this.props;     break;
			case 'styles':    objContainer = this.styles;    break;
			case 'style':     objContainer = this.styles;    break;
			case 'optParams': objContainer = this.optParams; break;
		}

		// these are containers for these types of attributes so iterate and reduce each key in them
		if (/(optParams|styles|style|props)/.test(name)) {
			for (const key in value)
				this.reduceClassifiedAttr(objContainer, attrClassifier,  key, value[key]);
		} else {
			// since props is the default when the name is not recognized, and we think that DOM properties can not be objects
			// (just string and numbers) send the attr to optParams if the value is an object
			// 2020-10 what about properties with callbacks like onclick?
			if (attrClassifier=='props' && typeof value == 'object')
				this.reduceClassifiedAttr(this.optParams, 'optParams',  name, value);
			else
				this.reduceClassifiedAttr(objContainer, attrClassifier,  name, value);
		}
	}

	// this function is used when the attribute <name> is classified and its not one of the special cases.
	// it sets the attributes value in the right place and records it as locked so that it wont be overwritten if a lower base class
	// also includes a value for it.
	reduceClassifiedAttr(obj, classification, name, value) {
		classification = (classification=='top') ? '' : classification+'.';
		if (classification+name in this.lockedParams)
			return;
		obj[name] = value;
		this.lockedParams[classification+name] = true;
	}

	// this translates our tagIDClasses syntax into REDOM's construction syntax so we can call el to create the DOM node
	// we can probably make the dom el more effieciently than redom's el now but we can optimize that later.
	makeREDOMTagString() {
		var redomTagStr = this.tagName
		if (this.idName)
			redomTagStr += "#"+this.idName;
		if (this.className) {
			redomTagStr += "."+this.className.replace(/(^\s+)|(\s+$)/,'').replace(/\s+/g,'.')
		}
		return redomTagStr || '';
	}

	// return a composite callback that invokes all the callbacks specified in the ComponentParams as the given type/name
	getCompositeCB(forceFlag, cbName) {
		if (!cbName || cbName!="unnamed" || cbName!="unnamedCB") {
			var cbList = this.unnamedCB;
		} else {
			var cbList = this.optParams[cbName];
			if (!cbList) cbList = [];
			console.assert(Array.isArray(cbList), `ComponentParams - expected optParams.${cbName} to be an array of functions`, {cbName,forceFlag,componentParams:this} );
		}

		if (cbList.length == 0)
			return (forceFlag) ? ()=>{} : null;
		else if (cbList.length == 1)
			return cbList[0];
		else
			return (...p)=>{
				const results = [];
				for (const fn of cbList) {
					const result = fn(...p);
					if (result) results.push(result);
				}
				if (results.length == 1)
					return results[0];
				if (results.length > 1)
					return results;
			}
	}


	// Create the DOM node/element that represents the parsed data in this ComponentParams instance.
	// If bgComp is passed in, the DOM node/element will be bi-directionally linked with the the bgComp object and the bgComp ojject
	// will be initialized with the fields expected of full bgComponent object.
	// If bgComp is not provided, the DOM node/element is the bgComp reference. When the DOM node/element is the bgComp, it is lighter
	// but not all the features of a full bgComponent will be availabel. Full bgComponents tend to be important nodes with your own
	// application (business logic) level API methods. Light bgComponents tend to be the content tree under full bgComponents.
	// Member Variables:
	// When the <bgComp> parameter is passed in, these properties are set in it
	//    <bgComponent>    : bgComponent is a Symbol that identifies bgComp as being a bgComponent full object
	//    <name>           : the name of the node relative to its parent. Can be '' (unnamed)
	//    <mounted>        : array of names (strings) of the named children of this component
	//    <mountedUnamed>  : array of bgComponents objects of any unnamed children
	//    <el>             : reference to the DOM node/element associated with this bgComponent
	makeHtmlNode(bgComp) {
		// if the ctor params indicated that we are wrapping an existing node, use it, otherwise create a new one
		const el = this.wrapNode || redomHtml(this.makeREDOMTagString(), Object.assign({}, this.props, {style:this.styles}));
		lifeCycleChecker && lifeCycleChecker.mark(bgComp||el, 'ctor');
		domTreeChanges.addToWatch(el);

		// if bgComp is given, create a two way link between it and the el
		if (bgComp) {
			bgComp[bgComponent]  = true;
			bgComp.name          = this.name;
			bgComp.mounted       = [];
			bgComp.mountedUnamed = [];
			bgComp.el            = el;
			bgComp.root          = this.root;
			ComponentMap.set(el,bgComp);
		}
		return el;
	}
	destroyHtmlNode($bgComp) {
		const [bgCompObj,bgCompEl,bgComp] = ComponentNormalize($bgComp);
		if (bgCompObj) {
			var child;
			while (child = bgCompObj.mounted.pop())
				ComponentDestroyChild(bgCompObj,child);
			while (child = bgCompObj.mountedUnamed.pop())
				ComponentDestroyChild(bgCompObj,child);
			bgCompObj[bgComponent] = 'destroyed'
			ComponentMap.delete(bgCompEl);
			bgCompObj.el = null;
		}
		domTreeChanges.removeFromWatch(bgCompEl);
		lifeCycleChecker && lifeCycleChecker.mark(bgComp, 'destroyed');
	}
}

ComponentParams.wrapNode = Symbol('skipCtor')

// Form a parent<->child relationship between DOM Elements.
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
//     html text : string(s[0]=="<")   : HTML test will be converted to a component whose outerHTML is the provided text
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
//    <insertBefore> : (optional) the existing child to insert childContent before as a DOM Node or component object.
//                     Default is append to end of $parent. Unlike the plain DOM API, this can be a non-direct descendant of $parent.
//                     If you want to mount the child at the end of a descendant node, pass in <insertBefore> as an object with
//                     the property "appendTo" like... , {appendTo:<descendant node>}).
// Usage:
// The name parameter is optional but for readability, it must be in the p1 position if provided.
// Note that if the p1 param is a single word content and the insertBefore is specified it will incorrectly be interpreted as
// Form1.  You can pass 'unnamed' as the first paramter to avoid this ambiguity and still result in an unnamed child.
//    Form1: ComponentMount(<parent>, <name>, <childContent> [,<insertBefore>])
//    Form2: ComponentMount(<parent>, <childContent> [,<insertBefore>])
export function ComponentMount($parent, p1, p2, p3) {
	// detect form1 and form2
	var name, childContent, insertBefore;
	// if p3 is specified the user maust have called with 3 params so it must be form 1
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
			if (reHTMLContent.test(childContent)) {
				// it begins with an html tag so interpret it as html
				element = document.createElement('div');
				element.innerHTML = childContent.trim();
				element = element.firstChild;
			}
			else
				element = document.createTextNode(childContent);
				//element = text(childContent);

			childContent = element;
			break;

		case 'object':
			// iterate an array of children and recursively add them
			if (Array.isArray(childContent)) {
				if (name && parent[bgComponent])
					parent[name]=[];
				for (var i =0; i<childContent.length; i++) {
					var aryElement = childContent[i]
					// TODO:344 interpret the second level arrays as bgComponent construction params
					// 2020-10 added this block in support of TODO:344. if the second level is an array, treat it as construction params for a bgComponent.
					if (Array.isArray(aryElement)) {
						aryElement = ComponentConstruct(
							(parent.defaultChildType) ? {defaultConstructor:parent.defaultChildType} : null,
							...aryElement);
					}
					// call ComponentMount explicitly with all the params to avoid any ambiguity -- if insertBefore is undefined, pass null
					var mountedChild = ComponentMount([parentObj, parentEl, parent], null, aryElement, insertBefore || null);
					if (name && parent[bgComponent])
						parent[name][i] = mountedChild;
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
		FireDOMTreeEvent(child, 'onPreConnected');

	// do the work
	if (insertBefore) {
		if ("appendTo" in insertBefore) {
			const appendToEl = ComponentToEl(insertBefore["appendTo"]);
			appendToEl.appendChild(childEl);
		} else {
			const insertBeforeEl = ComponentToEl(insertBefore);
			// We allow insertBeforeEl to be a non-direct descendant. Maybe we should check and assert that insertParent is a descendant
			// of parentEl.
			const insertParent = insertBeforeEl.parentNode
			insertParent.insertBefore(childEl, insertBeforeEl);
		}
	} else {
		parentEl.appendChild(childEl);
	}

	if (isConnecting)
		FireDOMTreeEvent(child, 'onConnected');

	// if name was not explicitly passed in, see if we can get it from the content
	if (!name && child && typeof child.name == 'string')
		name = child.name;

	if (bgComponent in parent) {
		if (name) {
			parent[name] = child;
			if (!parent.mounted)
				parent.mounted = [];
			parent.mounted.push(name);
			if (childEl && childEl.classList) childEl.classList.add(name);
		} else {
			if (!parent.mountedUnamed)
				parent.mountedUnamed = [];
			parent.mountedUnamed.push(child);

			// this block pulls named bgComp components up through unamed components. For example, in a view component you create
			// a bunch of content, some named so that you can interact wih them in the view's methods but some of the named components
			// are grouped in unamed panels for display organization. This block makes those unamed panels transparent wrt naming
			// so that the named components are accesible in the view as if they were not in the nested panels.  
			if ((bgComponent in child) && Array.isArray(child.mounted) && !child.root) {
				var cName;
				while (cName=child.mounted.shift()) {
					parent.mounted.push(cName);
					parent[cName]=child[cName];
					delete child[cName];
					child.parent=parent;
				}
			}
		}
	}

	if (bgComponent in child) {
		if (child.parent && child.parent!==parent)
			console.log('replacing child.parent = ',child.parent, ' with ', parent);
		child.parent = parent;
		child.name = name;
	}

	lifeCycleChecker && lifeCycleChecker.mark(child, 'onMounted');
	if (typeof child.onMount == 'function')
		child.onMount()

	return child;
}

// This mounts a child that is already a DOM node descendant of $parent into a named child
export function ComponentMountAdd($parent, name, $child) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	const [childObj,  childEl,  child ] = ComponentNormalize($child);

	if (parent[bgComponent]) {
		if (name) {
			parent[name] = child;
			if (!parent.mounted)
				parent.mounted = [];
			parent.mounted.push(name);
			if (childEl && childEl.classList) childEl.classList.add(name);
		} else {
			if (!parent.mountedUnamed)
				parent.mountedUnamed = [];
			parent.mountedUnamed.push(child);
		}
	}

	if (child[bgComponent]) {
		if (child.parent && child.parent!==parent)
			console.log('replacing child.parent = ',child.parent, ' with ', parent);
		child.parent = parent;
		child.name = name;
	}

	lifeCycleChecker && lifeCycleChecker.mark(child, 'onMounted');
	if (typeof child.onMount == 'function')
		child.onMount()
}


// Tear down the parent<->child relationship that ComponentMount created
// Params:
//    <$parent>  : the parent bgComp of the relationship
//    <$child>   : the child being unmounted. Can be the bgComp or the name in the context of $parent
export function ComponentUnmount($parent, $child) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	var name
	if (typeof $child == 'string') {
		name = $child;
		$child = parent[name];
		console.assert(!!$child, "ComponentUnmount: unmounting a child by name that does not exist in the parent", {parent, name, passedInChild:$child, namedChild:parent&&parent[name]});
	}
	const [childObj,  childEl,  child ] = ComponentNormalize($child);

	if (typeof child.onPreUnmount == 'function')
		child.onPreUnmount()

	const isDisconnecting = childEl.isConnected;

	if (isDisconnecting)
		FireDOMTreeEvent(child, 'onPreDisconnected');

	// remove from the DOM relation
	//TODO: to do this check right, we need to walk the parent chain to find parentEl b/c it might not be a direct child
	//console.assert(!!parentEl && !!childEl && childEl.parentNode===parentEl, "ComponentUnmount ill-specified relation to tear down", {parent:parent, name, child:child, namedChild:parent&&parent[name], parentEl, childEl})
	if (childEl) {
		childEl.remove();
	}

	if (isDisconnecting)
		FireDOMTreeEvent(child, 'onDisconnected');

	// remove the BG Node relation from the parent
	if (parent[bgComponent]) {
		if (!name && (bgComponent in child))
			name=child.name;
		// we support adding a DOM node as a named child so we can not assume that child identifies its name in any way so
		// we have to iterate the named children and see if we find child
		if (!name) for (const cName of parent.mounted) if (parent[cName]===child) {
			name = cName
			break;
		}
		if (name && Array.isArray(parent.mounted)) {
			const i = parent.mounted.indexOf(name);
			if (i != -1) {
				parent.mounted.splice(i,1);
				delete parent[name];
			}
		}
		// remove a unnamed relation
		if (!name) {
			if (Array.isArray(parent.mountedUnamed)) {
				var i = parent.mountedUnamed.indexOf(child);
				if (i == -1) i = parent.mountedUnamed.indexOf(childEl);
				if (i != -1) parent.mountedUnamed.splice(i,1);
			}
		}
	}

	// remove the BG Node relation from the cild
	if (child[bgComponent] && ("parent" in child))
		delete child[parent];

	lifeCycleChecker && lifeCycleChecker.mark(child, 'onUnmounted');
	if (typeof child.onUnmount == 'function')
		child.onUnmount()

	return child;
}

// ComponentUnmount the child from its parent and then destroy it
// Params:
//    <parent>  : the parent bgComponent of the relationship
//    <name>    : the name of the child in the context of the parent or undefined if the child is unnamed
//    <child>   : if <name> is undefined, the child object must be passed in.
export function ComponentDestroyChild($parent, nameOrChild) {
	const childObj = ComponentUnmount($parent, nameOrChild);
	typeof childObj.destroy == 'function' && childObj.destroy();
	return childObj;
}


export function ComponentAppendChild($parent, ...childContent) {
	ComponentMount($parent, null, childContent, null);
}

export function ComponentInsertBefore($parent, referenceChild, ...childContent) {
	ComponentMount($parent, null, childContent, referenceChild);
}

export function ComponentRemoveChild($parent, ...childContent) {
	const results=[];
	for (const child of childContent) {
		const oldChild = ComponentDestroyChild($parent, child);
		oldChild && results.push(oldChild);
	}
	return results;
}

export function ComponentReplaceChildren($parent, ...childContent) {
	const [parentObj, parentEl, parent] = ComponentNormalize($parent);
	// TODO: This should be optimized to merge childContent with the existing childContent to minimumally change the dom
	while (parentEl.firstChild)
		ComponentDestroyChild([parentObj, parentEl, parent], parentEl.lastChild);
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

	var insertLocation= (childEl) ? childEl.nextSibling : null;
	if (!insertLocation && childEl && childEl.parentNode)
		insertLocation = {appendTo:childEl.parentNode}

	if (child) ComponentDestroyChild([parentObj, parentEl, parent], child);

	for (var i=newContent.length-1; i>=0; i--) {
		ComponentInsertBefore([parentObj, parentEl, parent], insertLocation, newContent[i])
	}
}


export function ComponentConstruct(...p) {
	//TODO: support dynamic construction of a specific Component type, based on the $<type> field, maybe use customElements.define (CustomElementRegistry)
	const componentParams = new ComponentParams(...p);
	if (componentParams.Constructor) {
		return new componentParams.Constructor(...p);
	} else if (componentParams.defaultConstructor) {
		return new componentParams.defaultConstructor(...p);
	} else {
		return new global.bg.Component(componentParams);
	}
}

// return the best name for the bgComp. If is has a name field, use that, otherwise use the makeTagIDClasses algorithm
export function ComponentGetName(bgComp, terseFlag) {
	if (!bgComp) return '';
	const [bgObj, bgEl] = ComponentNormalize(bgComp);
	if (bgObj && typeof bgObj.name=='string') return bgObj.name;
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

const sLastFire = Symbol.for('bg_sLastFire')

export function FireDOMTreeEvent(startNode, methodName, recurseFlag) {
	if (!startNode) return;
	const [bgObj, bgEl, bgComp] = ComponentNormalize(startNode);
	// if this is the top node being connected/disconnected, debounce the event b/c sometimes it will be fired mutiple times b/c
	// there is no perfect place to call it from to to get all cases, there is some overlap that would be hard to eliminate
	if (!recurseFlag) {
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

// The purpose of this class is to generate onconnected and onDisconnected events for bgComponents when they are mounted/unmounted
// to/from the document.documentElement tree.
// This implementation uses the MutationObserver to watch all childList changes to the entire DOM tree and checks each added and
// removed child against the set of nodes that are participating in onConnected and onDisconnected events.
// There are two problems with this implementation.
//    problem1: its not very efficient -- each added or removed node is checked against the list of participating nodes
//    problem2: MutationObserver bundles changes and runs at the end of a tick. For example, Atom removes a WorkspaceItem view from
//              the document DOM tree and then calls destroy on it. When destroy runs on our view component, its already been removed
//              but the onDisconnect event will not have fired b/c it will fire at the end of the current tick.
class DOMTreeConnectWatcher_childListMethod {
	mutationsToWatch = {childList:true, subtree:true};
	constructor() {
		this.watchNodes = new Set();
		this.watchDom = new MutationObserver((mutations)=>{this.onDOMMutation(mutations);});
		this.watchDom.observe(document.body, this.mutationsToWatch);
	}

	addToWatch(node)      {this.watchNodes.add(ComponentToEl(node));}
	removeFromWatch(node) {this.watchNodes.delete(ComponentToEl(node));}

	onDOMMutation(mutations) {
		for (const mutation of mutations) {
			this.trace && console.log('DOMTreeConnectWatcher_childListMethod'+mutation.type, mutation);
			for (const addedNode of mutation.addedNodes) {
				this.trace && console.log('   Adding', addedNode);
				if (this.watchNodes.has(addedNode) && addedNode.isConnected)
					FireDOMTreeEvent(addedNode, 'onConnected')
			}
			for (const removedNode of mutation.removedNodes) {
				this.trace && console.log('   Removing', removedNode);
				if (this.watchNodes.has(removedNode) && !removedNode.isConnected)
					FireDOMTreeEvent(removedNode, 'onDisconnected')
			}
		}
	}
}

// The purpose of this class is to generate onconnected and onDisconnected events for bgComponents when they are mounted/unmounted
// to/from the document.documentElement tree.
// This implementation does not work because parentNode is a node property and not an 'attribute'
// I did a test watching unfiltered attribute changes and none change when a node is added to another node (i.e. parentNode changes)
class DOMTreeConnectWatcher_parentChangeMethod {
	mutationsToWatch = {attributes:true,attributeFilter:['parentNode'],attributeOldValue:true};
	constructor() {this.watchDom = new MutationObserver((mutations)=>{this.onDOMMutation(mutations);});}
	addToWatch(node) {this.watchDom.observe(node, this.mutationsToWatch);}
	removeFromWatch(node) {
		// there is no MutationObserver method to remove a node from being watched. Hopefully that is because it only tags the node
		// so that there is nothing to keep the node from being garbage collected.
	}

	onDOMMutation(mutations) {
		for (const mutation of mutations) {
			if (mutation.target.isConnected)
				FireDOMTreeEvent(mutation.target, 'onConnected')
			else
				FireDOMTreeEvent(mutation.target, 'onDisconnected')
		}
	}
}

// The purpose of this class is to generate onconnected and onDisconnected events for bgComponents when they are mounted/unmounted
// to/from the document.documentElement tree.
// This implementation patches the Node and Element prototypes to efficiently fire the onConnected and onDisconnected events
const sConnectWatchTag  = Symbol.for('DOMTreeConnectWatcher');
const s_appendChild     = Symbol.for('bg_method_appendChild');
const s_insertBefore    = Symbol.for('bg_method_insertBefore');
const s_removeChild     = Symbol.for('bg_method_removeChild');
const s_replaceChild    = Symbol.for('bg_method_replaceChild');
const s_append          = Symbol.for('bg_method_append');
const s_prepend         = Symbol.for('bg_method_prepend');
const s_replaceChildren = Symbol.for('bg_method_replaceChildren');
const s_remove          = Symbol.for('bg_method_remove');
const s_replaceWith     = Symbol.for('bg_method_replaceWith');
const s_after           = Symbol.for('bg_method_after');
const s_before          = Symbol.for('bg_method_before');
class DOMTreeConnectWatcher_nodePrototypePatchMethod {
	constructor() {
		// From Parent (older API from Node)
		this.install(Node.prototype, s_appendChild,  'appendChild');
		this.install(Node.prototype, s_insertBefore, 'insertBefore');
		this.install(Node.prototype, s_removeChild,  'removeChild');
		this.install(Node.prototype, s_replaceChild, 'replaceChild');

		// From Parent (newer API from ParentNode interface implemented in Element)
		this.install(Element.prototype, s_append, 'append');
		this.install(Element.prototype, s_prepend, 'prepend');
		this.install(Element.prototype, s_replaceChildren, 'replaceChildren');

		// From child (newer API from ChildNode interface implemented in Element)
		this.install(Element.prototype, s_remove, 'remove');
		this.install(Element.prototype, s_replaceWith, 'replaceWith');
		this.install(Element.prototype, s_after, 'after');
		this.install(Element.prototype, s_before, 'before');
	}
	destroy() {
		this.uninstall(Node.prototype, s_appendChild,  'appendChild');
		this.uninstall(Node.prototype, s_insertBefore, 'insertBefore');
		this.uninstall(Node.prototype, s_removeChild,  'removeChild');
		this.uninstall(Node.prototype, s_replaceChild, 'replaceChild');

		this.uninstall(Element.prototype, s_append, 'append');
		this.uninstall(Element.prototype, s_prepend, 'prepend');
		this.uninstall(Element.prototype, s_replaceChildren, 'replaceChildren');

		this.uninstall(Element.prototype, s_remove, 'remove');
		this.uninstall(Element.prototype, s_replaceWith, 'replaceWith');
		this.uninstall(Element.prototype, s_after, 'after');
		this.uninstall(Element.prototype, s_before, 'before');
	}

	addToWatch(node)      {node[sConnectWatchTag]=true;}
	removeFromWatch(node) {delete node[sConnectWatchTag];}

	// private helper methods
	install(  obj, sName,name) {obj[sName] = obj[name];  obj[name] = this[name];}
	uninstall(obj, sName,name) {obj[name] = obj[sName];}

	// Node.prototype Methods
	// 'this' is the parent in these methods

	appendChild(child,...p) {
		if (!child[sConnectWatchTag] || !this.isConnected) return this[s_appendChild](child,...p);
		const isConnecting = (!child.isConnected );
		const result = this[s_appendChild](child,...p);
		isConnecting && FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	insertBefore(child, ref,...p) {
		if (!child[sConnectWatchTag] || !this.isConnected) return this[s_insertBefore](child, ref,...p);
		const isConnecting = (!child.isConnected );
		const result = this[s_insertBefore](child, ref,...p);
		isConnecting && FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	removeChild(child,...p) {
		if (!child[sConnectWatchTag] || !this.isConnected) return this[s_removeChild](child,...p);
		const result = this[s_removeChild](child,...p);
		FireDOMTreeEvent(child, 'onDisconnected');
		return result;
	}
	replaceChild(newChild,oldChild,...p) {
		if ((!oldChild[sConnectWatchTag] && !newChild[sConnectWatchTag]) || !this.isConnected) return this[s_replaceChild](newChild,oldChild,...p);
		const isDisconnecting = (oldChild[sConnectWatchTag]);
		const isConnecting    = (newChild[sConnectWatchTag] && !newChild.isConnected );
		const result = this[s_replaceChild](newChild,oldChild,...p);
		isDisconnecting && FireDOMTreeEvent(oldChild, 'onDisconnected');
		isConnecting    && FireDOMTreeEvent(newChild, 'onConnected');
		return result;
	}

	// Element.prototype Methods from ParentNode interface
	// 'this' is the parent in these methods

	append(...children) {
		if (!this.isConnected) return this[s_append](...children);
		const connectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		const result = this[s_append](...children);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	prepend(...children) {
		if (!this.isConnected) return this[s_prepend](...children);
		const connectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		const result = this[s_prepend](...children);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	replaceChildren(...children) {
		if (!this.isConnected) return this[s_replaceChildren](...p);
		const connectingChildren = [];
		const disconnectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		for (const child of this.children) if (child[sConnectWatchTag] && child.isConnected)
			disconnectingChildren.push(child);
		const result = this[s_replaceChildren](...children);
		for (const child of disconnectingChildren)
			FireDOMTreeEvent(child, 'onDisconnected');
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}

	// Element.prototype Methods from ChildNode interface
	// 'this' is the child in these methods

	remove(...p) {
		if (!this[sConnectWatchTag] || !this.isConnected) return this[s_remove](...p);
		const result = this[s_remove](...p);
		FireDOMTreeEvent(this, 'onDisconnected');
		return result;
	}
	replaceWith(...children) {
		if (!this.isConnected) return this[s_replaceWith](...children);
		const connectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		const result = this[s_replaceWith](...children);
		FireDOMTreeEvent(this, 'onDisconnected');
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	after(...children) {
		if (!this.isConnected) return this[s_after](...children);
		const connectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		const result = this[s_after](...children);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
	before(...children) {
		if (!this.isConnected) return this[s_before](...children);
		const connectingChildren = [];
		for (const child of children) if (child[sConnectWatchTag] && !child.isConnected)
			connectingChildren.push(child);
		const result = this[s_before](...children);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, 'onConnected');
		return result;
	}
}
//const domTreeChanges = new DOMTreeConnectWatcher_childListMethod();
const domTreeChanges = new DOMTreeConnectWatcher_nodePrototypePatchMethod();

global.domTreeChanges = domTreeChanges;



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
