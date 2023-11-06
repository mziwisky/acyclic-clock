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
// assumes the seconds come from the same Geometry
function compareSeconds(sec1, sec2) {
  for (let i = 0; i < sec1.length; i++) {
    if (sec1[i] < sec2[i]) return -1
    if (sec1[i] > sec2[i]) return 1
  }
  return 0
}

function maxSecond(sec1, sec2) {
  if (compareSeconds(sec1, sec2) < 0) return sec2
  return sec1
}

function minSecond(sec1, sec2) {
  if (compareSeconds(sec1, sec2) < 0) return sec1
  return sec2
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
// geo = geo.subGeo()
// geo = geo.subGeo()

// const geo = Geometry.withSecondDims(16, 128, 2)
// geo.addDimension('minute', 4, geo.lastDim.pad * 3)
// geo.addDimension('hour', 4, geo.lastDim.pad * 3)
// geo.addDimension('day', 4, geo.lastDim.pad * 3)
// geo.addDimension('week', 7, geo.lastDim.pad * 3)


const simpleZoom = function() {
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  let talliesGroup = svg.append("g")
  let tallies = talliesGroup.selectAll('rect')

  const zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    //.scaleExtent([1, 8])
    .on("zoom", zoomed)

  svg
    .call(zoom)
    .call(zoom.transform, d3.zoomIdentity)
  // to set a new initial zoom, change the above line to something like:
  // .call(zoom.transform, d3.zoomIdentity
  //   .translate(someX, someY)
  //   .scale(someScale))
  // TODO: this breaks at large translations, e.g.:
  //   .call(zoom.transform, d3.zoomIdentity.translate(-10000000,-1000000000))
  // so i'm probably going to have to figure out some kind of "wrapping" at some point.
  // shit, and it'll probably break at very small scales (i.e. zoomed out), too. maybe d3-tile
  // really will save my ass... maybe i need to map the full "canvas" onto a quadtree of tiles.
  // that shouldn't be too hard, i suppose.  just figure out the math.

  function zoomed({transform}) {
    console.log(transform.k)
    // TODO: I have a feeling i'll eventually want to make this a little more
    // sophisticated, e.g. instead of a fixed set of k-thresholds, factor in
    // the viewport size.  smaller size might mean i can get away with finer
    // resolution for a more zoomed-out perspective?
    if (transform.k > 0.3) {
      geo = geoSecond
    } else if (transform.k > 0.05) {
      geo = geoMinute
    } else if (transform.k > 0.005) {
      geo = geoHour
    } else if (transform.k > 0.001) {
      geo = geoDay
    } else if (transform.k > 0.0003) {
      geo = geoWeek
    } else if (transform.k > 0.00005) {
      geo = geoYear
    } else if (transform.k > 0.00001) {
      geo = geoCentury
    } else if (transform.k > 0.000005) {
      geo = geoMillenium
    } else if (transform.k > 0.000001) {
      geo = geoE5
    } else if (transform.k > 0.0000005) {
      geo = geoE7
    } else {
      geo = geoE9
    }
    console.log(geo.baseDim.name)

    // let containerTransform = transform
    // let tallyTransform = d3.zoomIdentity
    let tallyScale = 1
    // while (containerTransform.k < 0.5) {
    //   containerTransform = containerTransform.scale(2)
    //   tallyScale *= 0.5
    // }
    // TODO: this idea seems like it's _kind of_ right... but you end up with really small tallyScale pretty fast, and that's probably a problem.  so next thing to try is to basically do this canvas-style -- don't use `transform` on `g` elements (or in `style`s?) but instead, calculate X, Y, width, and height of each tally on each invocation of this function.  similar to https://observablehq.com/@d3/zoom-canvas-rescaled?collection=@d3/d3-zoom.  then we hopefully won't get the artifacts that occur from tally `g`s not recalculating their transform until the `secs` data changes... or is that an orthogonal issue?  i don't know.  maybe so.  maybe i'll need to work the transforms into the `secs` data so that d3 sees it as a change.  also, not sure if the new approach will hurt performance, but i do think it's the only option once we move to canvas, so may as well get it figured out now with SVG because SVG is easier to debug/inspect in the DOM
    //
    // actually, from https://observablehq.com/@d3/zoom-svg-rescaled?collection=@d3/d3-zoom, maybe i don't have to shoehorn the transform into `secs` at all, i just have to call `.attr(A, fn)` for A='width', A='height', A='x', A='y', that way the data doesn't change, and therefore the DOM elements don't get replaced, but the attrs of the DOM elements do change.

    const p0int = [
      Math.trunc(transform.invertX(0)),
      Math.trunc(transform.invertY(0)),
    ]
    const p1int = [
      Math.trunc(transform.invertX(width)),
      Math.trunc(transform.invertY(height)),
    ]
    // console.log("P0:", p0int, geo.printableNearestSecond(...p0int))
    // console.log("P1:", p1int, geo.printableNearestSecond(...p1int))

    const firstSec = geo.nearestSecond(...p0int)
    const lastSec = geo.nearestSecond(...p1int)

    const secs = [...geo.visibleSecondsBetween(firstSec.second, lastSec.second)]
    console.log(`num seconds: ${secs.length}`)

    tallies = tallies.data(secs, d => d)
      .join(enter => enter.append('g')
        .attr('transform', sec => {
          const l = geo.locationOf(sec)
          // return `translate(${l.x}, ${l.y}) scale(${transform.k})`
          return `translate(${transform.applyX(l.x)}, ${transform.applyY(l.y)}) scale(${transform.k})`
        })
        .call(g => g.append('rect')
          .attr('fill', 'black')
          .attr('width', geo.baseDim.width)
          .attr('height', geo.baseDim.height))
        .call(rect => rect.append('text')
          .attr('style', 'transform: rotate(90deg) scale(0.6) translate(5px, -7px)')
          .attr('fill', 'yellow')
          .text(d => d))
      )

    // talliesGroup.attr("transform", containerTransform)
    tallies.attr('transform', sec => {
      const l = geo.locationOf(sec)
      return `translate(${transform.applyX(l.x)}, ${transform.applyY(l.y)}) scale(${transform.k})`
    })
  }

  return svg.node();
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

  // ===================================
  // Geometry
  // ===================================
  const geo0 = Geometry.withSecondDims(16, 128, 2)
  geo0.addDimension('minute', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('hour', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('day', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('week', 7, geo0.lastDim.pad * 2)

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

  assert(secondsEqual(maxSecond([0,0,58,0], [0,0,0,0]), [0,0,58,0]))
  assert(secondsEqual(minSecond([0,1,0,8], [0,1,0,0]), [0,1,0,0]))

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
