/* global describe, it */
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

        it('should throw syntax errors', function() {
            expect(function() {
                formatter('(should-fail)')
            }).to.throw(SyntaxError)

            expect(function() {
                formatter('(mm)[[[ss]]]')
            }).to.throw(SyntaxError)

            expect(function() {
                formatter('(mm)[[invalid]]')
            }).to.throw(SyntaxError)
        })

        it('should be an object', function() {
            expect(format).to.be.a('object')
        })

        it('should have a format function', function() {
            expect(format).to.have.property('format').and.to.be.an('function')
        })

        it('should format', function() {
            expect(function() {
                format.format(1000)
            }).to.not.throw()

            expect(format.format(1000)).to.be.equal('00m, 01s, 000ms cool')

            expect(format.format({
                seconds: 1
            })).to.be.equal('00m, 01s, 000ms cool')

            expect(format.format(3600000)).to.be.equal('Its very late! 01h 00m!00m, 00s, 000ms cool')
        })
    })
})