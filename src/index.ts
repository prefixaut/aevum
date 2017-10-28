/* tslint:globals bootstrap */
import * as aevum from './aevum'

declare var bootstrap: any
declare var exports: any
declare var module: any
declare var define: any

((definition) => {
    if (typeof bootstrap === 'function') {
        bootstrap('promise', () => definition)
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = definition
    } else if (typeof define === 'function' && define.amd) {
        define(() => definition)
    } else if (typeof window !== 'undefined' || typeof self !== 'undefined') {
        const global = (window || self) as any
        const previous = global.Aevum
        global.Aevum = definition
        global.Aevum.noConflict = () => {
            global.Aevum = previous
            return definition
        }
    } else {
        throw new Error('Unsupported Environment!')
    }
})(aevum)
