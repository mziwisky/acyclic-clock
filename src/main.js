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
import { Geometry } from './geometry'
import { svgRenderer } from './svg-renderer'
import { canvasRenderer } from './canvas-renderer'

// TODO: this width/height global variable usage is going to bite eventually
const width = 600
const height = 600

// e9Width = e7Width = 2595632000
// e9Height = e7Height * 100 + e7PadY * 99 = 150743230000
// that gets us to the padding between "tallies" of 1BB years.  we need 13.7 of those, which gives a total canvas size of:
// 38,848,498,000 x 150,743,230,000
//
//
// https://observablehq.com/@fil/height#height <-- eventually might want that, to get (and be responsive to changes in?) the viewport height.

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

const doDatThang = function() {
  let { zoomable, node, draw } = svgRenderer(width, height)
  // let { zoomable, node, draw } = canvasRenderer(width, height)

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
      draw(geo, geoSub, subOpacity, visibleSecs, visibleSubSecs, nowSec, curTransform)
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
    draw(geo, geoSub, subOpacity, visibleSecs, visibleSubSecs, nowSec, curTransform)
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

const appDiv = document.getElementById('app')
const theGoods = doDatThang()
appDiv.appendChild(theGoods)
