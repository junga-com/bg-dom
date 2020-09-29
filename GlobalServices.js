import fs from 'fs'
import path from 'path'

class PkgVersionRecord {
	constructor(version) {
		this.version = version;
		this.modulePaths = new Map();
	}
	add(pkgJson) {
		this.modulePaths.set(pkgJson.modulePaths, pkgJson);
		var pkgRecord = this.modulePaths.get(pkgJson.modulePaths);
		if (!pkgRecord) {
			pkgRecord = pkgJson;
			this.modulePaths.set(pkgJson.modulePaths, pkgRecord);
			pkgRecord.loadCount=0;
		}
		pkgRecord.loadCount++;
	}
}

// This provides a mechanism to track Atom packages and npm packages that are loaded to be able to tell if different versions are
// coexisting.  Atom packages participate automatically if they use BGAtomPlugin but npm packages have to cooperate by calling the
// StartPackage export of this module.
class PkgInfo {
	static registerEclosingPkgJson(mPath) {
		RegisterGlobalService(null, 'bg',     ()=>Object.create(null))
		RegisterGlobalService(bg,   'pkgInfo',()=>Object.create(null))

		for (var mPath = path.dirname(mPath); mPath!='/' && !fs.existsSync(mPath+'/package.json'); mPath = path.dirname(mPath))
		if (mPath!='/') {
			const pkgJson = require(mPath+'/package.json');
			pkgJson.modulePath = mPath;
			const pkgInfo = RegisterGlobalService(bg.pkgInfo, pkgJson.name,()=>new PkgInfo(pkgJson.name));
			pkgInfo.add(pkgJson);
		}
	}
	constructor(name) {
		this.name = name;
		this.versions = new Map();
	}
	add(pkgJson) {
		if (!new RegExp('/node_modules/'+pkgJson.name+'$').test(pkgJson.modulePath))
			pkgJson.version+='-dev';
		var versionRecord = this.versions.get(pkgJson.version);
		if (!versionRecord) {
			versionRecord = new PkgVersionRecord(pkgJson.version);
			this.versions.set(pkgJson.version, versionRecord);
		}
		versionRecord.add(pkgJson);
	}
}


export function StartPackage() {
	PkgInfo.registerEclosingPkgJson(module.filename);
}

export function RegisterGlobalService(gObj, name,ctor) {
	const mNames =[];
	const mIds =[];
	const mPaths =[];
	var iMod = module;
	const mStack = [];
	while (iMod) {
		mStack.push(iMod);
		iMod = iMod.parent;
	}
//console.log('mStack.length='+mStack.length);
	for (var i=mStack.length-1; i>=0; i--) {
//console.log('i='+i);
		iMod = mStack[i];
		mNames.push(iMod.filename);
		mIds.push(iMod.id);
		mPaths.push(iMod.path);
	}
	console.log('module stack',{module, mStack, mNames, mIds,mPaths});

	if (!gObj) gObj=global;

	if (typeof gObj[name] == 'undefined') {
		gObj[name] = ctor();
	//} else {
	}
	return gObj[name]
}

export function MakeModuleID(mod) {
	const mNames =[];
	const mIds =[];
	const mPaths =[];
	var iMod = mod;
	const mStack = [];
	while (iMod) {
		mStack.push(iMod);
		iMod = iMod.parent;
	}
}
