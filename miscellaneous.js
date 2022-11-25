import { Component } from './component'
const { shell } = require("electron");
import { BGError } from './BGError';
import fs from 'fs';

// usage: <App> BGGetPlugin()
// This gets the controlling Plugin Application that the code is executing under. If the code is not running under a plugin it returns
// null. (? should it return the Application in this case?)
// This was inititially added for packages written for the Atom Editor.
// Plugins:
// A plugin is an extension that runs inside a larger application.
global.BGGetPlugin = function()
{
	// the idea is that a plugin will be loaded as a module. In Atom which as of this writing is a pre ES6 node environment (which
	// supports ES6 via esm package) there is always a chain of modules that we can walk up. The emsToCjsBridge.js of each package
	// adds the property 'atomPackageName' to the module so we can determine if we are running in a pkg and the name of the package.
	var mod = module;
	while (mod) {
		//console.log("%s mod=%s  %O", mod.isAtomPackage, mod.id.replace(/^.*Sandbox/,""), {plugin:mod.plugin, mod});
		if (mod.atomPackageName)
			return global.bg.BGAtomPlugin.get(mod.atomPackageName)
		mod = mod.parent;
	}
	// TODO: consider if we should return global.app here (if thats what we end up calling it)
	return null;
}


export function bgtraceCntr(cmd)
{
	if (typeof bgtraceOn == 'undefined')
		global.bgtraceOn = process.env.bgTracingOn || null

	if (cmd && cmd != 'isOn')
		global.bgtraceOn = cmd;

	if (bgtraceOn != global._bgtraceState) {
		global._bgtraceState = bgtraceOn;
		if (!global._bgtraceState || global._bgtraceState == 'off') {
			global._bgtraceState = bgtraceOn = null;
			global._bgtraceFile=null;
		}
		else if (/^(on|1|tty|file:tty|on:tty)$/.test(global._bgtraceState)) {
			global._bgtraceFile="/dev/tty"
		}
		else if (/^(stderr|2|file:stderr|on:stderr)$/.test(global._bgtraceState)) {
			global._bgtraceFile="/dev/stderr"
		}
		else if (/^(stdout|file:stdout|on:stdout)$/.test(global._bgtraceState)) {
			global._bgtraceFile="/dev/stdout"
		}
		else if (/^(on:win.*|win.*)$/.test(global._bgtraceState)) {
			var win=global._bgtraceState.replace(/^on:/,"");
			if ( win == "win" ) win="out";
			global._bgtraceFile="/tmp/bgtrace."+win
		}
		else {
			global._bgtraceFile=global._bgtraceState.replace(/^(on:|file:)/,"");
			if (!_bgtraceFile)
				global._bgtraceFile = '/tmp/bgtrace.out'
		}
	}
	return (_bgtraceFile)
}

export function bgtraceIsActive()
{
	return bgtraceCntr('isOn')
}

export function bgtrace(msg)
{
	if (typeof _bgtraceFile == 'null')
		return;
	else if (typeof _bgtraceFile == 'undefined')
		if (!bgtraceIsActive())
			return

	msg = msg.replace(/\\n/g,"\n")
	msg = msg.replace(/\\t/g,"\t")
	if (! /\n$/.test(msg))
		msg += "\n"
	fs.appendFileSync('/tmp/bgtrace.out', msg)
}
global.bgtrace = bgtrace;

// export function bgconsole(label, ...p)
// {
// 	console.groupCollapsed(label,...p);
// 	//console.log(...p);
// 	console.trace(); // hidden in collapsed group
// 	console.groupEnd();
// }
global.console.bgtrace = function(label, ...p) {
	this.groupCollapsed(label,...p);
	//this.log(...p);
	this.trace(); // hidden in collapsed group
	this.groupEnd();
}

export function OpenInNewBrowser(url) {
	shell.openExternal(url);
}

export class TextEditor extends Component {
	constructor(text, ...p) {
		super('$atom-text-editor', ...p, {paramNames:"onTypingDone scopeName"});
		this.textEditor = this.el.getModel();

		this.textEditor.setText(text);

		if (this.optParams.onTypingDone)
			this.textEditor.onDidStopChanging(this.optParams.onTypingDone);

		if (this.optParams.scopeName) {
			var grammarJS = atom.grammars.grammarForScopeName(this.optParams.scopeName);
			if (grammarJS)
				this.textEditor.setGrammar(grammarJS);
		}

		// return a proxy to this instance that passes everything not found in this class on to this.textEditor
		return new Proxy(this, {
			get(target, propName) {
				if (propName in target)
					return target[propName];
				else if (target.textEditor)
					return target.textEditor[propName];
				else if (propName == 'getText')
					return ()=>{return ''};
				else
					return undefined;
			},
			set(target, propName, value) {
				if (propName in target)
					target[propName] = value;
				else if (target.textEditor)
					target.textEditor[propName] = value;
				else
					target[propName] = value;
				return true;
			}
		})
	}

	// TODO: I think we can just add a get(ter) that returns the prop from this.textEditor

	// getText()
	// {
	// 	return this.textEditor.getText();
	// }
}

// This essence of this class is the mechanism to capture the mouse/pointer on pointer down and releasing it on pointer up.
// While its captured the onDrag(event) method and callback gets invoked. The dragger DOM element can be styled to any shape and
// in the onDrag event you can move the element or not.
export class Dragger extends Component
{
	constructor(...p) {
		super('$div.dragger', {defaultCBName:'onDragCB'}, ...p)
		this.dragCB = this.componentParams.getCompositeCB('onDragCB');
		this.el.onpointerdown = (e)=>this.onDragStart(e);
	}

	onDrag(event) {}

	// starting the drag will capture the mouse. Typically this is called by onpointerdown registered in our ctor.
	// this will install callbacks for onpointermove and onpointerup. onpointerup will end the capture by calling our onDragEnd.
	onDragStart(e) {
		this.el.setPointerCapture(e.pointerId);
		this.capturedId = e.pointerId;
		this.dragStart = {x:0,y:0};
		({x:this.dragStart.x, y:this.dragStart.y} = e);
		this.el.onpointermove  = (e)=>this.onDragMove(e);
		this.el.onpointerup    = (e)=>this.onDragEnd(e);
		this.el.onpointercancel= (e)=>this.onDragEnd(e);
	}
	onDragMove(e) {
		if (e.pointerId == this.capturedId) {
			const pos = {x:0,y:0};
			({x:pos.x, y:pos.y} = e);
			var delta = {
				x: pos.x - this.dragStart.x,
				y: pos.y - this.dragStart.y,
				toString: function() {return "("+this.x+","+this.y+")"}
			}
			if (this.dragCB)
				this.dragCB(delta, e, this);
			this.onDrag(e);
		}
	}
	onDragEnd(e) {
		if (e.pointerId == this.capturedId) {
			this.el.onpointermove = null;
			this.el.onpointerup   = null;
			this.el.onpointercancel= null;
			this.el.releasePointerCapture(e.pointerId);
			this.capturedId - null;
		}
	}
}

export class GridDragger extends Dragger
{
	constructor(...p) {
		super('$div.dragger', {defaultCBName:'onDragCB'}, ...p)
		this.dragCB = this.componentParams.getCompositeCB('onDragCB');
		this.el.onpointerdown = (e)=>this.onDragStart(e);
	}

	onMounted() {
		console.log("!!! drag onMounted");
	}


	onConnected()
	{
		this.gridContainer = this.parent;
		var tAreas;
		while ( this.gridContainer && (tAreas = getComputedStyle(Component.toEl(this.gridContainer)).gridTemplateAreas).length == 0)
			this.gridContainer = Component.getParent(this.gridContainer);
		if (!this.gridContainer)
			throw new BGError("GridDragger could not find a parent that has a grid layout")

		this.gridContainer = Component.toEl(this.gridContainer);

		// this puts each grid row in a separate array row and removes all the quotes
		// then the loop converts each row to an array of columns
		tAreas = tAreas.split(/"\s+"/).map( (s)=>s.replace(/"/g,'') );
		for (const i in tAreas)
			tAreas[i] = tAreas[i].split(/\s+/);

		this.setOrientation(tAreas);
	}

	// Params:
	//    tAreas : a two dimensional array of the gridTemplateArea. Each element is a a row which is an array of columns
	setOrientation(tAreas)
	{
		this.tAreas = tAreas;

		// determine if dragger is a vertical column divider or a horizontal row divider
		this.isColDivider = null;
		// if its only one col wide it cant be col diver or if 'dragger' spans multiple columns it must be a row divider
		if (this.tAreas[0].length==1 || this.tAreas.some( (r)=>r.filter( (c)=>c=='dragger').length>1 ) )
			this.isColDivider = false;

		// if its only one row high it cant be row diver or if 'dragger' spans multiple rows it must be a col divider
		else if (this.tAreas.length == 1 || this.tAreas.filter( (r)=>r.filter( (c)=>c=='dragger').length>0 ).length > 1)
			this.isColDivider = true;

		// now we know there is a single drgger cell. if at least one row has the same value in all columns it looks like a colDivider
		else if (this.tAreas.some( (row,i)=>{return row.every((rowCell)=>row[0]==rowCell ) } ) ) {
			this.isColDivider = true;
		}

		// now check for at least one column that has the same value in each row
		else if (this.tAreas[0].some( (firstColCell,j)=>{return this.tAreas.every( (row)=>firstColCell==row[j]) } ) ) {
			this.isColDivider = false;
		}

		if (this.isColDivider === null)
			throw new BGError("// TODO: the logic to determine if the dragger is horizontal or vertical can not determine the orientation for this grid template", {
				templateArea     : this.tAreas,
				rowDimensions    : getComputedStyle(this.gridContainer).gridTemplateRows,
				columnDimensions : getComputedStyle(this.gridContainer).gridTemplateColumns,
			});

		if (this.isColDivider) {
			this.splitTemplate = this.tAreas.find(r=>r.find(c=>(c=='dragger') ) );
			var splitNow = getComputedStyle(this.gridContainer).gridTemplateColumns.split(/\s+/);
		} else {
			var ttAreas = this.tAreas[0].map((_, i)=>this.tAreas.map( row=>row[i]) )
			this.splitTemplate = ttAreas.find(r=>r.find(c=>(c=='dragger') ) );
			var splitNow = getComputedStyle(this.gridContainer).gridTemplateRows.split(/\s+/);
		}

		this.splitIndx = this.splitTemplate.findIndex(name=>name=='dragger');

		// if we get called before the gridContainer is displayed, splitNow will have the symbolic text like 'min-content' and '1fr'
		// after its displayed it will have the actual calculated px values. This block finds the closest cell before splitIndx
		// that either has fr units or px greater than 45
		this.splitBeforeIndx = this.splitIndx-1;
		while (this.splitBeforeIndx>=0
				&& !/fr$/.test(splitNow[this.splitBeforeIndx])
				&& (!/px$/.test(splitNow[this.splitBeforeIndx]) || parseFloat(splitNow[this.splitBeforeIndx])<45)
			)
			this.splitBeforeIndx--;
		if (this.splitBeforeIndx<0)
			this.splitBeforeIndx = this.splitIndx-1;

		this.splitAfterIndx = this.splitIndx+1;
		while (this.splitAfterIndx<splitNow.length
				&& !/fr$/.test(splitNow[this.splitBeforeIndx])
				&& (!/px$/.test(splitNow[this.splitBeforeIndx]) || parseFloat(splitNow[this.splitAfterIndx])<45)
			)
			this.splitAfterIndx++;
		if (this.splitAfterIndx>=splitNow.length)
			this.splitAfterIndx = this.splitIndx+1;

		//console.log("!!! splitTemplate=",{splitNow, splitTemplate:this.splitTemplate,splitIndx:this.splitIndx, splitBeforeIndx:this.splitBeforeIndx, splitAfterIndx:this.splitAfterIndx});
	}

	onDrag(event)
	{
		var cStyles = getComputedStyle(this.parent.el);
		var splitNow = ((this.isColDivider) ? cStyles.gridTemplateColumns : cStyles.gridTemplateRows).split(/\s+/);
		var offset   =  (this.isColDivider) ? event.offsetX               : event.offsetY;
		splitNow[this.splitBeforeIndx] = (parseFloat(splitNow[this.splitBeforeIndx]) + offset) + 'px';
		splitNow[this.splitAfterIndx]  = (parseFloat(splitNow[this.splitAfterIndx])  - offset) + 'px';
		if (this.isColDivider)
			this.gridContainer.style.gridTemplateColumns = splitNow.join(' ');
		else
			this.gridContainer.style.gridTemplateRows = splitNow.join(' ');
		//console.log("!!! splitNow="+splitNow+"    "+(parseFloat(splitNow[this.splitAfterIndx])+parseFloat(splitNow[this.splitBeforeIndx]) ) );
	}
}


// usage: new BackgroundMessage(<msg> [,"centered"])
// fills the parent with the msg text in a larger, faded font. Typically used to indicate when there is no data to display in the
// area. If the second parameter is "centered", the msg text will be centered. Otherwise it is left justistified
export class BackgroundMessage extends Component {
	constructor(msg, justification, ...p)
	{
		// root:true is an opt out mechanism for ComponentMount pulling up this comp's named mounts (msg) to this comp's parent if this comp is unnamed. this mechanism may change
		super("$ul.background-message"+((/^center/.test(justification))?".centered":""), {root:true}, ...p);
		this.mount([new Component("msg:$li "+msg)]);
	}
}

// usage: debounce([timerID,] timeout, func, [,args...])
//        debounce(func, timeout) // can be called the same as setTimeout -- returns a function that can be called multiple times.
//        debounce(timeout, func) // can be called with the timeout and func reversed (I think this reads better)
//        debounce(timerID, timeout, func, ...args) // this form can be called multiple times (instead of returning a func that
//                                                  // can be called multiple times)
// This debounce function works in two modes. If <timerID> is not specified it returns a new closure function that should be saved
// and when that function is invoked, <func> will only be invoked once there is a <timeout> period that since the last time it was
// called. Typically you use this mode when you are installing a callback that something else will invoke. The API that invokes the
// callback may provide argumnets and only the last set of arguments will be passed to <func>
// Example...
//    this.gdbBashFile.onDidChange(debounce('gdbBashFile', 300, ()=>{
//    	this.sendCmd("source "+this.gdbBashFile.getPath())
//    }));
//
// If <timerId> is specified then it does not return a new function. It will invoke <func> after <timeout> has passed since the last
// time debounce was called with that timer ID. Typically you use this mode when you want to debounce a javascript function or class
// method.
// Example...
//    onDepChanged() {
//        debounce(this, 300, ()=>{
//            dep.fire({obj:this,channel:"all"})
//        })
//    }
// Note that in this example, 'this' is passed as the <timerID>. This makes it so that each instance of the class containing this
// method will be debounced separately.
//
// Notice that in this case we could have used the first mode and assigned this.onDepChanged = debounce(...). I prefer the second
// form in this case for two reasons. First, it allows all methods to be defined using the ES6 style of class methods.
// Second, it opens the possibility that we can aggregate the parameters that will be used when <func> is eventually called.
//
// Example...
//    // usage: onDepChanged(arrayOfStrings)
//    onDepChanged(types) {
//        debounce(this, 300, (types,allArgs)=>{
//           types = new Set()
//           for (var i in allArgs) for (var j in allArgs[i])
//                types.add(allArgs[i][j])
//            dep.fire({obj:this,channel:types})
//        },types)
//    }
//
// when <func> eventually gets called, the most recent set of args will be spread first into its argument list followed by a single
// array which contains the args from each call that is being bundled (aka debounced) into the invocation.
// Since the most recent args are spread first, if <func> only wants the most recent it does not have to do anything else.
// However, it has the option to recieve all the args and process them in any way it sees fit. That last argument is an array
// where each element represents a different call in the order they were invoked. Each element is an array of args pass to that
// call.

//
// Params:
//    <timeout> : the amount of time in milliseconds to wait before calling func()
//    <func>    : a callable (aka function) that will be invoked
//    <timerID> : if provided, this identifies the timer that will be used. This allows multiple calls tp debounce to work together.
//                if not provided, this function returns a new function and only calls to that exact function will participate in
//                the debouncing.
//    <args>    : the list of arguments that will be passed to the function.
export function debounce(...p) {
	var p0Type = typeof p[0];
	var p1Type = typeof p[1];

	// debounce(timeout,func) or
	// debounce(func, timeout)
	if (/numberfunction|functionnumber/.test(p0Type+""+p1Type) ) {
		let timeout = (p0Type=='number')   ? p[0] : p[1];
		let func     = (p0Type=='function') ? p[0] : p[1];
		let timerObj
		return (...args)=>{
			clearTimeout(timerObj);
			timerObj = setTimeout(()=>{func.apply(this, args)}, timeout);
		}
	}

	// debounce(timerID, timeout, func, ...args)
	var timerID = p[0];
	var timeout = p[1];
	var func = p[2];
	var args = p.slice(3);

	var debounceState = debounceTimers.get(timerID);
	if (!debounceState) {
		//console.error("debounce - creating state");
		debounceTimers.set(timerID, debounceState = {args:[]} );
	} else {
		clearTimeout(debounceState.timer)
	}
	// when <func> gets called, the most recent set of args will be spread first into its argument list followed by a single array
	// which contains the args from each call that is being bundled (aka debounced) into the invocation.
	// Since the most recent args are spread first, if <func> only wants the most recent it does not have to do anything else.
	// However, it has the option to recieve all the args and process them in any way it sees fit. That last argument is an array
	// where each element represents a different call in the order they were invoked. Each element is an array of args pass to that
	// call.
	//console.error("debounce - adding args", {args, prevArgs:debounceState.args});
	debounceState.args.push(args)

	debounceState.timer = setTimeout( ()=>{
		if (debounceTimers.delete(timerID)) {
			func(...debounceState.args[debounceState.args.length-1], debounceState.args);
		}
	}, timeout);
}

var debounceTimers = new Map();
