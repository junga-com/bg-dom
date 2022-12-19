
const MoveModes = {
	Normal      :'Normal',
	MakeBackup  :'MakeBackup',
	RemoveBackup:'RemoveBackup'
}

// Example:
//    class DbgStackView extends Component {...}
//    class AtomViewMixin extends ClassMixin {
//       constructor(targetClass) {
//          super(targetClass, '');
//       }
//       _constructor() {
//          this.atom ={};
//          this.atom.title = this.label || this.name || '';
//          this.atom.uri   = '';
//       }
//       getTitle            : function() {return this.atom.title;},
//       getElement          : function() {return this.el;},
//       getDefaultLocation  : function() {return 'bottom';},
//       getAllowedLocations : function() {return ['left','right','center','bottom'];},
//       getURI              : function() {return this.atom.uri;},
//
//    }
export class ClassMixin {
	constructor(targetClass, propsToReplace) {
		this.name = this.constructor.name;
		this.targetClass = targetClass;
		this.propsToReplace = propsToReplace;

		this.targetClass[`mixin_${this.name}`] = {}
		this.stateObj = this.targetClass[`mixin_${this.name}`];

		for (const propName of this.propsToReplace) {
			this.moveProp(this.stateObj, this.targetClass, propName);
			this.moveProp(this.targetClass,   this,        propName, MoveModes.MakeBackup);
		}
	}

	destroy() {
		deps.objectDestroyed(this);
	}

	// private helper function
	// this makes the dst have the same state for propName as the src does. This includes deleting propName if it does not exist
	// in the src. Note that the order of dst and src is consistent with the comp sci tradition of assignment (i.e. dst=src)
	// Move Process:
	// This function moves a property in two steps so that the property will not be coerced and attributes are preserved.
	// Note that methods do not have descriptors so in that case the first step is skipped
	//    1) First it defines the property in the destination with the descriptor it gets from the source
	//    2) Second it copies the value
	// Params:
	//    <dst>     : the targetClass object of the move that will have the property modified (copied or deleted)
	//    <src>     : the source object where the property will be copied from if it exists
	//    <propName>: the string name of the property to act on
	//    <mode>    : true -> make a backup of the dst property if it exists in 'orig_'+propName
	moveProp(dst,src, propName, mode=false) {
		// NOTE: Reflect.getOwnPropertyDescriptor ruturns null if propName is a function
		const backupPropName = 'orig_'+propName;
		const srcDescr = Reflect.getOwnPropertyDescriptor(src, propName)
		const dstDescr = Reflect.getOwnPropertyDescriptor(dst, propName)
		if (dstDescr || Reflect.has(dst, propName)) {
			if (mode==MoveModes.MakeBackup) {
				console.assert(!Reflect.has(dst, backupPropName), "It seems that multiple ClassMixin are replacing the same property : mixin="+this.name+", propName="+propName)
				dstDescr && Reflect.defineProperty(dst, backupPropName, dstDescr);
				Reflect.set(dst, backupPropName, Reflect.get(dst, propName))
			}
			Reflect.deleteProperty(dst, propName);
		}
		if (srcDescr)
			Reflect.defineProperty(dst, propName, srcDescr);
		if (Reflect.has(src, propName))
			Reflect.set(dst, propName, Reflect.get(src, propName))
		if (mode==MoveModes.RemoveBackup && Reflect.has(dst, backupPropName))
			Reflect.deleteProperty(dst, backupPropName);
	}
}
