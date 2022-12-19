import {
	FireDOMTreeEvent,
	bgePreConnected,
	bgeConnected,
	bgePreDisconnected,
	bgeDisconnected
}  from './componentCore';

// TODO: consider document.createTreeWalker to fire events more efficiently

// The purpose of this class is to generate onConnected family of events for bgComponents when they are connected/disconnected
// to/from the document.documentElement tree. The DOM provides the isConnected attribute but not an event when it changes
//
// Implementation:
// This implementation patches the Node and Element prototypes to efficiently fire the onConnected and onDisconnected events
// I tried several other implementations that use the MutationObserver and none completely worked. This implementation has no
// known problems except that it is a little intrusive. For each of 4 Node methods and 7 Element methods
// TODO: from stepping through atom code it seems that connected events are fired for custom elements so maybe we could use that instead
//
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

	// TODO: what to do about disconnection from above. Often, the element that is added to the connected DOM is also the one that could be removed from it at a later time.
	//       but what it a higher node gets disconnected? Like we are a pane that gets added/removed from a paneContainer but then the paneContainer could be removed.
	//       I am still trying to avoid setting sConnectWatchTag all the way up to root but maybe that will have to happen

	// Node.prototype Methods
	// 'this' is the parent in these methods

	appendChild(child,...p) {
		if (!(sConnectWatchTag in child)) return this[s_appendChild](child,...p);
		const isConnecting = (!child.isConnected && this.isConnected);

		if (!this.isConnected) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		isConnecting && FireDOMTreeEvent(child, bgePreConnected);
		const result = this[s_appendChild](child,...p);
		isConnecting && FireDOMTreeEvent(child, bgeConnected);

		return result;
	}
	insertBefore(child, ref,...p) {
		if (!(sConnectWatchTag in child)) return this[s_insertBefore](child, ref,...p);
		const isConnecting = (!child.isConnected && this.isConnected);

		if (!this.isConnected) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		isConnecting && FireDOMTreeEvent(child, bgePreConnected);
		const result = this[s_insertBefore](child, ref,...p);
		isConnecting && FireDOMTreeEvent(child, bgeConnected);

		return result;
	}
	removeChild(child,...p) {
		// TODO: consider if we should not check for (sConnectWatchTag in child) because we dont know when some arbitrary point above us will be disconnected
		if (!this.isConnected || !(sConnectWatchTag in child)) return this[s_removeChild](child,...p);

		const fireDisconnecting = (child.isConnected && this.isConnected);

		FireDOMTreeEvent(child, bgePreDisconnected);
		const result = this[s_removeChild](child,...p);
		FireDOMTreeEvent(child, bgeDisconnected);

		return result;
	}
	replaceChild(newChild,oldChild,...p) {
		if ( !(sConnectWatchTag in oldChild) && !(sConnectWatchTag in newChild) ) return this[s_replaceChild](newChild,oldChild,...p);

		const fireDisconnecting = ( (sConnectWatchTag in oldChild) && oldChild.isConnected);
		const fireConnecting    = ( (sConnectWatchTag in newChild) && !newChild.isConnected );

		if ( !this.isConnected && !(fireConnecting) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		fireDisconnecting && FireDOMTreeEvent(oldChild, bgePreDisconnected);
		fireConnecting    && FireDOMTreeEvent(newChild, bgePreConnected);

		const result = this[s_replaceChild](newChild,oldChild,...p);

		fireDisconnecting && FireDOMTreeEvent(oldChild, bgeDisconnected);
		fireConnecting    && FireDOMTreeEvent(newChild, bgeConnected);
		return result;
	}

	// Element.prototype Methods from ParentNode interface
	// 'this' is the parent in these methods

	append(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_append](...children);

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}
	prepend(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_prepend](...children);

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}
	replaceChildren(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);
		const disconnectingChildren = [];
		for (const child of this.children) if ((sConnectWatchTag in child) && child.isConnected)
			disconnectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		for (const child of disconnectingChildren)
			FireDOMTreeEvent(child, bgePreDisconnected);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_replaceChildren](...children);

		for (const child of disconnectingChildren)
			FireDOMTreeEvent(child, bgeDisconnected);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}

	// Element.prototype Methods from ChildNode interface
	// 'this' is the child in these methods

	remove(...p) {
		if ( !this.isConnected || !(sConnectWatchTag in this) ) return this[s_remove](...p);

		FireDOMTreeEvent(this, bgePreDisconnected);

		const result = this[s_remove](...p);

		FireDOMTreeEvent(this, bgeDisconnected);
		return result;
	}
	replaceWith(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		FireDOMTreeEvent(this, bgePreDisconnected);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_replaceWith](...children);

		FireDOMTreeEvent(this, bgeDisconnected);
		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}
	after(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_after](...children);

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}
	before(...children) {
		const connectingChildren = [];
		for (const child of children) if ((sConnectWatchTag in child) && !child.isConnected)
			connectingChildren.push(child);

		if ( !this.isConnected && (connectingChildren.length>0) ) {
			// we must be in a disconnected tree so walk up to its root and set sConnectWatchTag so that when it does get connected
			// we will know to fire events for it
			let disconnectedRoot = this; while (disconnectedRoot.parentElement) disconnectedRoot=disconnectedRoot.parentElement;
			if (!(sConnectWatchTag in disconnectedRoot)) {
				disconnectedRoot[sConnectWatchTag] = true;
			}
		}

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgePreConnected);

		const result = this[s_before](...children);

		for (const child of connectingChildren)
			FireDOMTreeEvent(child, bgeConnected);
		return result;
	}
}

export const domTreeChanges = new DOMTreeConnectWatcher_nodePrototypePatchMethod();




// // The following two classes are alternate implementations that I tried. The DOMTreeConnectWatcher_childListMethod almost worked
// // but because it fires events at the end of the event loop, its possible for code to run and see the object inbetween being disconnected
// // and getting the onDisconnected event. The DOMTreeConnectWatcher_parentChangeMethod does not work because it uses the attribute
// // change mechanism and parentNode is not an HTML attribute (its only a property)
//
// // The purpose of this class is to generate onconnected and onDisconnected events for bgComponents when they are mounted/unmounted
// // to/from the document.documentElement tree.
// // This implementation uses the MutationObserver to watch all childList changes to the entire DOM tree and checks each added and
// // removed child against the set of nodes that are participating in onConnected and onDisconnected events.
// // There are two problems with this implementation.
// //    problem1: its not very efficient -- each added or removed node is checked against the list of participating nodes
// //    problem2: MutationObserver bundles changes and runs at the end of a tick. For example, Atom removes a WorkspaceItem view from
// //              the document DOM tree and then calls destroy on it. When destroy runs on our view component, its already been removed
// //              but the onDisconnect event will not have fired b/c it will fire at the end of the current tick.
// class DOMTreeConnectWatcher_childListMethod {
// 	mutationsToWatch = {childList:true, subtree:true};
// 	constructor() {
// 		this.watchNodes = new Set();
// 		this.watchDom = new MutationObserver((mutations)=>{this.onDOMMutation(mutations);});
// 		this.watchDom.observe(document.body, this.mutationsToWatch);
// 	}
//
// 	addToWatch(node)      {this.watchNodes.add(ComponentToEl(node));}
// 	removeFromWatch(node) {this.watchNodes.delete(ComponentToEl(node));}
//
// 	onDOMMutation(mutations) {
// 		for (const mutation of mutations) {
// 			this.trace && console.log('DOMTreeConnectWatcher_childListMethod'+mutation.type, mutation);
// 			for (const addedNode of mutation.addedNodes) {
// 				this.trace && console.log('   Adding', addedNode);
// 				if (this.watchNodes.has(addedNode) && addedNode.isConnected)
// 					FireDOMTreeEvent(addedNode, bgeConnected)
// 			}
// 			for (const removedNode of mutation.removedNodes) {
// 				this.trace && console.log('   Removing', removedNode);
// 				if (this.watchNodes.has(removedNode) && !removedNode.isConnected)
// 					FireDOMTreeEvent(removedNode, bgeDisconnected)
// 			}
// 		}
// 	}
// }
//
//
// // The purpose of this class is to generate onconnected and onDisconnected events for bgComponents when they are mounted/unmounted
// // to/from the document.documentElement tree.
// //
// // This implementation does not work because parentNode is a node property and not an 'attribute'
// // I did a test watching unfiltered attribute changes and none change when a node is added to another node (i.e. parentNode changes)
// class DOMTreeConnectWatcher_parentChangeMethod {
// 	mutationsToWatch = {attributes:true,attributeFilter:['parentNode'],attributeOldValue:true};
// 	constructor() {this.watchDom = new MutationObserver((mutations)=>{this.onDOMMutation(mutations);});}
// 	addToWatch(node) {this.watchDom.observe(node, this.mutationsToWatch);}
// 	removeFromWatch(node) {
// 		// there is no MutationObserver method to remove a node from being watched. Hopefully that is because it only tags the node
// 		// so that there is nothing to keep the node from being garbage collected.
// 	}
//
// 	onDOMMutation(mutations) {
// 		for (const mutation of mutations) {
// 			if (mutation.target.isConnected)
// 				FireDOMTreeEvent(mutation.target, bgeConnected)
// 			else
// 				FireDOMTreeEvent(mutation.target, bgeDisconnected)
// 		}
// 	}
// }
//
