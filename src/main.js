// import './style.css'
//
// age of universe: 13.7 billion years
// = 4.32e17 sec
// heat death: 1.7e106 years
// = 5.36e113 sec
//
// DOWN 1000 ms -> 1 s
// ACRS 60 s -> 1 min
// DOWN 60 min -> 1 hr
// ACRS 24 hr -> 1 day
// DOWN 7 days -> 1 week
// ACRS 52 weeks ~~ 1 year
// DOWN 100 years -> 1 century
// ACRS 10 centuries -> 1 millenium
// DOWN 100 milleniums -> 1e5 years
// ACRS 100 1e5 years -> 1e7 years
// DOWN 100 1e7 years -> 1e9 years
// ACRS 100 1e9 -> 1e11 years (but age of universe is only 13.7 1e9 years.)
// DOWN -> 1e13
// ACRS -> 1e15
// ... takes a LOT more layers to get to 1.7e106!
//
// 4^14 = 268,435,456
// meaning however many pixels i have in the most zoomed-in tile, i've got 268M times as many altogether.
// a fully-zoomed-in tile is about 400px square on screen, or 160000 pixels
// let's say fully zoomed in, i want to give a 1-second mark 20x120 pixels, plus side padding of 10 and bottom padding of 20. that's 30*140 = 4200 pixels, meaning i can get 38 of them into one tile. (this math isn't conservative enough, because i'm going to want more padding at longer time scales. SIGNIFICANTLY more, in fact. but it's a start.)
// 38s per tile * 4^14 tiles = 1.02e10 sec.  not nearly enough for the age of the universe.  need 4.2e7 times as many tiles, i.e. 13 more layers.
// now, given that the math isn't conservative enough, i might need WAY WAY more than that. but even if i just need 13 more layers, i think the current approach won't get me there.  i'm going to need a "resetting" approach, i.e. imagine starting fully zoomed out, then zooming all the way in to a 14th-level tile, then the bookkeeping "resets" to treat that thing (and all others at its level) like it's the fully-zoomed-out tile.  i need something like that.
// man, this is making me realize just how difficult it is to comprehend the scale of the age of the universe.  it's going to be like 99.9999999999999999999999999999999999999999999...% already-filled-in pixels.  will zooming around even be interesting?  how will i label each individual second?  i guess there are only 17 digits needed, that's not that big of a deal.  i'll definitely want to render the full viewport, not just some 600x600 area canvas.  also HOLY SHIT if i do it to the heat death of the universe.... i think that needs to be a toggleable feature.  but without it, where does it end?  at the viewer's 100th birthday?  100 years from now?  the year 3000?

import * as d3 from 'd3'
import {tile as d3tile} from 'd3-tile'

const width = 600
const height = 600

// e9Width = e7Width = 2595632000
// e9Height = e7Height * 100 + e7PadY * 99 = 150743230000
// that gets us to the padding between "tallies" of 1BB years.  we need 13.7 of those, which gives a total canvas size of:
// 38,848,498,000 x 150,743,230,000
//
//
// https://observablehq.com/@fil/height#height <-- eventually might want that, to get (and be responsive to changes in?) the viewport height.


// sec1 < sec2 ==> -1
// sec1 = sec2 ==> 0
// sec1 > sec2 ==> 1
// if seconds come from different Geometries (i.e. arrays are different lengths),
// it only compares to the least significant value of the lowest common resolution.
function compareSeconds(sec1, sec2) {
  const len = Math.min(sec1.length, sec2.length)
  for (let i = 0; i < len; i++) {
    if (sec1[i] < sec2[i]) return -1
    if (sec1[i] > sec2[i]) return 1
  }
  return 0
}

// simple elementwise sum, assumes arrays are same length
function sumElements(arr1, arr2) {
  return arr1.map((val, idx) => val + arr2[idx])
}

class Geometry {
  #dims = []
  parent = null

  static withSecondDims(secWidth, secHeight, secPad) {
    const baseDim = {
      name: 'second',
      rollupCnt: null,
      width: secWidth,
      height: secHeight,
      pad: secPad,
      sizeWithPad: secWidth + secPad,
      axis: 'x', // the axis along which we step to draw each tally
    }
    return new Geometry([baseDim], null)
  }

  constructor(dims, parent) {
    this.#dims = dims
    this.parent = parent
  }

  addDimension(name, rollupCnt, pad) {
    const newDim = { name, rollupCnt, pad }
    const last = this.lastDim
    if (last.axis === 'x') {
      newDim.axis = 'y'
      newDim.width = last.width * rollupCnt + last.pad * (rollupCnt - 1)
      newDim.height = last.height
      newDim.sizeWithPad = newDim.height + pad
    } else {
      newDim.axis = 'x'
      newDim.width = last.width
      newDim.height = last.height * rollupCnt + last.pad * (rollupCnt - 1)
      newDim.sizeWithPad = newDim.width + pad
    }
    this.#dims.unshift(newDim)
  }

  subGeo() {
    if (this.#dims.length <= 1) return this
    return new Geometry(this.#dims.slice(0, this.#dims.length - 1), this)
  }

  superGeo() {
    if (!this.parent) return this
    return this.parent
  }

  get baseDim() {
    return this.#dims[this.#dims.length - 1]
  }

  get lastDim() {
    return this.#dims[0]
  }

  valueOfSecond(sec) {
    const len = this.#dims.length
    let result = 0
    let multiplier = 1
    for (let i = len - 1; i >= 0; i--) {
      const dim = this.#dims[i]
      if (dim.rollupCnt) {
        multiplier *= dim.rollupCnt
      }
      result += (sec[i] * multiplier)
    }
    return result
  }

  locationOf(sec) {
    const len = this.#dims.length
    const result = { x: 0, y: 0 }
    for (let i = 0; i < len; i++) {
      const dim = this.#dims[i]
      result[dim.axis] += sec[i] * dim.sizeWithPad
    }
    return result
  }

  nearestSecond(x, y) {
    const second = []
    const remainder = { x, y }
    for (let i = 0; i < this.#dims.length; i++) {
      const dim = this.#dims[i]
      const nextDim = this.#dims[i-1]
      // TODO: how should i handle non-ints?
      // TODO: is retular math sufficient for such large numbers, or do i have to use a bigint lib or decimal lib or something?
      // TODO: does it matter if my remainder ever hits exactly 0? (maybe... write tests!)
      let newRem = remainder[dim.axis] % dim.sizeWithPad
      let count = (remainder[dim.axis] - newRem) / dim.sizeWithPad
      if (nextDim && count >= nextDim.rollupCnt) {
        const max = nextDim.rollupCnt - 1
        const diff = count - max
        count = max
        newRem += dim.sizeWithPad * diff
      }
      second.push(Math.max(0, count))
      remainder[dim.axis] = newRem
    }
    return { second, remainder }
  }

  printableNearestSecond(x, y) {
    const nearest = this.nearestSecond(x, y)
    const values = nearest.second
    const segments = []
    let nonZeroFound = false
    for (let i = 0; i < this.#dims.length; i++) {
      if (nonZeroFound || values[i] > 0) {
        nonZeroFound = true
        segments.push(`${values[i]} ${this.#dims[i].name}`)
      }
    }
    segments.push(`remainder (${nearest.remainder.x}, ${nearest.remainder.y})`)
    return segments.join(', ')
  }

  *secondsBetween(sec1, sec2) {
    let s = sec1
    while (compareSeconds(s, sec2) <= 0) {
      yield s
      s = this.increment(s)
    }
  }

  *visibleSecondsBetween(sec1, sec2) {
    const leftBound = this.xs(sec1)
    const rightBound = this.xs(sec2)
    const lowerBound = this.ys(sec2)

    let s = sec1
    while (true) {
      yield s
      s = this.incrementX(s)
      if (!s || this.compareSecondsXY(rightBound, s).x > 0) { // jump to next line down
        const below = this.incrementY(s)
        if (!below) break
        s = sumElements(leftBound, this.ys(below))
        if (this.compareSecondsXY(lowerBound, s).y > 0) break
      }
    }
  }

  incrementInAxis(axis, sec) {
    // degenerate case
    if (this.#dims.length === 1 && this.#dims[0].axis !== axis) return null

    const newSec = [...sec]
    for (let i = this.#dims.length - 1, j = 0; i >= 0; i--, j++) {
      if (this.#dims[i].axis != axis) continue
      const nextDim = this.#dims[i-1]
      const nextAlignedDim = this.#dims[i-2]
      newSec[i]++
      if (nextDim === undefined || newSec[i] < nextDim.rollupCnt) {
        break
      }
      if (!nextAlignedDim) {
        return null
      }
      newSec[i] = 0
    }
    return newSec
  }

  incrementX(sec) {
    return this.incrementInAxis('x', sec)
  }

  incrementY(sec) {
    return this.incrementInAxis('y', sec)
  }

  increment(sec) {
    const newSec = [...sec]
    for (let i = this.#dims.length - 1; i >= 0; i--) {
      const nextDim = this.#dims[i-1]
      newSec[i]++
      if (nextDim === undefined || newSec[i] < nextDim.rollupCnt) {
        break
      }
      newSec[i] = 0
    }
    return newSec
  }

  // toSec left of fromSec ==> x: -1
  // toSec right of fromSec ==> x: 1
  // toSec neither L nor R of fromSec ==> x: 0
  // toSec above fromSec ==> y: -1
  // toSec below fromSec ==> y: 1
  // toSec neither above nor below fromSec ==> y: 0
  compareSecondsXY(fromSec, toSec) {
    const result = { x: 0, y: 0 }
    for (let i = 0; i < fromSec.length; i++) {
      const axis = this.#dims[i].axis
      if (result[axis] != 0) continue
      if (toSec[i] < fromSec[i]) result[axis] = -1
      else if (toSec[i] > fromSec[i]) result[axis] = 1
      if (result.x != 0 && result.y != 0) break
    }
    return result
  }

  project(axis, sec) {
    return sec.map((val, i) => this.#dims[i].axis === axis ? val : 0)
  }

  xs(sec) {
    return this.project('x', sec)
  }

  ys(sec) {
    return this.project('y', sec)
  }

  s(partialSec) {
    const fullSec = new Array(this.#dims.length).fill(0);
    for (let p = partialSec.length - 1, f = fullSec.length - 1; p >= 0; p--, f--) {
      fullSec[f] = partialSec[p]
    }
    return fullSec
  }

  // both seconds can be partials
  sum(sec1, sec2) {
    const res = this.s(sec1)
    const remainders = this.s(sec2)
    for (let i = remainders.length - 1; i > 0; i--) {
      const nextDim = this.#dims[i-1]
      const sum = res[i] + remainders[i]
      const quotient = Math.floor(sum / nextDim.rollupCnt)
      const remainder = sum % nextDim.rollupCnt
      res[i] = remainder
      remainders[i-1] += quotient
    }
    res[0] += remainders[0]
    return res
  }
}

let geo = Geometry.withSecondDims(16, 128, 2)
geo.addDimension('minute', 60, 8)
geo.addDimension('hour', 60, 64)
geo.addDimension('day', 24, 536)
geo.addDimension('week', 7, 2574)
geo.addDimension('year', 52, geo.lastDim.pad * 4)
geo.addDimension('century', 100, geo.lastDim.pad * 30)
geo.addDimension('millenium', 10, geo.lastDim.pad * 5)
geo.addDimension('e5', 100, geo.lastDim.pad * 5)
geo.addDimension('e7', 100, geo.lastDim.pad * 5)
geo.addDimension('e9', 100, geo.lastDim.pad * 5)
let geoSub = geo.subGeo()
let subOpacity = 0
const geoSecond = geo
const geoMinute = geo.subGeo()
const geoHour = geoMinute.subGeo()
const geoDay = geoHour.subGeo()
const geoWeek = geoDay.subGeo()
const geoYear = geoWeek.subGeo()
const geoCentury = geoYear.subGeo()
const geoMillenium = geoCentury.subGeo()
const geoE5 = geoMillenium.subGeo()
const geoE7 = geoE5.subGeo()
const geoE9 = geoE7.subGeo()


window.rescale = () => {
  // TODO: rescale everything such that the canvas becomes 1:1 with the viewport.  i.e. p0int becomes [0,0] and p1int becomes [width,height].
  // ACTUALLY, do i even need to?  things are now working as-is!  i've got some extreme numbers involved in some of the math, but if it ain't broke, go work on something more interesting
}

const svgRenderer = function() {
  const svg = d3.create("svg")
  // TODO: this width/height global variable usage is going to bite eventually
      .attr("viewBox", [0, 0, width, height]);

  let talliesGroup = svg.append("g")
  let tallies = talliesGroup.selectAll('rect')
  let tallyLabels = talliesGroup.selectAll('text')

  let subTalliesGroup = svg.append("g")
  let subTallies = subTalliesGroup.selectAll('rect')

  // TODO: feels wrong to have to pass in visibleSubSecs... but is it? maybe not. this function gets called even when the zoom doesn't change. we want to be able to keep visible{Secs,SubSecs,SubSubSecs,...} in state and not recalculate them each time this is called.  and this should be a pure function (essentially, but not really, because it's updating a dom element), so it shouldn't be keeping that state.
  function draw(visibleSecs, visibleSubSecs, nowSec, curTransform) {
    tallies = tallies.data(visibleSecs, d => d)
      .join(enter => enter.append('rect'))
      .attr('fill', sec => compareSeconds(sec, nowSec) > 0 ? 'lightgray' : 'black')
      .attr('width', _sec => curTransform.k * geo.baseDim.width)
      .attr('height', _sec => curTransform.k * geo.baseDim.height)
      // could use a `.attr` for each of `x` and `y`, but using `.each` allows us to reuse
      // the result of the `geo.locationOf` calculation
      .each((sec, i, nodes) => {
        const l = geo.locationOf(sec)
        // `nodes[i]` is the actual DOM node in question, not the D3 selection,
        // so must use `.setAttribute` as opposed to `.attr`
        nodes[i].setAttribute('x', curTransform.applyX(l.x))
        nodes[i].setAttribute('y', curTransform.applyY(l.y))
      })
    tallyLabels = tallyLabels.data(visibleSecs, d => d)
      .join(enter => enter.append('text'))
      .attr('style', sec => {
        const l = geo.locationOf(sec)
        const x = curTransform.applyX(l.x)
        const y = curTransform.applyY(l.y)
        const scale = 0.55 * curTransform.k
        return `transform: rotate(90deg) scale(${scale}) translate(${y/scale + 7}px, -${x/scale + 9}px)`
      })
      .attr('fill', 'yellow')
      .text(sec => sec)
    // TODO: make tally labels human-friendly
    subTallies = subTallies.data(visibleSubSecs, d => d)
      .join(enter => enter.append('rect'))
      .attr('fill', sec => compareSeconds(sec, nowSec) > 0 ? 'lightgray' : 'black')
      .attr('fill-opacity', subOpacity)
      .attr('width', _sec => curTransform.k * geoSub.baseDim.width)
      .attr('height', _sec => curTransform.k * geoSub.baseDim.height)
      // could use a `.attr` for each of `x` and `y`, but using `.each` allows us to reuse
      // the result of the `geoSub.locationOf` calculation
      .each((sec, i, nodes) => {
        const l = geoSub.locationOf(sec)
        // `nodes[i]` is the actual DOM node in question, not the D3 selection,
        // so must use `.setAttribute` as opposed to `.attr`
        nodes[i].setAttribute('x', curTransform.applyX(l.x))
        nodes[i].setAttribute('y', curTransform.applyY(l.y))
      })
  }

  return {
    zoomable: svg,
    node: svg.node(),
    draw,
  }
}

const canvasRenderer = function() {
  // courtesy of https://github.com/observablehq/stdlib/blob/7f0f870/src/dom/context2d.js
  function context2d(width, height, dpi) {
    if (dpi == null) dpi = devicePixelRatio;
    var canvas = document.createElement("canvas");
    canvas.width = width * dpi;
    canvas.height = height * dpi;
    canvas.style.width = width + "px";
    var context = canvas.getContext("2d");
    context.scale(dpi, dpi);
    return context;
  }

  // TODO: this width/height global variable usage is going to bite eventually
  const context = context2d(width, height)

  function draw(visibleSecs, visibleSubSecs, nowSec, curTransform) {
    context.clearRect(0, 0, width, height);
    const tallyWidth = curTransform.k * geo.baseDim.width
    const tallyHeight = curTransform.k * geo.baseDim.height
    for (const sec of visibleSecs) {
      const l = geo.locationOf(sec)
      const x = curTransform.applyX(l.x)
      const y = curTransform.applyY(l.y)
      context.fillStyle = compareSeconds(sec, nowSec) > 0 ? 'lightgray' : 'black'
      context.fillRect(x, y, tallyWidth, tallyHeight)
    }
    // TODO: subsecs, text labels
  }

  return {
    zoomable: d3.select(context.canvas),
    node: context.canvas,
    draw,
  }
}

const simpleZoom = function() {
  let { zoomable, node, draw } = svgRenderer()
  // let { zoomable, node, draw } = canvasRenderer()

  let curTransform = d3.zoomIdentity
  let visibleSecs = []
  let visibleSubSecs = []
  const unixEpoch = [13,70,0,0,0,0,0,0,0,0,0]
  // TODO: less-granular geometries can be aware of more-granular ones so they can be drawn with semi-filled parts.  maybe it's time to put the drawing logic in Geometry?  or maybe not.


  // TODO: might eventually need general functions for translating (both ways?) between Date and second-as-array
  const calcNowSec = () => geoSecond.sum(unixEpoch, [Math.floor(Date.now() / 1000)])

  let nowSec = calcNowSec()
  let totalSecElapsed = 0
  // TODO: be smart about killing the timer if all visible seconds are in the past
  // also change redraw threshold check based on zoom.  e.g. if we're zoomed out far enough to not see individual seconds,
  // then we don't need to redraw each second.  maybe each minute or hour or week.  not quite as simple as just looking at
  // the resolution of the current geo, because we want to draw partial tallies soon, so it might be something like taking
  // one or two steps finer resolution from current geo and using that as the threshold granularity.
  d3.timer((msElapsed) => {
    const secElapsed = Math.floor(msElapsed / 1000)
    if (totalSecElapsed != secElapsed) {
      totalSecElapsed = secElapsed
      nowSec = calcNowSec()
      draw(visibleSecs, visibleSubSecs, nowSec, curTransform)
    }
  });


  // TODO: maybe just draw this in a <p> that hovers over the rest of the DOM in the top-left or something.
  // let lastUpdate = 0
  //
  // d3.timer(() => {
  //   let now = Date.now()
  //   let fps = Math.round(10000 / (now - lastUpdate)) / 10
  //   lastUpdate = now
  //   // console.log(fps)
  //   fpsText = fpsText.data([fps], d=>0)
  //     .join(enter => enter.append('text'))
  //     .attr('style', 'transform: scale(3) translate(5px, 20px)')
  //     .attr('fill', 'green')
  //     .text(fps => `FPS: ${fps}`)
  // })

  const geoBreakpoints = [
    // seconds
    0.300000000,
    // seconds + minutes
    0.200000000,
    // minutes
    0.100000000,
    // minutes + hours
    0.050000000,
    // hours
    0.010000000,
    // hours + days
    0.005000000,
    // days
    0.003000000,
    // days + weeks
    0.001000000,
    // weeks
    0.000500000,
    // weeks + years
    0.000300000,
    // years
    0.000100000,
    // years + centuries
    0.000050000,
    // centuries
    0.000008000,
    // centuries + millenia
    0.000005000,
    // millenia
    0.000000800,
    // millenia + e5s
    0.000000500,
    // e5s
    0.000000080,
    // e5s + e7s
    0.000000050,
    // e7s
    0.000000008,
    // e7s + e9s
    0.000000005,
    // e9s
  ]

  // I know there's no way I'll understand this code even a week from now.
  // Basically, I was writing a giant if-elif-else statement for setting `geo`
  // and `geoSub` and `subOpacity`, and i decided i needed a more concise way,
  // so I came up with geoPairs and geosForK
  const geoPairs = (() => {
    const alwaysZero = _k => 0
    const subGeoOpacity = (gbHigh, gbLow) => k => (gbHigh - k) / (gbHigh - gbLow)
    const res = [[geoSecond, null, alwaysZero]]
    for (let i = 1; i <= geoBreakpoints.length; i++) {
      if (i % 2) {
        const prevGeo = res[i-1][0]
        res.push([prevGeo, prevGeo.subGeo(), subGeoOpacity(geoBreakpoints[i-1], geoBreakpoints[i])])
      } else {
        const prevSubGeo = res[i-1][1]
        res.push([prevSubGeo, null, alwaysZero])
      }
    }
    return res
  })()

  function geosForK(k) {
    let idx = 0
    while (idx < geoBreakpoints.length) {
      if (k > geoBreakpoints[idx]) break
      idx++
    }
    return geoPairs[idx]
  }

  function zoomed({transform}) {
    const k = transform.k
    console.log(k)
    // TODO: I have a feeling i'll eventually want to make this a little more
    // sophisticated, e.g. instead of a fixed set of k-thresholds, factor in
    // the viewport size.  smaller size might mean i can get away with finer
    // resolution for a more zoomed-out perspective?
    // or see how big `visibleSecondsBetween` is and step up if it's beyond some
    // threshold (but this might fail for really fast zoom-outs).  or calculate
    // framerate and adjust based on that (but this might make it too frenetic).
    // actually, fixed k-thresholds is probably the way, but they might be calculated
    // at boot based on viewport size (and maybe geometry parameters) and fixed from
    // then on out (or only adjusted if/when the viewport is resized).
    let soCalc
    [geo, geoSub, soCalc] = geosForK(k)
    subOpacity = soCalc(k)

    const p0int = [
      Math.trunc(transform.invertX(0)),
      Math.trunc(transform.invertY(0)),
    ]
    const p1int = [
      Math.trunc(transform.invertX(width)),
      Math.trunc(transform.invertY(height)),
    ]
    console.log("P0:", p0int, geo.printableNearestSecond(...p0int))
    console.log("P1:", p1int, geo.printableNearestSecond(...p1int))

    const firstSec = geo.nearestSecond(...p0int)
    const lastSec = geo.nearestSecond(...p1int)

    visibleSecs = [...geo.visibleSecondsBetween(firstSec.second, lastSec.second)]
    let debugMsg = `num ${geo.baseDim.name}s: ${visibleSecs.length}`
    if (geoSub) {
      const firstSubSec = geoSub.nearestSecond(...p0int)
      const lastSubSec = geoSub.nearestSecond(...p1int)
      visibleSubSecs = [...geoSub.visibleSecondsBetween(firstSubSec.second, lastSubSec.second)]
      debugMsg += ` (+ ${visibleSubSecs.length} ${geoSub.baseDim.name}s)`
    } else {
      visibleSubSecs = []
    }
    console.log(debugMsg)

    curTransform = transform
    draw(visibleSecs, visibleSubSecs, nowSec, curTransform)
  }


  const zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    //.scaleExtent([1, 8])
    .on("zoom", zoomed)

  const initialLoc = geo.locationOf(nowSec)
  zoomable
    .call(zoom)
    // .call(zoom.transform, d3.zoomIdentity)
    .call(zoom.transform, d3.zoomIdentity.scale(0.5).translate(-initialLoc.x,-initialLoc.y))
  // TODO: set initial scale/translate to something that _includes_ initialLoc, but isn't precisely at it.
  // e.g. "truncate" to the beginning of the day, and scale appropriately to see the whole day.  that scale
  // probably depends on the dims of the viewport.

  return node;
}

function runTests() {

  // ===================================
  // UTILITY FUNCTIONS
  // ===================================
  function assert(errMsgIfFailed) {
    if (errMsgIfFailed) throw new Error(errMsgIfFailed)
    console.log('SUCCESS')
  }

  function xyEqual(xyRes, xyExp) {
    if (xyRes.x !== xyExp.x || xyRes.y !== xyExp.y) {
      return `compareSecondsXY is busted. exp: ${JSON.stringify(xyExp)}, res: ${JSON.stringify(xyRes)}`
    }
  }

  function secondsEqual(s1, s2) {
    if (compareSeconds(s1, s2) !== 0) return `seconds differ: ${JSON.stringify(s1)} <> ${JSON.stringify(s2)}`
  }

  function arrayOfSecondsEqual(a1, a2) {
    if (a1.length !== a2.length) return 'arrays different lengths'
    for (let i = 0; i < a1.length; i++) {
      const errRes = secondsEqual(a1[i], a2[i])
      if (errRes) return errRes
    }
  }

  function equal(v1, v2) {
    if (v1 != v2) return `values differ: ${v1} <> ${v2}`
  }

  // ===================================
  // Geometry
  // ===================================
  const geo0 = Geometry.withSecondDims(16, 128, 2)
  geo0.addDimension('minute', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('hour', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('day', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('week', 7, geo0.lastDim.pad * 2)

  assert(equal(geo0.valueOfSecond([0,1,0,2,3]), 3+2*4+1*4*4*4))

  assert(xyEqual(geo0.compareSecondsXY([0,0,0,58,59], [0,0,0,59,0]), { x: -1, y: 1 }))
  assert(xyEqual(geo0.compareSecondsXY([0,0,0,59,0], [0,0,0,59,1]), { x: 1, y: 0 }))
  assert(xyEqual(geo0.compareSecondsXY([0,0,0,59,59], [0,0,1,0,0]), { x: 1, y: -1 }))

  assert(arrayOfSecondsEqual(
    [...geo0.secondsBetween([0,0,2,3,2], [0,0,3,1,1])],
    [
      [0,0,2,3,2], [0,0,2,3,3], [0,0,3,0,0], [0,0,3,0,1],
      [0,0,3,0,2], [0,0,3,0,3], [0,0,3,1,0], [0,0,3,1,1]
    ]
  ))

  assert(secondsEqual(sumElements([0,20,3,5], [0,1,0,15]), [0,21,3,20]))

  assert(secondsEqual(geo0.sum([0,0,0,0,0], [2]), [0,0,0,0,2]))
  assert(secondsEqual(geo0.sum([0,0,0,0,0], [2,2]), [0,0,0,2,2]))
  assert(secondsEqual(geo0.sum([0,0,0,0,0], [4]), [0,0,0,1,0]))
  assert(secondsEqual(geo0.sum([0,1,2,2,2], [4]), [0,1,2,3,2]))
  assert(secondsEqual(geo0.sum([0,1,2,2,2], [16]), [0,1,3,2,2]))
  assert(secondsEqual(geo0.sum([0,1,2,3,2], [17]), [0,1,3,3,3]))
  assert(secondsEqual(geo0.sum([1,6,3,3,3], [1]), [2,0,0,0,0]))

  assert(secondsEqual(geo0.incrementX([1,1,1,1,1]), [1,1,1,1,2]))
  assert(secondsEqual(geo0.incrementX([1,1,1,1,3]), [1,1,2,1,0]))
  assert(secondsEqual(geo0.incrementX([1,1,3,1,3]), [2,1,0,1,0]))

  assert(secondsEqual(geo0.incrementY([1,1,1,1,1]), [1,1,1,2,1]))
  assert(secondsEqual(geo0.incrementY([1,1,1,3,1]), [1,2,1,0,1]))
  assert(geo0.incrementY([1,6,1,3,1]) && 'incrementY is busted')

  assert(arrayOfSecondsEqual(
    [...geo0.visibleSecondsBetween([0,0,2,2,2], [1,1,1,0,1])],
    [
      ...geo0.secondsBetween([0,0,2,2,2], [0,0,2,2,3]),
      ...geo0.secondsBetween([0,0,3,2,0], [0,0,3,2,3]),
      ...geo0.secondsBetween([1,0,0,2,0], [1,0,0,2,3]),
      ...geo0.secondsBetween([1,0,1,2,0], [1,0,1,2,1]),

      ...geo0.secondsBetween([0,0,2,3,2], [0,0,2,3,3]),
      ...geo0.secondsBetween([0,0,3,3,0], [0,0,3,3,3]),
      ...geo0.secondsBetween([1,0,0,3,0], [1,0,0,3,3]),
      ...geo0.secondsBetween([1,0,1,3,0], [1,0,1,3,1]),

      ...geo0.secondsBetween([0,1,2,0,2], [0,1,2,0,3]),
      ...geo0.secondsBetween([0,1,3,0,0], [0,1,3,0,3]),
      ...geo0.secondsBetween([1,1,0,0,0], [1,1,0,0,3]),
      ...geo0.secondsBetween([1,1,1,0,0], [1,1,1,0,1]),
    ]
  ))

  const geo = Geometry.withSecondDims(16, 128, 2)
  geo.addDimension('minute', 60, 8)
  geo.addDimension('hour', 60, 64)
  geo.addDimension('day', 24, 536)
  geo.addDimension('week', 7, 2574)
  geo.addDimension('year', 52, geo.lastDim.pad * 4)
  geo.addDimension('century', 100, geo.lastDim.pad * 30)
  geo.addDimension('millenium', 10, geo.lastDim.pad * 5)
  geo.addDimension('e5', 100, geo.lastDim.pad * 5)
  geo.addDimension('e7', 100, geo.lastDim.pad * 5)
  geo.addDimension('e9', 100, geo.lastDim.pad * 5)

  const pointInPadding = geo.nearestSecond(6067, 8312)
  assert(secondsEqual(pointInPadding.second, geo.s([5,59,19])))
  assert(xyEqual(pointInPadding.remainder, {x: 15, y: 288}))

  assert(arrayOfSecondsEqual(
    [...geo.visibleSecondsBetween(geo.s([58,42]), geo.s([1,1,0,8]))],
    [
      ...geo.secondsBetween(geo.s([58,42]), geo.s([58,59])),
      ...geo.secondsBetween(geo.s([1,58,0]), geo.s([1,58,8])),

      ...geo.secondsBetween(geo.s([59,42]), geo.s([59,59])),
      ...geo.secondsBetween(geo.s([1,59,0]), geo.s([1,59,8])),

      ...geo.secondsBetween(geo.s([1,0,0,42]), geo.s([1,0,0,59])),
      ...geo.secondsBetween(geo.s([1,1,0,0]), geo.s([1,1,0,8])),
    ]
  ))
}

runTests()


const appDiv = document.getElementById('app')
const svg = simpleZoom()
appDiv.appendChild(svg)
