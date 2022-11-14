import { Component } from './component'
const {shell} = require("electron");
import fs from 'fs';

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
	constructor(text, ...options) {
		super('$atom-text-editor',Object.assign(...options));
		this.textEditor = this.el.getComponent().props.model;

		this.textEditor.setText(text);

		var grammarJS = atom.grammars.grammarForScopeName('source.js');
		if (grammarJS)
			this.textEditor.setGrammar(grammarJS);
	}
}

export class Dragger extends Component {
	constructor(dragCB, ...options) {
		super('$div.dragger', ...options)
		this.dragCB = dragCB;
		this.el.onpointerdown = (e)=>this.onDragStart(e);
	}
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
		if (e.pointerId = this.capturedId) {
			const pos = {x:0,y:0};
			({x:pos.x, y:pos.y} = e);
			var delta = {
				x: pos.x - this.dragStart.x,
				y: pos.y - this.dragStart.y,
				toString: function() {return "("+this.x+","+this.y+")"}
			}
			if (this.dragCB)
				this.dragCB(delta, e, this);
		}
	}
	onDragEnd(e) {
		if (e.pointerId = this.capturedId) {
			this.el.onpointermove = null;
			this.el.onpointerup   = null;
			this.el.onpointercancel= null;
			this.el.releasePointerCapture(e.pointerId);
			this.capturedId - null;
		}
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
