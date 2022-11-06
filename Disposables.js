
export class Disposable
{
	constructor(disposeActionFn)
	{
		this.disposeActionFn = disposeActionFn;
		this._disposed = false;
	}

	dispose()
	{
		if (!this._disposed) {
			this._disposed = true;
			this.disposeActionFn();
		}
	}

	// make destroy() a synonym for dispose()
	destroy() {this.dispose()}
}

// This was inspired by the Atom Disposable and CompositeDisposable classes. This adds destroy as a synonym for dispose and treats
// functions objects the same as <obj>.dispose so that one class does it all.
// The idea is that if your class needs to keep track of things to cleanup with its objects are destroyed/disposed, then add a
// disposables = new Disposables() member and add any function or object that has a dispose or destroy method to the it. Then in your
// class's destroy or dispose method, call this.disposables.dispose() or Disposables.DisposeOfMembers(this).
export class Disposables {
	static DisposeOfObject(obj) {
		if (!obj || typeof obj != 'object') return;
		if (destroyedChecker.has(obj)) return; destroyedChecker.add(obj);
		if (obj && typeof obj == 'object' && typeof obj.dispose == 'function') {
			obj.dispose();
		} else if (obj && typeof obj == 'object' && typeof obj.destroy == 'function') {
			obj.destroy();
		}
	}
	// this iterates the direct members of <obj> and for each member that is an 'object' type and has a dispose or destroy method
	// it calls that method.  If abused, this could become inefficient, iterating every object and nested object too frequently.
	// It should be used when the object is a high level one that does not get created and destroyed many times within a user
	// transaction.
	static DisposeOfMembers(obj) {
		for (const name of Object.getOwnPropertyNames(obj)) {
			Disposables.DisposeOfObject(obj[name]);
		}
	}

	constructor(...disposables) {
		this.cbs = [];
		this.add(disposables)
	}

	// add one or more disposables that will be invoked when this disposable is disposed.
	// Params:
	//     <disposables> : one or more <disposable>. They can be passed as multiple arguments and/or as an array of <disposable>
	//     <disposable>  : a callback that will be invoked when this classes dispose() method is called. It can be one of these...
	//                   (function) : if its a function, it will be invoked directly
	//                   (object)   : if its an object, and has a dispose method, that will be invoked otherwise if it has a
	//                                destroy methods, that will be invoked.
	//                   (null),(undefined) : no action. it will be ignored
	//                   (other)    : if none of the above, its an invalid <disposable> and an assertion will be thrown.
	add(...disposables) {
		disposables = disposables.flat();
		this.cbs=this.cbs.concat(
			disposables.map((cb)=>{
				if (cb) switch (typeof cb) {
					case 'function': return cb;
					case 'object':
						if (typeof cb.dispose == 'function') return ()=>{if (destroyedChecker.has(cb)) return; destroyedChecker.add(cb); cb.dispose();};
						if (typeof cb.destroy == 'function') return ()=>{if (destroyedChecker.has(cb)) return; destroyedChecker.add(cb); cb.destroy();};
					case 'null':
					case 'undefined': return undefined;
				}
				console.assert(false, 'Parameters passed to Disposable must be a function or an Object with a "dispose" or "destroy" method. parameter='+cb)
			})
		);
	}
	dispose() {
		var cb;
		while (cb = this.cbs.shift()) {
			cb();
		}
	}
}


// This is a map that will call its element's dispose/destroy methods when they are removed from the map eithr directly or by
// replacement with a new vaule
export class DisposableMap extends Map {
	dispose() {
		const values=new Array(this.size);
		var count=0;
		for (const [k,v] of this)
			values[count++]=v
		this.clear();
		for (const value of values)
			Disposables.DisposeOfObject(value);
	}
	set(key, value) {
		const prevValue = this.get(key);
		Disposables.DisposeOfObject(prevValue);
		value && super.set(key, value);
	}
	setBypass(key, value) {
		super.set(key, value);
	}
	delete(key) {
		const prevValue = this.get(key);
		super.delete(key);
		Disposables.DisposeOfObject(prevValue);
	}
	deleteBypass(key) {
		super.delete(key);
	}
}

const destroyedChecker = new WeakSet();
