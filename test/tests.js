if (typeof require === 'function') {
    var Aevum = require('../dist').Aevum;
    var chai = require('chai');
    var expect = chai.expect;
} else {
    var Aevum = window.aevum.Aevum;
}

describe('aevum constructor', function() {
    it('should be a function', function() {
        expect(Aevum).to.be.a('function');
    });
});

describe('aevum.format', function() {
    it('should compile', function() {
        [
            '[d]',
            '[dd]',
            '[ddd]',
            '[s]',
            '[ss]',
            '[m]',
            '[mm]',
            '[h]',
            '[hh]',
            'hello',
            '(d:content)',
            '(d:other[mm]content)',
            'hello\\[dude]',
            '(d:hello\\[dude])',
            '(+)',
            '(-)',
            '[?]',
            'something(d:here)'
        ].forEach(function(format) {
            expect(function() {
                new Aevum(format);
            }).to.not.throw(SyntaxError);
        });
    });

    it('should throw syntax errors', function() {
        [
            '(should-fail)',
            '(db)',
            '(h\\hh:test)',
            '(dd',
            '(dd:',
            '(:cool)',
            'there()is content',
            '(ab)',
            '(mm:[[ss]])',
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
            '[+]',
            '[-]',
            '(?)',
            '(++)',
            '(--)',
            '[??]',
            '(d:bla[])',
            '[da]',
            '[sa]',
            '[ma]',
            '[ha]',
            '[d500]',
            '[dd34]',
            '[d24de]',
            '(d:(m:something))',
            '[[da]]',
            '[[sa]]',
            '[[ma]]',
            '[[ha]]'
        ].forEach(function(format) {
            expect(function() {
                new Aevum(format);
            }, `expected ${format} to throw an error`).to.throw(SyntaxError);
        });
    });

    it('should be an object', function() {
        expect(new Aevum('something')).to.be.a('object');
    });

    it('should have a format function', function() {
        expect(new Aevum('something'))
            .to.have.property('format')
            .and.to.be.an('function');
    });

    it('should render inbetween strings', function() {
        expect(
            new Aevum('hi-[d]-welcome-[d]-to-[d]-somewhere').format(1)
        ).to.be.equal('hi-1-welcome-1-to-1-somewhere');
    });

    it('should format correctly', function() {
        [
            {
                type: 'd',
                timeType: 'milliseconds',
                empty: [0, {}],
                filled: [
                    1,
                    { milliseconds: 1 },
                    { seconds: 1 },
                    { minutes: 1 },
                    { hours: 1 }
                ]
            },
            {
                type: 's',
                timeType: 'seconds',
                empty: [0, {}, 999, { milliseconds: 999 }, { seconds: 0 }],
                filled: [1000, { seconds: 1 }, { minutes: 1 }, { hours: 1 }]
            },
            {
                type: 'm',
                timeType: 'minutes',
                empty: [0, {}, 59999, { milliseconds: 999 }, { seconds: 59 }],
                filled: [60000, { minutes: 1 }, { hours: 1 }]
            },
            {
                type: 'h',
                timeType: 'hours',
                empty: [
                    0,
                    {},
                    3599999,
                    { milliseconds: 999 },
                    { seconds: 59 },
                    { minutes: 59 }
                ],
                filled: [3600000, { hours: 1 }]
            }
        ].forEach(function(obj) {
            const timeString =
                typeof obj.time === 'number'
                    ? obj.time
                    : JSON.stringify(obj.time);

            const formatString = `(${obj.type}:test)`;
            const instance = new Aevum(formatString);

            const expandString = `[${obj.type}]`;
            const expandInstance = new Aevum(expandString);
            const expandTime = {};
            expandTime[obj.timeType] = 98;
            const expandTimeString = JSON.stringify(expandTime);

            obj.empty.forEach(function(time) {
                expect(
                    instance.format(time),
                    `format-string '${formatString}' with time '${timeString}'`
                ).to.be.equal('');
            });

            obj.filled.forEach(function(time) {
                expect(
                    instance.format(time),
                    `format-string '${formatString}' with time '${timeString}'`
                ).to.be.equal('test');
            });

            expect(
                expandInstance.format(expandTime, { expand: true }),
                `expand with format '${expandString}' and time '${expandTimeString}'`
            ).to.be.equal('98');

            expect(
                expandInstance.format(expandTime, { expand: false }),
                `no expand with format '${expandString}' and time '${expandTimeString}'`
            ).to.be.equal('9');
        });
    });

    it('should format padding correctly', function() {
        [
            {
                type: 's',
                below: ['d'],
                time: { seconds: 1 }
            },
            {
                type: 'm',
                below: ['d', 's'],
                time: { minutes: 1 }
            },
            {
                type: 'h',
                below: ['d', 's', 'm'],
                time: { hours: 1 }
            }
        ].forEach(function(obj) {
            obj.below.forEach(function(belowType) {
                const timeString =
                    typeof obj.time === 'number'
                        ? obj.time
                        : JSON.stringify(obj.time);

                const formatString = `(${obj.type}:[${belowType}])`;
                const instance = new Aevum(formatString);

                expect(
                    instance.format(obj.time, { padding: true }),
                    `padding with format '${formatString}' and time '${timeString}'`
                ).to.be.equal(belowType === 'd' ? '000' : '00');
                expect(
                    instance.format(obj.time, { padding: false }),
                    `no padding with format '${formatString}' and time '${timeString}'`
                ).to.be.equal('0');
            });
        });
    });

    it('should format timing-indicators correctly', function() {
        var minus = new Aevum('(-)[d]');
        expect(minus.format(-1)).to.be.equal('-1');
        expect(minus.format(1)).to.be.equal('1');

        var plus = new Aevum('(+)[d]');
        expect(plus.format(1)).to.be.equal('+1');
        expect(plus.format(-1)).to.be.equal('1');

        var both = new Aevum('[?][d]');
        expect(both.format(1)).to.be.equal('+1');
        expect(both.format(-1)).to.be.equal('-1');
    });

    it('should throw time errors', function() {
        var format = new Aevum('something');
        [
            undefined,
            null,
            'test',
            NaN,
            Infinity,
            -NaN,
            -Infinity,
            true,
            false
        ].forEach(function(invalid) {
            expect(function() {
                format.format(invalid);
            }, `element '${invalid}' to be invalid`).to.throw(TypeError);
        });
    });

    it('should truncate decimals', function() {
        const instance = new Aevum('(-)[d]');
        expect(instance.format(0.1234), `zero should be positive`).to.be.equal(
            '0'
        );
        expect(instance.format(1.1234), `one should be positive`).to.be.equal(
            '1'
        );
        expect(
            instance.format(-1.1234),
            `minus one should be negative`
        ).to.be.equal('-1');
    });
});
