import { BGError }            from './BGError';
import { ComponentConstruct } from './componentCore'

// This is the regex used to parse tagIDClasses strings (any strings that is pass directly into a ctro is considered a tagIDClasses)
// Note that the re group names are the parameter names. This re must match '' (all groups are optional)
// Note that a space separates the free form textContent with the structured sytax at the start
// syntax: [name:][$<tagName>][#<idName>][.classNames][ textContent]
//         where classNames is [className[.className2...]]
export const reContentIDClasses = /^((?<name>[\]_a-zA-Z0-9\[]*):)?([$](?<tagName>[-_a-zA-Z0-9]*))?(#(?<idName>[-_a-zA-Z0-9]*))?(?<className>[.][-!_.a-zA-Z0-9]*)?(\s+|,|$)?((?<icon>icon-[-_a-zA-Z0-9]+)(\s+|,|$))?(?<label>.*)?$/;
export const reContentIDClassesClassifiers = {
	name      : 'top',
	tagName   : 'top',
	idName    : 'top',
	className : 'className',
	icon      : 'optParam',
	label     : 'optParam'
}

export const reDOMCallbackProp = /^on[a-z]/;

// This map looks up a name and returns true if it is a known style property name. It is used to move options object's member names
// that the user puts at the top level into the 'style' sub-member. This makes it easier for users to specify just a few styles.
// without having the verbosity of creating the style sub-object.
// This list was created from https://www.w3schools.com/jsref/dom_obj_style.asp
// TODO: investigate if we can get a reference to a style sheet object that has all the styles in its prototype and check against that instead
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


//scraps
//              Element Types
//                   'object'w/el       as <content> (same as first level, see below)
//                   'object'w/nodeType as <content> (same as first level, see below)
//                   'string' :         as <content> either innerHTML content or plain text determined explicitly if it begins with
//                                      '@TEXT' or '@HTML'. If neither, the regex reHTMLContent is used to determine the type.
//                                      plain text will be wrapped inside an html TextNode
//                   'array'  :         as a parameter list that will be used to dynamically construct some component type.
//                                      note: that second level arrays are interpretted differently than the first level

//function unnamed parameters are interpretted as a defaultCB and added to a composite function that can be retrieved
//          with this.getCompositeCB(). Its not uncommon for a component type to support a callback that is unabiguous in the context of
//          that component type so it can appear anywhere in the parameter list and still be understood. Multiple levels could provide
//          a callback in which case its reasonable for the derived class to invoke each in turn when firing its event.
//          A component can support multiple types of callbacks by simply documenting the names that can be given and then calling
//          this.getCompositeCB(<name>) on each supportted names and then calling this.assertNoUnusedCallbacks().



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
//    long parameter list into one normalized set of information that is required to create a new DOMNode and possible a tree of
//    children underneath it. The Component class puts the resulting set of information in the this.componentParams property so that
//    it is available in each of the hierarchy's class's constructors after the super() call.
//
//    Information earlier in the parameter list (more to the left) will supercede information later in the list (more to the right).
//    with the same name. A component class can use this to decide whether the information it provides will be a default value that
//    the level above it can override or whether it is a mandatory value that can not be overridden.
//
// Passing Information as Named vs Unnamed (type based) :
//    No parameter passed to the ComponentParams constructor is identified by its position so there are really no positional parameters.
//    Parameters that are passed directly to this constructor are interpretted by examining their type and structure instead of by
//    the position that they occupy in the list of parameters. Four types of parameters are accepted arrays, objects, strings and
//    functions.
//
//    Named parameters are implemented by passing an object whose keys are the names of the parameters. Some of the objects in the
//    parameter list will be identified and used this way to pass explicitly named parameters. Other objects typed unnamed parameters
//    will be interpretted as child content if their structure indicates they are either a DOMNode or BGNode.
//
//    The reason unamed parameter types are supported is to provide a more user friendly, compact syntax for creating components.
//
// Unamed Params (type based):
// Note that strings and arrays are treated differently based on whether they appear in the first level of parameters passed into
// us or whether they are elements in a nested array.
// Top Level Type Interpretation
//   'string' : is interpretted as <tagIDClasses>. This is a compact way of specifying the identifying properties (name, tagNag,
//              idName, classes) as well as some shorthand content (text label and/or iconName).
//              Note that strings inside Arrays are interpreted differently.
//
//   'array'  : is interpretted as <content> where each array element is interpretted as a <contentSingle>.
//
//   'object' : is examined and interpreted as one of these three types
//        'object'w/el : (BGNodes) objects with a property named 'el' are interpreted as a <contentSingle>
//
//        'object'w/nodeType : (HTMLElements) objects with a property named 'nodeType' are interpreted as <contentSingle>
//
//        'object'(other) : objects that dont match BGNode nor DOMNode types are interpretted as a container for named parameters.
//
//   'function' : is interpretted as <callback> with the name 'defaultCB'.
//
// Named Parameters:
// Explicitly named parameters can be passed inside container objects where the properties are treated as (name,value) pairs.
// To be recognized this way, the object can not contain a property named either 'el' or 'nodeType'.
// Note that in the follow description the names that are not in <> are the literal keys that will be recognized. Those that are
// in <> like <knownStyles> refer to a set of names that will be recognized.
//    tagName       :string     : The name of the dom/html element type (e.g. 'div', 'span', 'li', etc...)
//    name          :string     : the variable name used for a component. Typically this is relative to its parent.
//    idName        :string     : the html id attribute.
//    class
//    classes
//    className,
//    classNames    :stringSet  : The singular and plural versions of 'class' and 'className' are all synonyms for the same thing
//                                which is a space or '.' separated list of classNames.
//    label         :string     : text that will be set as the direct content of this node.
//                                if it starts with '@HTML' it will be trested as html
//                                if it starts with '@TEXT' it will be trested as plain text
//                                If the regex reHTMLContent matches it will parsed as html
//                                otherwise it is taken as plain text.
//                                Note that most child content is positional in that the order they appear in the parameter list is
//                                the order of the children under the BGComp being created. Label, however, is not. Label will be
//                                the first text node under the BGComp. There can also be unnamed text content that becomes text
//                                nodes in the regular child content order.
//    children      :array
//    content       :array      : an array of <contentSingle>
//    children      :object
//    content       :object     : a <contentSingle> which must be a BGComp. It is an error if the object can not be identified as any BGComp
//    children      :string
//    content       :string     : a <contentSingle> created from the string. The string can start with @TEXT or @HTML to determine
//                                how a child node is created from the rest of the string. If it does not, if the string matches
//                                reHTMLContent it will be the outer HTML of the child node, otherwise it will become a text node.
//
//    tagIDClasses  :string     : a shorthand for specifying 0 or more of (name,tagName,idname,classes,icon,label)
//                               syntax: [<name>:][$<tagName>][#<idName>][.<class>[.<class>...]][ [<icon>][<label>]]
//                               This is controlled by the  reContentIDClasses regex and its reContentIDClassesClassifiers
//    defaultCB     :function   : a function that will be added to the component's default <callback>.
//    defaultCBName :string     : its value will be an alias for 'defaultCB' for both specifying and retrieving the defaultCB.
//                                It can be specified multiple times to create multiple aliases. This parameter is hoisted so that
//                                it will apply to all parameters with a matching name regardeless of the order they appear.
//    Constructor   :classFn    : this is used for dynamic construction of bgComponents. Even new Component(...) will honor this
//                                and return an instance of Constructor class.
//    defaultConstructor:classFn: <classFn> will be used as the constructor function if the builder does not already have a constructor
//                                function possible from the 'Constructor' param.
//    defaultChildConstructor:classFn: <classFn> will become the value of defaultConstructor when children are created from construction
//                                parameters.
//    paramNames    :stringSet  : space separated list of parameter names that extend this list of named parameters. Other parameters
//                                matching these names will be placed in the optParams sub-object.
//                                'paramNames' values are hoisted so that they will identifiy other parameters regardless of order.
//   <paramNames>   : any       : anyname specified in any paramNames parameter can be used as a named parameter and it will be
//                                sorted into the optParams sub-object and are generally considered properties of the BGNode.
//   <stylesName>   : string    : if name matches one in the knownStyles map, it will be sorted into the styles sub-object.
//   <other>        : multiple  : names that are not recognized will be sorted in the props sub-object which and become properties
//                                of the DOMNode created.
//
// Explicit Sorting Containers:
// For named parameters in the top level of objects contained (name,value) pairs that do not match one of the known, literal names,
// there is an algorithm to determine what kind of (name,value) pair it it the choices are optParams, props, or styles. We can
// override that algorithm by placing the (name,value) pair into a sub-object with one of these names. It also provides a way to be
// more explicit in the description for people reading the code.
//    optParams     :object     : named parameters introduced by a component class for features it implements. Generally, these can
//                                be considered properties of the BGNode  (which is the js object asscociated with a DOMNode).
//                                keys in this sub-object should be a name specified in paramNames but that is not enforced.
//    props         :object     : Attributes / Properties to be set in the created DOM node. Keys of this object can be any property
//                                supportted by the DOM
//    styles        :object     : css styles to be set in the created DOM node. Keys of this object can be any style property name
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
//    logically attributes of the same component/DOMNode concept. If a component author creates a parameter name with the same
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
//           When a parameter is specified with a name in the the paramNames list, that parameter is stored in the optParams sub object
//     content : multivalued : content is kept in an array and each content parameter encountered will be appending to the array.
//           in the end, the array will be reversed so that the effect is that content provided by dervied classes will by default
//           appear after content provided in a base class.
//     <callbacks> : multivalued : callbacks are identified by their value being functions. An unnamed function or a named function
//           that is not named 'Constructor' nor 'defaultConstructor' nor 'defaultChildConstructor' are callbacks. Each callback
//           name encountered has an array allocated and callbacks with that name are appended in order they are encountered
//           (basically left to right). The method getCompositeCB(<name>,forceFlag) will return a function that will call all the
//           callbacks in the corresponding array (if any). unnamed callbacks are stored under the name 'defaultCB'. If defaultCBName
//           is specified callbacks named with its value will also be stored under the name 'defaultCB'. When calling getCompositeCB(),
//           'defaultCB', defaultCBName, or not providing a name will all return the callback correspnding to 'defaultCB'.
//     optParams,props,styles : these are containers of named data and each key is treated separately according to its name.
//
// Canonical Data:
// After processing the incoming parameter list, the ComponentParams instance will contain the state that describes how the BGComp
// should be built. Typically, the base of a component hierarchy will use this to create its BGNode ('el') and fill in its own state.
// Other things like the Html() function can use the data to create a BGComp that consists solely of the BGNode.
//    Identity...
//       name       : a name complying with js variable names. Used to navigate to the object from its parent.
//       tagName    : the type of BGNode -- div, span, ul, etc...
//       idName     : the # id of the DOMNode. must be unique in the entire page context.
//       classeName : class name(s) to be added (separated by either whitespace or '.')
//       Constructor: if present, this is the contructor that should be used to turn the ComponentParams into a BGComp. This supports
//                    dynamic construction of BGComp where the data descript determines the js class of the BGNode part of the BGComp.
//   props     : an object of (name,value) pairs of the DOMNode properties to be used to create the DOMNode.
//   optParams : an object of (name,value) pairs that can enfluence the BGComp in some way determined by the component type author
//   styles    : an object of (name,value) pairs of css styles that should be applied directly to the DOMNode when its created
//   content   : an array where each element is a child BGComp that should be mounted in order as children. The elements are in the
//               order that they were encounted from left to right.
//   label     : text content that can be interpretted by the code that uses ComponentParams. Often its the inner text or html before
//               the child content (if any) is appended to the end.
//   defaultConstructor: This is similar to Constructor, but is only used if Constructor nor a constructor from another source is specified
//   defaultChildConstructor : if any child content is specified as construction parameters (either an array of parameters or a
//               tagIDClasses string), this constructor is added to it as the child's defaultConstructor. For example, a list component
//               can make it so that any children specified as construction parameters will be list items if they do not explicitly
//               specify their Constructor type.
//   callbacks : these are typically accessed via getCompositeCB(name='defaultCB'). Note that callback names that match reDOMCallbackProp
//               are be moved out of here and into the props object so that they are applied directly to the created DOMNode.
//   trace     : if the trace member is truthy, it indicates that the BGComp being created should trigger trace statements for debugging.
export class ComponentParams
{
	// return the tagIDClasses string that represents the <el> passed in.
	static makeTagIDClasses(el, options={}) {
		if (!el) return '';
		var tagIDClasses;
		if (el.nodeName)
			tagIDClasses=`\$${el.nodeName.toLowerCase()}`;
		else if (el.tagName)
			tagIDClasses=`\$${el.tagName.toLowerCase()}`;
		if (el.id)
			tagIDClasses+=`#${el.id}`;
		if (!options.terseFlag && el.classList.length>0)
			tagIDClasses+=`.${Array.from(el.classList).join('.')}`;
		return tagIDClasses;
	}

	// params can be any number of the the types (string, array, object, or function) in any order
	constructor(...params)
	{
		// first, make a quick pass to look for an instance of ourselves and return it if found instead of creating a new instance.
		// This supports dynamic construction of Components where the class of the component is embedded in the parameters then we
		// call the constructor passing in the already parsed ComponentParams. This avoids parsing ComponentParams twice. The
		// intermediate classes in the hierarchy will blindly add additional params in their super() calls so the ComponentParam
		// object may be in the middle of a list of params. we dont want to burden the component author with checking.
		for (const param of params)
			if (param instanceof ComponentParams)
				return param;

		// single valued params are initialized as undefined and combinable or special params are initialized to their empty type
		this.tagName       = undefined;
		this.name          = undefined;
		this.idName        = undefined;
		this.Constructor             = undefined;   // added to support dynamic construction. The BGComp *should* be created with this.
		this.defaultConstructor      = undefined;   // The BGComp *may* be created with this if the builder does not have a better one
		this.defaultChildConstructor = undefined;   // when child are specified as construction params, this is added as their defaultConstructor
		this.className     = '';
		this.content       = [];
		this.optParams     = {};
		this.paramNames    = {label:true, icon:true};
		this.props         = {};
		this.styles        = {};
		this.style         = {};
		this.defaultCBName = {defaultCB:true, '':true};
		this.callbacks     = {defaultCB:[]};
		this.lockedParams = {};
		this.root=false; // root is a concept to determine how far name propagation travels up the parent chain.

		// short circuit ctor after initializing member vars
		if (params.length>0 && params[0] == ComponentParams.wrapNode) {
			this.wrapNode = params[1];
			return
		}

		// hoisting pass: make another quick pass to hoist all the paramNames and defaultCBName so that we can correctly classify
		// other parameters that have those dynamically specified names regardless of the order.
		for (const param of params) {
			if (param && typeof param == 'object') {
				if ('paramNames' in param)
					for (const name of param.paramNames.split(/\s+/))
						this.paramNames[name] = true;
				if ('defaultCBName' in param) {
					this.defaultCBName[param.defaultCBName] = true;
					this.defaultCBName.capturing = true;
				}
			}
		}

		// main pass: The purpose of this loop is to assign names to these unnamed 'positional' parameters based on their type
		//            Each pass will call reduceAttribute one or more times with the identified name specified.
		for (const param of params) if (param) {
			// in this top level loop, no param are named so we go only by the type.
			const paramType = Array.isArray(param) ? 'array' : typeof param;
			switch (paramType) {
				case 'array':
					// arrays in the param list are interpretted as arrays of content. We name them 'contentSingle' to distingish
					// them from named 'content' parameters where an array is a list of contentSingle just like unnamed arrays.
					for (const aryContent of param)
						this.reduceAttribute(null, 'contentSingle', null,     aryContent);
				break;

				case 'object':
					// detect known DOM content types
					// TODO: maybe it would be better to test (param instaceof HTMLElement) || (bgComponent in param) ?
					if (('nodeType' in param) || ('el' in param)) {
						this.reduceAttribute(null, 'content',       'object', param);

					// all other objects are interpretted as containers of named parameters. Each member of this object could be
					// a named parameter that needs to be classified or a sub-object props:{}, styles:{}, or optParams:{} that will
					// be further reduced.
					} else {
						for (var name in param)
							this.reduceAttribute(name,  null,      null,    param[name]);
					}
				break;

				case 'string':
					// its a tagIDClasses -- parse and process
					// note that we could check to see if the string matches the reContentIDClasses regex and treat it as content otherwise
					// but its more conservative to let reduceAttribute throw an exception since it could be a subtle error in syntax.
					// 2022-11 bobg: been using for a while and it seems clear that top level strings should only be tagIDClasses.
					//               the convention to wrap things in [] to declare that they are content (including strings) is a
					//               convenient way to specify that a string is a construction param instead of a tagIDClasses and
					//               often the string construction param is a tagIDClasses so we need to explicitly state whether it
					//               should apply to this BGComp object (aka, unnamed top level string) or a child to be created
					//               (aka a string inside an array)
					this.reduceAttribute(null, 'tagIDClasses', 'string', param);
				break;

				case 'function':
					// its a defaultCB
					this.reduceAttribute('defaultCB', 'callback', 'function', param);
				break;

				default:
					console.assert(false, "unknown parameter type in Component parameter list. Expecting Objects, strings and functions", {paramValue:param, paramType, componentParams:this, paramList:params})
			}
		}

		// its actually called 'style' but it seems like it should be called 'styles' so make an alias so we can use either one.
		this.style = this.styles;

		// fixup recognized callbacks by moving them from this.callbacks to this.props or this.optParams
		for (const cbName in this.callbacks) {
			if (cbName in this.paramNames)
				this.optParams[cbName] = this.getCompositeCB(cbName, true);
			else if (reDOMCallbackProp.test(cbName)) {
				this.props[cbName] = this.getCompositeCB(cbName, true);
				delete this.callbacks[cbName];
			}

		}
	}

	// return a classifier string which determines how to reduce the attribute.
	// The main loop in the ctor named all the unnamed parameters but now we need to determine how to process them. The classifier
	// string returned by this method groups together parameters that are processed the same way even if they have different names
	// Note that this function only tries to fill in classifier and valueType if they are not already known. If either are passed in,
	// it passes them through to the returned array, unchanged. Sometimes the context of the processing already knows those values.
	// Why?
	//    We classify and then process because some things can be identified multiple ways. For example, a prop could be a named param
	//    that is not recognized to be something else, or it could be inside a {props:{name:value}} that explicitly identifies it as a
	//    property and not a style or optParam.
	//    For simple name/value pairs its easy to call setSingleValuedAttr from mutiple places but content and contentSingle require
	//    non-trivial processing blocks.
	//    Counterpoint: we could create functions for each type of processing -- setContent, setContentSingle, etc...
	// Classifiers:
	//     content       : one child content or an array of child contents
	//     contentSingle : a single child content. an array is construction params. objects can be DOMNode or BGNode
	//     tagIDClasses  : the shorthand notation
	//     noop          : its already been processed in the hoisting pass
	//     props         : properties of the DOMNode that will be created
	//     optParams     : an object containing properties that the builder will use to make the component
	//     optParam      : an value to be put in the optParams sub object
	//     styles        : styles added directly to the DOMNode
	//     className     : a stringset of classNames
	//     callback      : a function callback that either the DOMNode or the BGNode will invoke at some event
	//     top           : a handfull of important properties (name, tagName, idName, etc.. )
	classifyAttribute(name, classifier, valueType, value)
	{
		// make sure valueType is filled in. Its used in this function and also returned
		if (!valueType)
			valueType = (value===null) ? 'null' : Array.isArray(value) ? 'array' : typeof value;

		if (classifier) {
			// its already known
		}

		// these param names are the classifier name also
		else if (/^(content(Deep)?|tagIDClasses)$/.test(name)) {
			classifier = name;
		}

		// these hae already been hoisted so they are noops. Maybe we should have removed them in the hoisting pass but I suspect
		// its more efficient not to remove properties of objects
		else if (/^(paramNames|defaultCBName)$/.test(name)) {
			classifier = 'noop';
		}

		// these are container param names whose purpose is to explicitly state that the attributes in their object values are
		// to be classified as such. Its only valid for their values to be objects
		else if (/^(props|style[s]?|optParams)$/.test(name)) {
			classifier = (name=='style') ? 'styles' : name;
			if (valueType != 'object')
				throw new BGError("This parameter name is meant to be a container for other named parameters of that type. The value must be an object", {name,value,classifier,valueType});
		}

		// aliases for css className
		else if (/(className|class|classes|classNames)/.test(name))
			classifier = 'className';

		// the names set in this.defaultCBName are aliases for 'defaultCB'
		else if (name == 'defaultCB' || (name in this.defaultCBName) ) {
			name = 'defaultCB';
			classifier = 'callback';
		}

		// 'children' is an alias 'content'.
		else if (name == 'children')
			classifier = 'content';

		// these are top level attributes of the described component
		else if (/(tagName|name|idName|Constructor|defaultConstructor|defaultChildConstructor|trace|root)/.test(name))
			classifier = 'top';

		// functions can only be a callback or a Constructor and Constructors have already been identified so they must be callbacks now
		else if (valueType == 'function')
			classifier = 'callback';

		// paramNames is the complete set of paramNames specified anywhere. We collect them in a separate first pass.
		else if (name in this.paramNames)
			classifier = 'optParam';

		else if (valueType == 'object')
			throw new BGError("It is not valid to pass an object as this parameter name ", {name, value, valueType});

		// we have a hardcoded big list of known style names at the top of this file
		// So far, its not common to specify styles so it hasn't been a problem that this list is not complete. Maybe we should
		// only support styles in the styles:{...} container objects.
		else if (name in knownStyleProperties)
			classifier = 'style';

		// default for unknown name/types is that they are element properties
		else
			classifier = 'prop';

		return [classifier, valueType];
	}


	// this function is used to process the contents of an options object for which the value has a name (unlike positional params)
	// We will classify the attribute based on its name and then reduced them differently based on their classification
	reduceAttribute(name, classifier, valueType, value)
	{
		// fill in classifier and valueType if they are not known yet
		[classifier, valueType] = this.classifyAttribute(name, classifier, valueType, value);

		switch (classifier) {
			// caller passed in something that could be a single BGComp or an array of contentSingle
			case 'content':
				if (valueType == 'array') {
					for (const aryContent of value)
						this.reduceAttribute(null, 'contentSingle', null, aryContent);
				} else {
					this.reduceAttribute(null, 'contentSingle', null, value);
				}
			return;

			// caller passed in something that must be a single BGComp. If its an array, use it as construction parameters to create
			// a BGComp
			case 'contentSingle':
				// TODO: we can either convert construction params (strings and arrays) into BGComp eagerly here, or just push the
				//       construction params and let the builder decide how to construct them. Will delaying construction change any
				//       semantics? Could other children expect to finds siblings as BGComp when they are constructed? (I think not)
				//       Maybe we need a new hoisted property to control whether construction is 'eager' or 'lazy'
				if (this.defaultChildConstructor && valueType == 'array')
					value.unshift({defaultConstructor:this.defaultChildConstructor})
				this.content.push(value);
				// if (valueType == 'array') {
				// 	this.content.push(ComponentConstruct(...value));
				// } else
				// 	this.content.push(value);
			return;

			// caller passed in a class name either from a tagIDClasses string that was decomposed or a named param
			case 'className':
				// classes are not first come first serve except that '!' prevents additional classes from base classes from being added.
				if ('className' in this.lockedParams)
					return;

				if (valueType == 'array')
					value = value.join(' ');
				if (/[!]/.test(value))
					this.lockedParams['className'] = true;
				this.className += " "+value.replace(/[!.]/g, ' ');
			return;

			// caller passed in a hoisted named parameter like 'paramNames' or 'defaultCBName'
			case 'noop':
			return;

			// caller passed in an unamed string or a named param named 'tagIDClasses'
			case 'tagIDClasses':
				var matched = reContentIDClasses.exec(value);
				if (!matched)
					throw Error("invalid tagIDClasses string syntax. '"+value+"'");
				if (matched) {
					// the group names in reContentIDClasses correspond to the real attribute names so matched.group can be reduced like
					// any options object
					for (const gName in matched.groups) if (matched.groups[gName])
						this.reduceAttribute(gName, reContentIDClassesClassifiers[gName], 'string', matched.groups[gName]);
				} else {
					console.error("tagIDClasses string did not match regex.", {tagIDClasses:value,regex:reContentIDClasses});
				}
			return;

			// caller passed in a named or unnamed function
			case 'callback':
				if (!name)
					name = 'defaultCB'
				if (!(name in this.callbacks))
					this.callbacks[name] = [];
				this.callbacks[name].push(value);
			return;

			// caller passed in a named param that was determined to be an optParam
			case 'optParam':
				this.setSingleValuedAttr(this.optParams, classifier,  name, value);
			return;

			// caller passed in a named param that was recognized as a top level param like 'name', 'idName', 'tagName'
			case 'top':
				this.setSingleValuedAttr(this, classifier,  name, value);
			return;

			// caller passed in
			case 'prop':
				this.setSingleValuedAttr(this.props, classifier,  name, value);
			return;

			// caller passed in
			case 'style':
				this.setSingleValuedAttr(this.styles, classifier,  name, value);
			return;

			// caller passed in
			case 'optParam':
				this.setSingleValuedAttr(this.optParams, classifier,  name, value);
			return;

			// caller passed in {props:{...}}, or {styles:{...}}, or {optParams:{...}}
			// the value is an object that contains name/value pairs of the named type
			case 'props':
			case 'styles':
			case 'optParams':
				if (valueType != 'object')
					throw new BGError(`A parameter to ComponentParams named '%s' must be an object containing name/value pairs of that type. A '%s' was passed in instead of an object. details=%O`,
					 					name, valueType, {ComponentParams:this, name, classifier, valueType, value});
				var singularClassifier = classifier.slice(0,-1);
				for (const key in value)
					this.setSingleValuedAttr(this[classifier], singularClassifier,  key, value[key]);
			return;
		}
	}

	// single valued attributes only take on the first value encounted. Subsequent value are overridden (aka ignored)
	// Note that we pass in obj so that when processing a container, we can id it once instead of for each attr in the container
	setSingleValuedAttr(obj, classification, name, value)
	{
		var classifiedName = (classification=='top')
								? name
								: (classification+'.'+name);
		if (!(classifiedName in this.lockedParams)) {
			this.lockedParams[classifiedName] = true;
			obj[name] = value;
		}
	}


	getClassNames() {
		var ret = this.name+' '+this.className;
		return ret.trim().replace(/\s+/g,' ');
	}


	// return a composite callback that invokes all the callbacks specified in the ComponentParams as the given type/name
	getCompositeCB(cbName='defaultCB', forceFlag=false)
	{
		if (cbName in this.defaultCBName)
			cbName = 'defaultCB';

		var cbList = this.callbacks[cbName] || [];

		if (cbList.length == 0)
			return (forceFlag) ? ()=>{} : null;
		else if (cbList.length == 1)
			return cbList[0];
		else
			return (...p)=>{
				const results = [];
				for (const fn of cbList) {
					const result = fn(...p);
					if (result!==undefined && result!==null)
						results.push(result);
				}
				if (results.length == 1)
					return results[0];
				if (results.length > 1)
					return results;
			}
	}
}

// OBSOLETE? this wrapNode mechanism was created for OnDemandComponet (used by ComponentGetParent(... 'ondemand')) but I removed that.
//           we are leaning into DOMNodes (aka HTMLElement) being valid BGComp(onents) and we dont need to wrap them.
// When this static property of ComponentParams is passed to the ComponentParams ctor, it indicates that it should not process the
// arguments pass and it should return as soon as possible because the caller is not going to use the parameters.
// A component hierarchy can use this to support wrapping around an existing DOMnode instead of creating a new one.
ComponentParams.wrapNode = Symbol('ignoreComponentParams')
