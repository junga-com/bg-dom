import {StartPackage} from './GlobalServices'
export * from './GlobalServices'
StartPackage();

export {mount,unmount} from 'redom'
export * from './Disposables'
export * from './bg-promise'
export * from './parameters'
export * from './bg_ini'
export * from './DependentsGraph'
export * from './PolyfillObjectMixin'
export * from './component'
export * from './componentUtils'
export * from './buttons'
export * from './toolbars'
export * from './panels'
export * from './miscellaneous'
export * from './examples'
export * from './BGStylesheet'
//packageDesc = require('./package.json');
//export version = {[packageDesc.name]:{version:packageDesc.version}}
