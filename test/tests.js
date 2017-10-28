if (typeof require === 'function') {
    var Aevum = require('../aevum').Aevum
    var chai = require('chai')
    var expect = chai.expect
}

describe('module', function() {
    it('should be a function', function() {
        expect(Aevum).to.be.a('function')
    })

    describe('format', function() {

        it('should compile', function() {
            [
                '[d]',
                '[dd]',
                '[ddd]',
                '[d1]',
                '[d2]',
                '[d3]',
                '[s]',
                '[ss]',
                '[s1]',
                '[s2]',
                '[m]',
                '[mm]',
                '[m1]',
                '[m2]',
                '[h]',
                '[hh]',
                '[h1]',
                '[h2]',
                '[h10000]',
                'hello',
                '(d)[content]',
                '(d)[other[mm]content]',
                'hello\\[dude\\]',
                '(d)[hello\\[dude\\]]',
                'something(d)[here]',
            ].forEach(format => {
                expect(function() {
                    new Aevum(format)
                }).to.not.throw(SyntaxError)
            })
        })

        it('should throw syntax errors', function() {
            [
                '(should-fail)',
                '(dd)',
                '(h\\hh)[test]',
                '(dd)[',
                '(dd)hello',
                'there()is content',
                '(ab)',
                '(mm)[[[ss]]]',
                '(mm)[[invalid]]',
                '(mm)[[test]',
                '[dddd]',
                '[d4]',
                '[sss]',
                '[s3]',
                '[mmm]',
                '[m3]',
                '[a]',
                '[b]',
                '[c]',
                '[e]',
                '[f]',
                '[g]',
                '[k]',
                '[l]',
                '[n]',
                '[o]',
                '[p]',
                '[q]',
                '[r]',
                '[t]',
                '[u]',
                '[v]',
                '[x]',
                '[y]',
                '[z]',
                '[]',
                '(d)[bla[]]',
                '[da]',
                '[sa]',
                '[ma]',
                '[ha]',
                '[d500]',
                '[dd34]',
                '[d24de]',
                '(d)[[da]]',
                '(d)[[sa]]',
                '(d)[[ma]]',
                '(d)[[ha]]',
            ].forEach(format => {
                expect(function() {
                    new Aevum(format)
                }).to.throw(SyntaxError)
            })
        })

        it('should be an object', function() {
            expect(new Aevum('something')).to.be.a('object')
        })

        it('should have a format function', function() {
            expect(new Aevum('something')).to.have.property('format').and.to.be.an('function')
        })

        it('should format correctly', function() {
            [
                {
                    type: 'd',
                    empty: [
                        0,
                        {}
                    ],
                    filled: [
                        1,
                        { milliseconds: 1 },
                        { seconds: 1 },
                        { minutes: 1 },
                        { hours: 1 },
                    ]
                },
                {
                    type: 's',
                    empty: [
                        0,
                        {},
                        999,
                        { milliseconds: 999 },
                        { seconds: 0 },
                    ],
                    filled: [
                        1000,
                        { seconds: 1 },
                        { minutes: 1 },
                        { hours: 1 },
                    ]
                },
                {
                    type: 'm',
                    empty: [
                        0,
                        {},
                        59999,
                        { milliseconds: 999 },
                        { seconds: 59 },
                    ],
                    filled: [
                        60000,
                        { minutes: 1 },
                        { hours: 1 },
                    ]
                },
                {
                    type: 'h',
                    empty: [
                        0,
                        {},
                        3599999,
                        { milliseconds: 999 },
                        { seconds: 59 },
                        { minutes: 59 },
                    ],
                    filled: [
                        3600000,
                        { hours: 1 },
                    ]
                }
            ].forEach(obj => {
                const format = new Aevum('(' + obj.type + ')[test]')
                obj.empty.forEach(time => {
                    expect(format.format(time)).to.be.equal('')
                })
                obj.filled.forEach(time => {
                    expect(format.format(time)).to.be.equal('test')
                })
            })
        })

        it('should format padding correctly', function() {
            [
                {
                    type: 's',
                    below: ['d'],
                    time: { seconds: 1 },
                },
                {
                    type: 'm',
                    below: ['d', 's'],
                    time:  { minutes: 1 },
                },
                {
                    type: 'h',
                    below: ['d', 's', 'm'],
                    time: { hours: 1 },
                }
            ].forEach(obj => {
                obj.below.forEach(b => {
                    const tmp = new Aevum('(' + obj.type + ')[[' + b + ']]')
                    expect(tmp.format(obj.time, true)).to.be.equal(b === 'd' ? '000' : '00')
                    expect(tmp.format(obj.time)).to.be.equal('0')
                })
            })
        })

        it('should throw format errors', function() {
            const format = new Aevum('something');
            [
                undefined,
                null,
                'test',
                NaN,
                Infinity,
                -NaN,
                -Infinity,
                ['whatever'],
                true,
                false,
                -1,
                -2357654
            ].forEach(invalid => {
                expect(function() {
                    format.format(invalid)
                }).to.throw(TypeError)
            })
        })
    })
})