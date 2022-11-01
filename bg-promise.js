// This is a Promise compatible class that allows an async function to support both Promise and callback patterns. I find functions
// written to the standard java Promise class to be hard to follow because the algorithms needs to be written inside the Promise
// constructor. This BGPromise class allows a bit more declarative coding style while being backward compatible with the standard
// Promise pattern.
//
// The difference between this and Promise is that it has a default constructor and resolve() and reject() methods that can be
// called explicitly. This means that the promise object can be created in one step and resolved in a different step (maybe in a
// different function)
//
// This enables two new use cases which Promise does not supoprt.
//    1) It can be used like an IPC semaphore-like semantics with the await statement.
//    2) It also makes it easy to write RPC style mechanisms where the the callback/promise object is created on send and stored in
//       a queue and then incoming msgs are matched up and the callback/promise is called (aka resolved or rejected)
//
// Writing Aync Functions:
// An asyn should should create a new BGPromise and return it. Before returning it should setup so that that promise's resolve or
// reject methods will eventually be called when the async operation ends (which is typically after the function returns the promise)
// A low level async operation would typically allow a callback to be passed in.
// For Example...
//     // given this 3rd party aync API....
//     // createAudioFile(settings, callback);
//
//     // imagine an AudioDeck class that will use the createAudioFile API
//     // note that the new function accepts an optional callback. The caller can either pass in a callback as a parameter or use
//     // the createAFile(settings).then(callback)
//     class AudioDeck {
//        // here is the function that wraps the createAudioFile API using the BGPromise pattern
//        function createAFile(settings,callback) {
//            var p = new BGPromise().then(callback,callback); // BGPromise::then is a noop if callback is undefined
//            createAudioFile(settings, (err)=>{
//               if (!err)
//                   p.resolve()
//               else
//                   p.reject(err)
//            });
//        }
//
//        // here is the function that wraps the createAudioFile API using the Standard Promise pattern
//        function createAFile2(settings) {
//            return new Promise( (resolve,reject)=> {
//               createAudioFile(settings, (err)=>{
//                  if (!err)
//                      resolve()
//                  else
//                      reject(err)
//            });
//        }
//
export class BGPromise {
	constructor() {
		this.state = BGPromise.pending;
		this.onResolvedCBList = [];
		this.onRejectedCBList  = [];
		this.firedResolveCBList = [];
		this.firedRejectedCBList =[];
		this.seenResolveCBs = new Set();
		this.seenRejectCBs = new Set();
		this.p = null;
	}

	resolve(...p) {
		this.state = BGPromise.resolved;
		this.p = p;
		return this._checkForFire();
	}

	reject(...p) {
		this.state = BGPromise.rejected;
		this.p = p;
		if (this.onRejectedCBList.length == 0)
		 	throw new Error(p);
		return this._checkForFire();
	}

	then(onResolvedCB, onRejectedCB) {
		if (typeof onResolvedCB == 'BGPromise') {
			var prom = onResolvedCB;
			prom.onResolvedCBList.map((cb)=>{this._addCallbacks(cb,null)})
			prom.onRejectedCBList.map((cb)=>{this._addCallbacks(null,cb)})
		} else if (onResolvedCB || onRejectedCB) {
			this._addCallbacks(onResolvedCB, onRejectedCB)
		}
		return this._checkForFire();
	}

	catch(onRejectedCB) {
		if (typeof onRejectedCB == 'BGPromise') {
			var prom = onRejectedCB;
			prom.onRejectedCBList.map((cb)=>{this._addCallbacks(cb,null)})
			prom.onRejectedCBList.map((cb)=>{this._addCallbacks(null,cb)})
		} else if (onRejectedCB) {
			this._addCallbacks(null, onRejectedCB)
		}
		return this._checkForFire();
	}

	finally(onFinishedOneWayOrAnother) {
		this._addCallbacks(onFinishedOneWayOrAnother, onFinishedOneWayOrAnother)
		return this._checkForFire();
	}

	// The concept of resetting is new to this type of promise. This base class can be reset manually to reuse it but the real
	// use-case is the BGRepeatablePromise derived class that automatically resets after each resolve. This allows using it in a
	// loop with await that 'wakes' up each time the promise is resolved.
	reset() {
		// if we have been resolved or rejected but noone has received those results, we do not reset because we dont want to loose
		// those results.
		if (this.state != BGPromise.pending && this.firedResolveCBList.length+this.firedRejectedCBList.length>0) {
			this._checkForFire(); // make sure any new cb are drained into the fired* arrays
			switch (this.state) {
				case BGPromise.resolved: this.onResolvedCBList = this.firedResolveCBList; this.firedResolveCBList = []; break;
				case BGPromise.rejected: this.onRejectedCB = this.firedRejectedCBList; this.firedRejectedCBList = []; break;
			}
			this.p = null;
			this.state = BGPromise.pending
		}
	}

	_addCallbacks(onResolvedCB, onRejectedCB) {
		if (onResolvedCB && ! (onResolvedCB.toString() in this.seenResolveCBs)) {
			this.onResolvedCBList.push(onResolvedCB);
			this.seenResolveCBs.add(onResolvedCB.toString())
		}
		if (onRejectedCB && ! (onRejectedCB.toString() in this.seenRejectCBs)) {
			this.onRejectedCBList.push(onRejectedCB);
			this.seenRejectCBs.add(onRejectedCB.toString())
		}
	}

	_checkForFire() {
		switch (this.state) {
			case BGPromise.resolved: if (this.onResolvedCBList.length > 0) this._doResolve(); break;
			case BGPromise.rejected: if (this.onRejectedCBList.length > 0) this._doReject(); break;
		}
		return this
	}

	_doResolve() {
		for (const cb of this.onResolvedCBList) {
			cb(...this.p)
		};
		this.firedResolveCBList.concat(this.onResolvedCBList); this.onResolvedCBList=[];
	}

	_doReject() {
		for (const cb of this.onRejectedCBList) {
			cb(...this.p)
		};
		this.firedRejectedCBList.concat(this.onRejectedCBList); this.onRejectedCBList=[];
	}
}

BGPromise.pending = Symbol('pending')
BGPromise.resolved = Symbol('resolved')
BGPromise.rejected = Symbol('rejected')

// This extends the BGPromise::resolve method so that it can be called multiple times. Each time its called, all waiting callbacks
// are invoked and then the state is reset back to pending so that it could be called again.
export class BGRepeatablePromise extends BGPromise {
	resolve(...p) {
		super.resolve(...p)
		this.p = null;
		this.state = BGPromise.pending;
	}
}
