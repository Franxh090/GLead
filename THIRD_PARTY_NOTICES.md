# Third-party notices

GLead reuses code from these MIT-licensed projects. Each copy keeps its
original header comments; the licence texts are reproduced below.

## FretFree (pookey/fretfree)

`src/vendor/fretfree/` is copied from https://github.com/pookey/fretfree at
commit `f523388ede67026c19fff6fe93129a56a4d0d70d` (2026-10-21): the theory
module, the microphone pitch detector, the audio engine, the fretboard SVG and
the grading, scheduler and adaptive-scope parts of the learning engine. See
`src/vendor/fretfree/UPSTREAM.md` for what changed.

```
MIT License

Copyright (c) 2026 pookey and Fretwork contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## OpenEar (ShacharHarshuv/open-ear)

The cadence voicings and the exercise designs for scale degrees, chord
function and notes-against-chords follow OpenEar (MIT, Copyright (c) 2021
Shachar Har-Shuv; the licence text is in that repository's README). No code is
copied verbatim at this time; `research/R1c-openear-audit.md` records the
files consulted.

## FretEcho (dmb1107/fretecho)

The mute-while-prompting protocol and the weak-spot weighting idea come from
FretEcho (MIT, Copyright (c) 2026 Dave). No code is copied verbatim at this
time.
