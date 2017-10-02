var chai = require('chai')
var expect = chai.expect

describe('aevum', function() {

    var formatter = require('../aevum')

    it('should exist as module', function() {
        expect(formatter).to.be.a('function')
    })

    describe('format', function() {
        var format = null

        it('should compile', function() {
            expect(function() {
                format = formatter('(hh)[Its very late! #h [mm]m!][mm]m, [ss]s, [ddd]ms cool')
            }).to.not.throw(SyntaxError)
        })

        it('should be an object', function() {
            expect(format).to.be.a('object')
        })

        it('should have compiled data', function() {
            expect(format).to.have.property('_compiled').and.to.be.an('array')
        })

        it('should have a format function', function() {
            expect(format).to.have.property('format').and.to.be.an('function')
        })

        it('should format', function() {
            console.log(format._compiled)
            expect(function() {
                format.format(1000)
            }).to.not.throw()
        })
    })
})