import fs from 'fs'
import path from 'path'
import json5 from 'json5'
import VersionCmp from 'node-version-compare'

// This provides a mechanism to track loaded Atom packages and npm packages to be able to tell if different versions are
// coexisting.  Atom packages participate automatically if they use BGAtomPlugin but npm packages have to cooperate by calling the
// RegisterPackage(__filename) function (typically in their top level js file module).
class PkgInfo {
	static registerEclosingPkgJson(mPath) {
		for (var mPath = path.dirname(mPath); !/^(\/|\.|)$/.test(mPath) && !fs.existsSync(mPath+'/package.json'); mPath = path.dirname(mPath));
		if (!/^(\/|\.|)$/.test(mPath)) {
			//const pkgJson = require(mPath+'/package.json');
			const pkgJson = json5.parse(fs.readFileSync(mPath+'/package.json'));
			pkgJson.modulePath = mPath;
			if (!new RegExp('/node_modules/'+pkgJson.name+'$').test(pkgJson.modulePath))
				pkgJson.version+='-dev';

			var pkgRecord = bg.pkgInfo[pkgJson.name];
			if (!pkgRecord)
				bg.pkgInfo[pkgJson.name] = pkgRecord = Object.create(null);
			var versionRecord = pkgRecord[pkgJson.version];
			if (!versionRecord)
				pkgRecord[pkgJson.version] = versionRecord = Object.create(null);
			var pathRecord = versionRecord[pkgJson.modulePath];
			if (!pathRecord)
				versionRecord[pkgJson.modulePath] = pathRecord = pkgJson;
		}
	}
	logStatus(detailFlag=false) {
		(!detailFlag) && console.log('pkgName'.padEnd(21)+' '+'#versions'.padStart(13)+' '+'instances'.padStart(10))
		for (const pkgName in bg.pkgInfo) {
			var instanceCount = 0;
			var versionCount = 0;
			for (const version in bg.pkgInfo[pkgName]) {
				versionCount++;
				for (const mPath in bg.pkgInfo[pkgName][version]) {
					(detailFlag) && console.log(pkgName.padEnd(21)+' '+version.padEnd(10)+' '+mPath);
					instanceCount++;
				}
			}
			(!detailFlag) && console.log(pkgName.padEnd(21)+' '+versionCount.toString().padStart(13)+' '+instanceCount.toString().padStart(10))
		}
	}
	logStatusDetails() {
		this.logStatus(true);
	}
}

// This function allows an npm or Atom package to record each instance of it that gets imported.
// The output of the function is the global object at global.bg.pkgInfo
//    global.bg.pkgInfo = {
//       [<pkgName>] = {
//          [<version>] = {
//             [<modulePath>] = <package.json data>
//          }
//       }
//    }
export function RegisterPackage(moduleFilename) {
	PkgInfo.registerEclosingPkgJson(moduleFilename);
}


const sGblVersionInfo = Symbol('sGblVersionInfo');

// This function allows you to install a global variable safely.
// The global or window object is shared accross all modules. Even the same npm module may exist in multiple contexts where the top
// scope module code runs once for each context. Also, different versions of the same module that uses a global service can coexist.
// This creates the <name> property in <gObj> assigning it the result of ctor() only if <gObj>[<name>] does not already exist or if
// the version number of the existing obj is less than <version>. If the value is replaced because of a greater version number, the
// previous value is passed to ctor(prevValue) so that it can copy any state from prevValue.
export function RegisterGlobalService(version, gObj, name,ctor) {
	if (!gObj) gObj=global;

	if (typeof gObj[sGblVersionInfo] == 'undefined')
		gObj[sGblVersionInfo] = Object.create(null);

	if (typeof gObj[name] == 'undefined') {
		gObj[name] = ctor();
		gObj[sGblVersionInfo][name] = version;
	} else if (VersionCmp(version, gObj[sGblVersionInfo][name] || '1.0.0')>0) {
console.log('!!!!!!!! replacing! '+name);
		const prevObj = gObj[name];
		gObj[name] = ctor(prevObj);
		gObj[sGblVersionInfo][name] = version;
	}
	return gObj[name];
}

RegisterGlobalService('1.0.0', null, 'bg',     ()=>Object.create(null))
RegisterGlobalService('1.0.0', bg,   'pkgInfo',()=>new PkgInfo())
