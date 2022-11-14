import { BGError } from './BGError'

export class Disposable
{
	constructor(disposable)
	{
		this.cb = Disposables.GetDisposableFn(disposable);
		this._disposed = false;
	}

	dispose()
	{
		if (!this._disposed) {
			this._disposed = true;
			this.cb();
			this.cb = null;
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
		if (!obj || typeof obj != 'object')
			return;

		if (destroyedChecker.has(obj))
			return;
		destroyedChecker.add(obj);

		if (       typeof obj.dispose == 'function') {
			obj.dispose();
		} else if (typeof obj.destroy == 'function') {
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
	static GetDisposableFn(disp) {
		switch (typeof disp) {
			case 'function':
				return disp;
			case 'object':
				if (disp instanceof Disposable)
					return disp.cb;
				if (typeof disp.dispose == 'function')
					return ()=>{if (destroyedChecker.has(disp)) return; destroyedChecker.add(disp); disp.dispose();};
				if (typeof disp.destroy == 'function')
					return ()=>{if (destroyedChecker.has(disp)) return; destroyedChecker.add(disp); disp.destroy();};
				throw new BGError("object pass to Disposables is not disposable because it has niether a dispose() nor a destroy() method str(obj)='"+disp+"'", {obj:disp})
			case 'null':
			case 'undefined': return ()=>{};
		}
		throw new BGError('Parameters passed to Disposable must be a function or an Object with a "dispose" or "destroy" method. parameter='+disp, {parameter:disp})
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
		// flatten because we support passing in an array of disposables and with the variable args it would be wrapped in another array
		disposables = disposables.flat();

		for (var disp of disposables) {
			if (disp instanceof Disposables) {
				this.cbs = this.cbs.concat(disp.cbs);
			} else {
				var cbFn = Disposables.GetDisposableFn(disp);
				if (cbFn)
					this.cbs.push(cbFn);
			}
		}
	}
	dispose() {
		var cb;
		while (cb = this.cbs.shift()) {
			cb();
		}
	}
}


// This is a map that will call its element's dispose/destroy methods when they are removed from the map either directly or by
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
