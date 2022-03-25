// Each npm or atom package that uses @stdthings/esm to support ES6 module syntax needs an esm to cjs bridge file like this one.
// The package.json:main will point to this file and this file will load the real entry point from the package.json:module field.
// esm enforces that it is only required once by declaring global.__global__ and erroring out if its already decalred.
// in Atom packages, each plugin will require a separate esm even if its the same version so we circumvent that by 'caching' the
// esm module in the global.__bgEsmModule__ variable

if (typeof global.__bgEsmModule__ == 'undefined')
	global.__bgEsmModule__ = require("esm")
require = global.__bgEsmModule__(module/* , options */);

if (typeof global.__bgDomModule__ == 'undefined')
	global.__bgDomModule__ = require(require('./package.json').module)

module.exports=global.__bgDomModule__
