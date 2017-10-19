/* global describe, it */
var chai = require('chai')
var expect = chai.expect

describe('aevum', function() {

    var aevum = require('../dist/aevum').Aevum

    it('should exist as module', function() {
        expect(aevum).to.be.a('function')
    })

    describe('format', function() {

        it('should compile', function() {
            expect(function() {
                new aevum('[d]')
                new aevum('[dd]')
                new aevum('[ddd]')
                new aevum('[d1]')
                new aevum('[d2]')
                new aevum('[d3]')

                new aevum('[s]')
                new aevum('[ss]')
                new aevum('[s1]')
                new aevum('[s2]')

                new aevum('[m]')
                new aevum('[mm]')
                new aevum('[m1]')
                new aevum('[m2]')

                new aevum('[h]')
                new aevum('[hh]')
                new aevum('[h1]')
                new aevum('[h2]')
                new aevum('[h10000]')
            }).to.not.throw(SyntaxError)
        })

        it('should throw syntax errors', function() {
            expect(function() {
                new aevum('(should-fail)')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(dd)')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(h\\hh)[test]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(dd)[')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(mm)[[[ss]]]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(mm)[[invalid]]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('(mm)[[test]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[dddd]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[d4]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[sss]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[s3]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[mmm]')
            }).to.throw(SyntaxError)

            expect(function() {
                new aevum('[m3]')
            }).to.throw(SyntaxError)
        })

        it('should be an object', function() {
            expect(new aevum('something')).to.be.a('object')
        })

        it('should have a format function', function() {
            expect(new aevum('something')).to.have.property('format').and.to.be.an('function')
        })

        it('should format', function() {
            var format = new aevum('(hh)[Its very late! #h [m2]m!][mm]m, [ss]s, [d3]ms cool')
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