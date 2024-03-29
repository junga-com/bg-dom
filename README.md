# bg-dom

# 2020-12 Status

This package is becoming stable. It is used by several Atom plugins. I have used it to create a stand alone electron app to analyze my heath insurance plan options and will soon create a web app using it on my nginx based app server.   

# 2020-09 Status

This package was just renamed from bg-atom-redom-ui to bg-dom.  It started as UI code specific to using REDOM in the Atom editor environment but then evolved into something similar and compatible to REDOM but independent and of general use, not just for use in Atom.

Since this npm is not dependent on any of my other libraries, I am treating it as the root JS library of my projects. This means that I am putting in some non UI stuff.  I will periodically examine whats in it and decide if some part of it should be broken out into another npm so that it and the DOM components could be used independently in other projects.

# Summary

This is an NPM package that provides a Components library for building user interfaces.  It was originally based on top of the REDOM project but has now grown apart from it.

These are the principles on which this library is based.
  * provide an additional layer of separation between structure and presentation to handle cases where the HTML vs CSS separation falls short.
  * use the native DOM where ever possible. Dont wrap things that work fine the way they are.
  * extend DOM Nodes as transparently as possible. We would rather just make the DOM nodes work as we want them to but we resit the urge to modify prototypes directly.
  * be linearly independent, meaning that using this technical for DOM composition should not preclude working with the DOM in any other independent way.

Features:
  * named children. Instead of querying for references, we can construct a logical subset of the DOM tree that has explicit named navigation.
  * Convenient, efficient expression of the DOM structure through Component class construction.
  * Plain vanilla JS still works fine. this library provides various ways of efficiently producing features but does not require that they be used over other techniques 



# Expression of DOM Structure.

Example...
```
    const myView = new Component("$div.myView", [
        "This is a view for something...",
        new Component("$div.header", {tabindex:-1}, [
            "<h1>My Heading</h1>".
        ]),
        new Component("$div.content", {tabindex:-1}, [
            new Component("cntr1:$input", {type:"text"}),
            new Component("cntr2:$input", {type:"checkbox"})
        ])
    ]);
    console.log(myView.cntr1.value);
    myView.cntr1.value = "something..."
```

Any web page needs to define the DOM structure that represents the content. HTML is a language to express that structure and it works well for some things. The javascript DOM API also allows creating the DOM structure programmatically but in a tedious, verbose way. This library aims to provide a way to define the DOM structure that retains the best from each of those methods while adding the ability to compose and reuse.

The principle idea is to use JS variable types to flexibly define information about a BGNode in a way that can be composed. To compose a BGNode, you can provide a list of JS variables of arbitrary length (typically as the construction parameters to the Component class). The type of the variable (string, object, or array) determines how it is interpreted and the position in the list determines how conflicting data is resolved.

An object is interpreted as named properties of the component nodes. The data in an object can be explicitly stated as styles, attributes or properties by putting them in sub-objects with those names or they can be placed at the top level and the type of data that it is will be gleaned by the name of the data. Note that it is difficult to precisely describe this because in DOM coding there is an important distinction between 'properties' and 'attributes' even though they are both generic names for the 'data' that make up objects.

An array is interpreted as a list of child content. Each element can be a string which will be converted to a text node or parsed as html depending on whether it starts with a html <tag>, or a BGNode JS Object or a DOM Node JS Object.

A string value is treated as a tagIDClasses string. This is a syntax that allows common properties to be expressed succinctly.
   `[<name>:][$<tagname>][#<id>][.<classname>...<classname>][ <textOrHTMLContent>]`
This syntax is designed so that no part is required but if a part is supplied, it must be in the correct order relative to the other parts that are included. The type of each part is determined by a single character. For <name>: the character trails the token but all the other parts have their delimiting character leading the token.

In general, when the same node data (aka property, attribute, style, etc..) is specified more than once in the variable list, the first value encountered will be used for single valued data. Multi-valued data will be a concatenated list of all encountered values. Any particular data may have a unique algorithm to reduce multiple occurrences to its composed value.

Any DOM structure can be expressed using only the generic Component class but it would be tedious to repeat all the attributes and child structure over and over again for common component types. Since the variable list can be composed, we can make a class derived from Component that adds the data specific to a specific convention that we want to support. Think of those classes as a way to save a set of data so that it can be more succinctly expressed. An InputField class is a shortcut for using Component to build up a label element node with various attributes and properties set with a child input element node.

# Named Children

This library introduces the notion of a 'name' property that is similar to an element ID but instead of being unique in the entire page, the name is unique only in its sub tree.

When composing a DOM tree with the Component construction syntax, the name is the first optional field in the tagIDClasses string syntax. When specified, it 1) becomes one of the class names of the element node and 2) creates a named property in its closest named BGNode parent to the node.

In the example in the last section, we are able to set the fist text input element with `myView.cntr1.value = "somthing..."` even though in the DOM tree, the input element is not a direct child of myView.

You name just the components that will be used in scripting so that they can be referenced in code consistently even if the DOM structure needs to change a little to achieve the desired presentation.

In CSS, the name is exposed as a class. Instead of it standing alone as the ID does, the name depends on where it is in the hierarchy so that components can be selected by name by using the descendant operator like `.myView .cntr1`.



# Old Summary...

This is an NPM package that provides a Components library that is compliant with the Atom style guide and built on top of something that was originally inspired by the REDOM library. I am now calling the components BGComponents which are typically implemented as JS classes inherited from bg-dom::Component but they do not have to be. Any REDOM style component or plain DOM object can participate in the patterns anywhere that a BGComponent is expected.

The beauty of REDOM is that it is lightweight and requires very little from a JS object to be able to treat it like a REDOM component. The main requirement is that it has an 'el' property that references its DOM object. This library continues that but also provides enhanced ways to create components by composing knowledge implemented in different places at different points in the software lifecycle.  You can see that in action in the component hierarchy included in this library.

Note how Button is the root of an hierarchy of button types and Button does not extend Component. Both Button and Component use the same algorithm to process its constructor parameters. Button defines certain behavior that is controlled through optional parameters passed to its constructor. The classes that extend button, receives parameters from the thing constructing it, optionally adds to and overrides those parameters to create the arguments passed to the super constructor of the class that it extends.  Because a lot of behavior is controlled by the data passed through this chain of constructors, the code that creates an instanace of one of the Button classes get to define much of the behavior by composing the construction arguments.

To facilitate this flow of construction data that can add and override the data at lower levels, a standardized parameter syntax is adopted. In a nutshell, earlier parameters in the argument list take priority over (aka overrides) later ones with the same 'key'. Each parameter can be an object containing any keys named for any of the attributes supported by the BGComponent being created or a string that complies with a syntax that allows specifying a handful of the important attributes. The children attribute includes the definition of the starting subtree below the BGComponent being constructed.

Any class constructor in the hierarchy may define position significant parameters at the start of its constructor parameters but must support a variable number of those standard parameters after the positional arguments.


This is a work in progress. The idea is to explore programming in JS/DOM in more of a programming style than markup but still have good css separation.



# Miscellaneous Functions and Classes
* function FirstParamOf   : helper for overloaded function parameters
* function ArrangeParamsByType   : helper for overloaded function parameters
* class PolyfillObjectMixin : supports the a pattern of extending JS code at runtime in a controlled way. Written for Atom environment but could be used for other environments.
* DependentsGraph : supports a pattern for reactive programming. Its an alternative to the emitter pattern and extreme functional programming pattern with deep nested function definitions.
* Disposables : an alternative to Atom Disposable and CompositeDisposable classes. One class to rule them all. Also supports destroy as an synonym to dispose, and accepts functions directly instead of an object with a dispose method and has a static method that iterates members of an object to call their disposed/destroyed method if present
* class BGPromise : This is an alternative to Promise which supports a different pattern for creation. It can be constructed with no arguments and then its reject or resolve methods can be invoked explicitly. This allows a method/function to be written that supports both callback and promise patterns of use depending on how the caller wants to use it. When used with async/await, you can think of BGPromise a bit like a semaphore in traditional IPC patterns.

# BGComponents...

A BGComponent is a JS-centric way of building and changing the DOM structure that focuses on initial construction and manipulation actions rather than the typical render pattern.

Components are recursive and composable.

There are two independent hierarchies that work together to produce the final DOM -- the Component **Type/Class** hierarchy and the Component **Object/instance** hierarchy. Every OO system has these two natures.  The Type/Class hierarchy uses extends relations between classes to define the hierarchy and the Object/instance uses member variable relations to define the hierarchy.

## Component Object Hierarchy

The Object Hierarchy is the DOM hierarchy. Each instance of a Component you create is mounted (aka inserted) into the DOM at a particular point and introduces a sub tree of the Object Hierarchy below it. The constructor of each component builds its sub tree content.

An important point to keep in mind is that you can build any Object Hierarchy you can imagine using only the Component base class. The Component constructor allows specifying the attributes and sub tree content in a a flexible way.

For each Component you create, you can define define these qualities.
* tagName : the type of HTML node -- div, span, button, <custom>, etc...
* id : optional. Not often used because its absolute on the page as opposed to relative to where it is so you can only use an id on singleton components that can not be created more than once in a page
* class : list of tags that classify the node.
* DOMProperties : any supported properties of the tagName
* StyleAttributes : any style
* content : the sub tree below this Component. Can be text string, html string, DOMNode, Component, object to construct a Component, or an array of any of those things.

As always with DOM programming, there is a dualism between the DOM nodes and the JS objects that are associated with them. The BGComponent instance Object hierarchy reflects the DOM node hierarchy but not completely. There will be subtree sections that are represented with known BGComponents that are linked via member variables so that JS code can navigate from one BGComponent to its children BGComponents but it typically wont be complete nor should it be.   

## Component Type Hierarchy

Even though the base Component class is sufficient to create any Object Hierarchy, it would be verbose and require a lot of repeated data declarations.  The Component Type Hierarchy allows us to eliminate those repeated declarations and make the syntax more compact and efficient.

The Component Type Hierarchy is a set of classes that extend from Component or another class that extends Component. A specific component class can have multiple classes in its super class chain before it gets back to Component (or a class that implements the same required features as Component).

Think of a class that extends Component as a template that specifies some of the qualities for the Component instance being created. For example, instead of having to specify that tagName="button" when constructing a Component, you can create a Button which extends Component so that is done for you.

The task of writing a specific type of component that extends Component is first of all, about specifying the new default qualities that the create DOM node should have. Component has reasonable default values that results in a very plain, generic, empty &lt;div&gt; element node but a more specific component Class changes those defaults so that it results in a different element being created with different properties by default and with a particular sub tree of content underneath it.

 A particular component class might have a deep hierarchy where each class in the hierarchy further refines or overrides the default qualities specified in the classes before it in the hierarchy.  The last conceptual 'class' in the hierarchy is the code that creates the component instance because that constructor can further refine or override the qualities of the component being created.

 The key to doing this efficiently is a pattern for writing the constructor functions of component classes so that they can easily accept information about the qualities from the class or new statement calling it, combine that in a sensible way with the information about the qualities that that class adds and then call its super() class constructor with the combined information.

## Component Behavior

We just finished discussing how one major feature of component hierarchy classes is to add knowledge about the default qualities of the component being constructed at each stage of the class hierarchy and combining them into one description of the node to be created. There is a second major feature also.

Dynamic features of a page come from JS code that executes in response to events. Those function often changes the structure or qualities of the existing DOM Object Hierarchy.

Similar to how you could create any DOM structure with just the base Component class, you could write all the JS functions in your top level application file and attachment them where needed by specifying them as properties of various DOM nodes. The Component Type Hierarchy gives us a way to organize those functions so that they are reusable and modular.

Typically a specific component class will define functions for each behavior and attach them where appropriate to DOM nodes in the content sub tree it creates and manages.



# Example...

	export class BGFontSizeControlView  {
	constructor() {
		this.panel = new Panel({
		  class: "bg-ui-font-sizer-dialog",
		  children: [
			[new Component('div.panel-heading', {children: el("h1","Keyboard Mode to Adjust Pane Tab Sizes - 'Escape' when done", {tabindex:1})})],
			["leftSide", new Component('div.inset-panel', {
			  children: [
					["left",   new OneShotButton("<p>Left Dock</p>"   ,(dockSelection)=>this.setSelectedTabLocation(dockSelection))],
					["center", new OneShotButton(
						'<div>Workspace Center</div>'+
						'<div><kbd class="key-binding">tab</kbd><span>next Dock</span></div>'+
						'<div><kbd class="key-binding">shift-tab</kbd><span>previous Dock</span></div>'
					 	,(dockSelection)=>this.setSelectedTabLocation(dockSelection))],
					["right",  new OneShotButton("<p>Right Dock</p>"  ,(dockSelection)=>this.setSelectedTabLocation(dockSelection))],
					["bottom", new OneShotButton("Bottom Dock" ,(dockSelection)=>this.setSelectedTabLocation(dockSelection))]
			  ]
			})],
			["rightSide", new Component('div.inset-panel', {
  			  children: [
					["escape",      new Button('<kbd class="key-binding">escape   </kbd><span>close this window</span>',     ()=>DispatchCommand('bg-tabs:toggle-size-dialog'))],
					["reset",       new Button('<kbd class="key-binding">Ctrl-0   </kbd><span>reset to default size</span>', ()=>DispatchCommand('bg-tabs:reset-font-size'))],
  					["fontBigger",  new Button('<kbd class="key-binding">Ctrl-+   </kbd><span>Bigger Font</span>',           ()=>DispatchCommand('bg-tabs:increase-font-size'))],
  					["fontSmaller", new Button('<kbd class="key-binding">Ctrl--   </kbd><span>Smaller Font</span>',          ()=>DispatchCommand('bg-tabs:decrease-font-size'))],
					["lineShorter", new Button('<kbd class="key-binding">Ctrl-up  </kbd><span>Shorter Line</span>',          ()=>DispatchCommand('bg-tabs:decrease-line-height'))],
  					["lineTaller",  new Button('<kbd class="key-binding">Ctrl-down</kbd><span>Taller Line</span>',           ()=>DispatchCommand('bg-tabs:increase-line-height'))]
  			  ]
			})]
		  ]
		});
		this.modalPanel = atom.workspace.addModalPanel({item: this.panel.el, visible: false, autoFocus:true});
		this.modalPanel.getElement().classList.add("bg-ui-font-sizer-dialog");

		this.setSelectedTabLocation("center");
	}



## Atom UI Hacking Resources

Style Guide  package. ctrl-shift-G

#### Available Less Variables
atom/static/variables/ui-variables.less

These are particularly important for colors. Instead of making up your own color, fond a variable. When the user changes theme,
the new theme will set these to a new value and your UI should respect that.  

#### Available CSS Classes
The style guide demonstrates some common class names but there is no list of available styles.

In the atom project the core required styles seem to be in atom/static/atom-ui/_index.less  (not sure what ./static/core-ui/_index.less is)  

atom.styles -- global StyleManager object has an array containing each loaded stylesheet.

TODO: add a Atom command that gleans all the available class names from atom.styles, tagging the ones from the built-in atom-ui.less
as prefered and provides auto-complete (see css-spy package)
