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
// i think first draft might have to be just a linear plot of seconds.  or something.  i just don't know how to keep track of what "year" it was 1e16 seconds ago.  i guess i could use some kind of approximation.  but either way, when you zoom down to a second, each one will get labeled.  NO!  i think the axis-alternating characteristic is a crucial one, because it means at whatever scale you're at, you can pan in either dimension and see sensible time steps.
//
// TODO NEXT:
// [x] make a demo that displays the [x0, y0, x1, y1] bounding box coordinates of the viewport, and lets it go out as far as the "total canvas size" below, and only in as far as 1 pixel per pixel.  this might just be https://observablehq.com/@d3/x-y-zoom?collection=@d3/d3-zoom -- not sure if the usage of d3-axis is necessary or not, but it might be the most efficient (assuming i can get current viewport bounds programmatically from each axis object?  i'll need those to do culling, and i'll need the scale to eventually decide what "resolution" of tallies to draw, but that's not part of this demo.)
// [ ] i did the display of the bounding box coordinates of the viewport, now do the bit above about the setting bounding limits to "total canvas size" and 1 pixel per pixel (no negative numbers, i guess)

import * as d3 from 'd3'
import {tile as d3tile} from 'd3-tile'

const width = 600
const height = 600
const MAX_DEPTH = 14 // empirically found, when scaleExtent is 1<<22

// Drawing params
const secondSize = [16, 128]
const secondPadX = 2 // this is the limiting dimension.  may as well divide everything by 2 after i'm done w/ all this. OH BUT WAIT, if i add milliseconds, then msPadY will become limiting.
const minutePadY = 8 // TODO: play w/ making this 8x secondPadX
// minuteWidth = secondWidth * 60 + secondPadX * 59 = 1078
// minuteHeight = secondHeight = 128
const hourPadX = 64 // happens to be 8x minutePad
// hourWidth = minuteWidth = 1078
// hourHeight = minuteHeight * 60 + minutePadY * 59 = 8152
const dayPadY = 536 // TODO: any good reason to make this (and the rest) a power of 2? NOTE: this is about 8x hourPadX
// dayWidth = hourWidth * 24 + hourPadX * 23 = 27344
// dayHeight = hourHeight = 8152
// scaled-down day height = 76, pad = 5.  so real day pad = 5*(8152/76) =~ 536
const weekPadX = 2574 // TODO: maybe 4x dayPadY??
// weekWidth = dayWidth = 27344
// weekHeight = dayHeight * 7 + dayPadY * 6 = 60280
const yearPadY = 4 * weekPadX // 10296
// yearWidth = weekWidth * 52 + weekPadX * 51 = 1553162
// yearHeight = weekHeight = 60280
const centuryPadX = 30 * yearPadY // 308880
// centuryWidth = yearWidth = 1553162
// centuryHeight = yearHeight * 100 + yearPadY * 99 = 7047304
const milenniumPadY = 5 * centuryPadX // 1544400
// milenniumWidth = centuryWidth * 10 + centuryPadX * 9 = 18311540
// milenniumHeight = centuryHeight = 7047304
const e5PadX = 5 * milenniumPadY // 7722000
// e5Width = milenniumWidth = 18311540
// e5Height = milenniumHeight * 100 + milenniumPadY * 99 = 1469208400
const e7PadY = 5 * e5PadX // 38610000
// e7Width = e5Width * 100 + e5PadX * 99 = 2595632000
// e7Height = e5Height = 1469208400
const e9PadX = 5 * e7PadY // 193050000
// e9Width = e7Width = 2595632000
// e9Height = e7Height * 100 + e7PadY * 99 = 150743230000
// that gets us to the padding between "tallies" of 1BB years.  we need 13.7 of those, which gives a total canvas size of:
// 38,848,498,000 x 150,743,230,000
//
//
// https://observablehq.com/@fil/height#height <-- eventually might want that, to get (and be responsive to changes in?) the viewport height.

function wat([x0,y0, x1,y1]) {
  // give me a bounding box of the canvas.  i know the screen size (it may change over time).
  // i'll return a description of what should be drawn.  e.g.:
  // ...?
  //
  //let's say we're given a point, x,y.  we should be able to say... something, right?
  //
  //let's say we stop at years.  years are horizontal bars, stacked vertically, so we have a big huge vertical stack of years.
  //let's say we have just 1000 years.  that's all of history.
  //"canvas" size is yearWidth x (1000*yearHeight+999*yearPadY) = 1,553,162 x 368,851,120
  //given a point, [50000, 500000]... what do we know? start w/ Y (because that's our coarsest grain, years). 500000/(yearHeight+yearPadY) = 500000/70576 = 7.08 = 7 R 5968
  //then switch axis to X -- 50000/(weekWidth+weekPadX) = 50000/29918 = 1.67123471 = 1 R 20082
  //so so far, 7 years 1 week and change.  now to days with the Y-remainder:
  //5968/(dayHeight+dayPadY) = 5968/8688 = 0 R 5968
  //X-remainder: 20082/(hourWidth+hourPadX) = 20082/1142 = 17.58 = 17 R 668
  //7 years, 1 week, 0 days, 17 hours
  //Y-remainder: 5968/(minuteHeight+minutePadY) = 5968/136 = 43.88235294 = 43 R 120
  //X-remaincer: 668/(secondWidth+secondPadX) = 668/18 = 37.11111111 = 37 R 2
  //7 years, 1 week, 0 days, 17 hours, 43 minutes, 37 seconds.
  //This is the second tally that we're "at" (i.e., its top-left corner is the nearest one that's above and left of us)
  //
  //ok, so i'm going to end up with 4 such numbers, one for each corner of the bounding box... then what?
  //then i have to decide what tallies get drawn, and where they get drawn.
  //the top-left and bottom-right corners dictate upper and lower bounds of tallies to consider, but there could be
  //a huge timespan there, even if we're zoomed in far, because we could be zoomed in to, e.g., a millenium boundary.
  //the "k" value should tell us what resolution we're dealing with (once i empirically pick an appropriate mapping of k to resolution)
  //or i suppose i could infer it from the bounding box, too.  in fact, that plus screen size
  //should allow me to do something smart.  e.g. if i've got 360000 pixels of screen and i'm trying to render 360000 pixels of canvas, then i'm gonna be drawing seconds.  but at 40000 pixels of screen and 360000 pixels of canvas, i might only be drawing down to minutes or hours.
}


class Geometry {
  #dims = []

  constructor(secWidth, secHeight, secPad) {
    this.#dims.push({
      name: 'second',
      rollupCnt: null,
      width: secWidth,
      height: secHeight,
      pad: secPad,
      sizeWithPad: secWidth + secPad,
      axis: 'x', // the axis along which we step to draw each tally
    })
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
    this.#dims.push(newDim)
  }

  get dims() {
    return this.#dims // TODO: clone?
  }

  get lastDim() {
    return this.#dims[this.#dims.length - 1]
  }

  locationOf(sec) {
    const len = this.#dims.length
    const result = { x: 0, y: 0 }
    for (let sIdx = 0, dIdx = len - 1; sIdx < len; sIdx++, dIdx--) {
      const dim = this.#dims[dIdx]
      result[dim.axis] += sec[sIdx] * dim.sizeWithPad
    }
    return result
  }

  nearestSecond(x, y) {
    const second = []
    const remainder = { x, y }
    for (let i = this.#dims.length-1; i >= 0; i--) {
      const dim = this.#dims[i]
      // TODO: how should i handle non-ints?
      // TODO: how should i handle negative nums?  probably throw exception... i want upper-left of canvas to be considered 0,0
      // TODO: is retular math sufficient for such large numbers, or do i have to use a bigint lib or decimal lib or something?
      // TODO: does it matter if my remainder ever hits exactly 0? (maybe... write tests!)
      // TODO: does it matter if i end up in the padding or not? IT DOES!  i can get weird-sounding results like "5 hour, 61 minute, 19 second" because the empty space after the 60th minute is quite large, because it's REALLY the padding for days, i.e. you can fit several more minutes-with-padding in there. (see gimp day-of-seconds file for example, notice you could fit about 4 second-tallies in the hour padding space.) so i think if i get a resul like "62 minute (y-remainder = Y)", i want to actually modify that to "60 minute (y-remainder = Y + 2*minuteSizeWithPad)".  i wonder if this is only a problem with seconds and minutes, because they're the smallest dims in each axis, or if it's all the way up the stack? ANS: all the way up the stack.  i played around and saw a "53 week".
      // console.log("dim", dim.name, dim.axis, dim.sizeWithPad)
      const newRem = remainder[dim.axis] % dim.sizeWithPad
      // const count = (remainder[dim.axis] - newRem) / dim.sizeWithPad
      // console.log(remainder[dim.axis], '/', dim.sizeWithPad, '=', count, 'R', newRem)
      second.push((remainder[dim.axis] - newRem) / dim.sizeWithPad)
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
        const dim = this.#dims[this.#dims.length - 1 - i]
        segments.push(`${values[i]} ${dim.name}`)
      }
    }
    segments.push(`remainder (${nearest.remainder.x}, ${nearest.remainder.y})`)
    return segments.join(', ')
  }

  // sec1 < sec2 ==> -1
  // sec1 = sec2 ==> 0
  // sec1 > sec2 ==> 1
  compare(sec1, sec2) {
    for (let i = 0; i < sec1.length; i++) {
      if (sec1[i] < sec2[i]) return -1
      if (sec1[i] > sec2[i]) return 1
    }
    return 0
  }

  *secondsBetween(sec1, sec2) {
    let s = sec1
    while (this.compare(s, sec2) <= 0) {
      yield s
      s = this.increment(s)
    }
  }

  increment(sec) {
    const newSec = [...sec]
    const len = this.#dims.length
    for (let dimIdx = 0, secIdx = len - 1; dimIdx < len; dimIdx++, secIdx--) {
      const nextDim = this.#dims[dimIdx+1]
      newSec[secIdx]++
      if (nextDim === undefined || newSec[secIdx] < nextDim.rollupCnt) {
        break
      }
      newSec[secIdx] = 0
    }
    return newSec
  }
}


const geo = new Geometry(16, 128, 2)
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

// console.log(geo.printableNearestSecond(50000, 500000))
console.log(geo.printableNearestSecond(6067, 8312))


const simpleZoom = function() {
  const randomX = d3.randomNormal(width / 2, 80);
  const randomY = d3.randomNormal(height / 2, 80);
  // const data = Array.from({length: 2000}, () => [randomX(), randomY()]);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  // const circle = svg.selectAll("circle")
  //   .data(data)
  //   .join("circle")
  //     .attr("transform", d => `translate(${d})`)
  //     .attr("r", 1.5);

  let talliesGroup = svg.append("g")
  let tallies = talliesGroup.selectAll('rect')

  const k = height / width
  const x = d3.scaleLinear()
    .domain([0, width])
    .range([0, width])
  const y = d3.scaleLinear()
    .domain([0 * k, height * k])
    .range([0, height])

  svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      //.scaleExtent([1, 8])
      .on("zoom", zoomed));

  function zoomed({transform}) {
    const xThing = transform.rescaleX(x)
    const yThing = transform.rescaleY(y)
    // console.log(`X: ${xThing.invert(0)}, ${xThing.invert(width)}`)
    // console.log(`Y: ${yThing.invert(0)}, ${yThing.invert(height)}`)
    const p0int = [
      Math.trunc(xThing.invert(0)),
      Math.trunc(yThing.invert(0)),
    ]
    const p1int = [
      Math.trunc(xThing.invert(width)),
      Math.trunc(yThing.invert(height)),
    ]
    console.log("P0:", p0int, geo.printableNearestSecond(...p0int))
    console.log("P1:", p1int, geo.printableNearestSecond(...p1int))

    const firstSec = geo.nearestSecond(...p0int)
    const lastSec = geo.nearestSecond(...p1int)

    // for (let s of geo.secondsBetween(firstSec.second, lastSec.second)) {
    //   console.log(s)
    // }
    const secs = [...geo.secondsBetween(firstSec.second, lastSec.second)]
    console.log(`num seconds: ${secs.length}`)

    tallies = tallies.data(secs, d => d)
      .join(enter => enter.append('g')
        .attr('transform', sec => { const l = geo.locationOf(sec); return `translate(${l.x}, ${l.y})` })
        .call(g => g.append('rect')
          .attr('fill', 'black')
          .attr('width', geo.dims[0].width)
          .attr('height', geo.dims[0].height))
        .call(rect => rect.append('text')
          .attr('style', 'transform: rotate(90deg) scale(0.6) translate(5px, -7px)')
          .attr('fill', 'yellow')
          .text(d => d))
      )

    // TODO: firstSec.remainder probably factors into the translate somehow. maybe involving something like:
    const tRem = transform.translate(firstSec.remainder.x, firstSec.remainder.y)
    console.log('tRem',tRem)
    // talliesGroup.attr("transform", `scale(${transform.k}) translate(${tRem.x},${tRem.y})`)
    talliesGroup.attr("transform", `scale(${transform.k}) translate(${transform.x},${transform.y})`)
    // talliesGroup.attr("transform", `scale(${transform.k})`)


    // TODO: get nearest second for lower-left and upper-right corners, too.
    // use those to calculate how many second tallies are in the bounding box.
    // should be a pretty quick calc, i think... i'm sure there's some algorithm
    // i can come up with to "understand" when we do things like skip across a
    // century pad or an e5 pad, etc.  the total number of second tallies might be
    // useful in deciding whether to just print minutes, or hours, or days, etc.
    // it's probably not the ONLY useful number, maybe not even the most significant
    // number, but it might weigh into that decision.  (i think the most useful one
    // will just be canvas area in pixels compared to viewport pixels)

    // circle.attr("transform", d => `translate(${transform.apply(d)})`);
  }

  return svg.node();
}

const simpleZoomWithAxes = () => {
  const width = 600, height = 480

  const k = height / width
  const x = d3.scaleLinear()
    .domain([-4.5, 4.5])
    .range([0, width])
  const y = d3.scaleLinear()
    .domain([-4.5 * k, 4.5 * k])
    .range([height, 0])
  // const z = d3.scaleOrdinal()
  //   .domain(data.map(d => d[2]))
  //   .range(d3.schemeCategory10)

  const xAxis = (g, x) => g
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisTop(x).ticks(12))
    .call(g => g.select(".domain").attr("display", "none"))

  const yAxis = (g, y) => g
    .call(d3.axisRight(y).ticks(12 * k))
    .call(g => g.select(".domain").attr("display", "none"))

  const grid = (g, x, y) => g
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .call(g => g
      .selectAll(".x")
      .data(x.ticks(12))
      .join(
        enter => enter.append("line").attr("class", "x").attr("y2", height),
        update => update,
        exit => exit.remove()
      )
        .attr("x1", d => 0.5 + x(d))
        .attr("x2", d => 0.5 + x(d)))
    .call(g => g
      .selectAll(".y")
      .data(y.ticks(12 * k))
      .join(
        enter => enter.append("line").attr("class", "y").attr("x2", width),
        update => update,
        exit => exit.remove()
      )
        .attr("y1", d => 0.5 + y(d))
        .attr("y2", d => 0.5 + y(d)));

  const zoom = d3.zoom()
      .scaleExtent([0.5, 32])
      .on("zoom", zoomed);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const gx = svg.append("g");

  const gy = svg.append("g");

  const gGrid = svg.append("g");

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  // const gDot = svg.append("g")
  //     .attr("fill", "none")
  //     .attr("stroke-linecap", "round");

  // gDot.selectAll("path")
  //   .data(data)
  //   .join("path")
  //     .attr("d", d => `M${x(d[0])},${y(d[1])}h0`)
  //     .attr("stroke", d => z(d[2]));


  function zoomed({transform}) {
    console.log(transform)
    const zx = transform.rescaleX(x).interpolate(d3.interpolateRound);
    const zy = transform.rescaleY(y).interpolate(d3.interpolateRound);
    const xThing = transform.rescaleX(x)
    const yThing = transform.rescaleY(y)
    console.log(`X: ${xThing.invert(0)}, ${xThing.invert(width)}`)
    console.log(`Y: ${yThing.invert(0)}, ${yThing.invert(height)}`)
    // gDot.attr("transform", transform).attr("stroke-width", 5 / transform.k);
    gx.call(xAxis, zx);
    gy.call(yAxis, zy);
    gGrid.call(grid, zx, zy);
  }

  return Object.assign(svg.node(), {
    reset() {
      svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
    }
  });
}

const map = function() {
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const tiler = d3tile()
    .extent([[0, 0], [width, height]]); // <-- no clue what this does

  const zoom = d3.zoom()
    .scaleExtent([1 << 0, 1 << 28]) // <-- scale extents. if you make the upper limit too high, e.g. 1<<28, then zooming in really deep gets "jittery". feels like, theoretically, there should be a way to "reset" the zoom after a certain depth to make in-zooming effectively infinite. but i probably don't need that capability for this project anyway.
    .extent([[0, 0], [width, height]]) // <-- no clue what this does
    .on("zoom", (event) => zoomed(event.transform));

  const tileGroup = svg.append("g")
      .attr("pointer-events", "none")
      .attr("font-family", "var(--sans-serif)")
      .attr("font-size", 16);

  let tile = tileGroup.selectAll("g");

  svg
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity
        .translate(width >> 1, height >> 1)
        .scale(1 << 22)); // <-- initial scale

  function zoomed(transform) {
    console.log(transform)
    const tiles = tiler(transform);
    // console.log(tiles)
    // `tiles` is an array of 3-element arrays (the 3 numbers that get rendered on each square)
    // `tiles` also has a `scale` property which, as you zoom in, gets bigger and bigger until
    // you cross the threshold that splits the map into more tiles, at which point scale snaps to
    // a smaller number and then grows again.
    // `tiles` also has a `translate` property which is a pair of numbers that obviously has
    // something to do with where you're at in your translation.  that value also scales with
    // the zoom, and the numbers you get there are close to the first two numbers of the 0th 3-element
    // array.

    tileGroup.attr("transform", `
      scale(${tiles.scale})
      translate(${tiles.translate.join(",")})
    `);

    tile = tile.data(tiles, d => d).join(
      enter => enter.append("g")
        .attr("transform", ([x, y]) => `translate(${x}, ${y}) scale(${1 / 256})`)
        .call(g => g.append("rect")
          .attr("fill", d => d3.interpolateRainbow(hilbert(...d)))
          .attr("fill-opacity", 0.5)
          .attr("stroke", "black")
          .attr("width", 256)
          .attr("height", 256))
        .call(g => g.append("text")
          .attr("x", "0.4em")
          .attr("y", "1.2em")
          .text(d => d.join("/")))
        // .call(g => g.append(d => drawTile(...d)))
        // .call(g => g.append(d => circlesForDepth(d[2])))
    );
  }

  // programatic scale, animates to the resulting zoom
  // svg.transition().call(zoom.scaleBy, 20)
  return svg.node();
}

const SEC_SIZE = [200, 200]
const SEC_PAD = [0, 0]
const TILE_SIZE = 256

function drawTile(x,y,z) {
  // TODO: starting to think that tiles are unnecessary.... maybe all i need is zoom/translate.
  // i don't have multi-resolution jpegs here, i have dynamically generated bars.  at certain
  // thresholds (empirically chosen, i think), i need to convalesce finer bars into coarser ones.
  // but i don't think the abstraction of quad-tiles buys me anything.  in fact, it probably just
  // makes things harder.  (though it did help out with my napkin math about how deep my zoom depth
  // needed to go...)
  const group = d3.create('svg:g')
  if (z < 8) z = 8
  const inv_depth = MAX_DEPTH - z
  const scale = 2 ** inv_depth
  const step = TILE_SIZE / scale

  for (let i = 0; i < scale; i++) {
    for (let j = 0; j < scale; j++) {
      const x = SEC_PAD[0] / scale + step * i
      const y = SEC_PAD[1] / scale + step * j
      group.append('rect')
        .attr('fill', 'black')
        .attr('width', SEC_SIZE[0] / scale)
        .attr('height', SEC_SIZE[1] / scale)
        .attr('transform', `translate(${x}, ${y})`)
    }
  }
  return group.node()
}

// TODO: right now this increases num of circles as you zoom in. actually want it to decrease that number.
// and to position them where they came from in the "sub-tiles" that made up this tile
function circlesForDepth(depth) {
  const group = d3.create('svg:g')
  const spacing = 256 / (depth + 2)
  for (let i = 0; i <= depth; i++) {
    group.append("circle")
      .attr("cx", 128)
      .attr("cy", (i+1)*spacing)
      .attr("r", 100 * (depth+1) / MAX_DEPTH)
  }
  return group.node()
}


function hilbert(x, y, z) {
  let n = 1 << z, rx, ry, s, d = 0;
  for (s = n >> 1; s > 0; s >>= 1) {
    rx = (x & s) > 0;
    ry = (y & s) > 0;
    d += s * s * ((3 * rx) ^ ry);
    [x, y] = rot(n, x, y, rx, ry);
  }
  return d / (1 << z * 2);
}

function rot(n, x, y, rx, ry) {
  if (!ry) {
    if (rx) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    return [y, x];
  }
  return [x, y];
}

const appDiv = document.getElementById('app')
// const svg = map()
const svg = simpleZoom()
// const svg = simpleZoomWithAxes()
appDiv.appendChild(svg)

// // nevermind the dumb little experiment down here. thought maybe i could draw a huge, fully-detailed scene on a canvas and then just render a "viewport canvas" that's zoomed into a small window of it, but while it works in theory for smaller scenes, it's absolutely nowhere near feasible.
// const viewportCanvasWidth = 600
// const viewportCanvasHeight = 600
// const viewportCanvas = document.createElement('canvas')
// viewportCanvas.setAttribute('width', viewportCanvasWidth)
// viewportCanvas.setAttribute('height', viewportCanvasHeight)
// viewportCanvas.setAttribute('style', 'border: 1px solid')
//
// const dataCanvas = document.createElement('canvas')
// const dataCtx = dataCanvas.getContext("2d");
// dataCanvas.setAttribute('width', viewportCanvasWidth)
// dataCanvas.setAttribute('height', viewportCanvasHeight / 2)
// const w = 10, h = 10, hp = 2, vp = 5
// for (let i = 0; i < 100; i++) {
//   for (let j = 0; j < 100; j++) {
//     dataCtx.fillRect(i * (w+hp), j * (h + vp), w, h)
//   }
// }
//
// const viewportContext = viewportCanvas.getContext("2d");
// viewportContext.drawImage(dataCanvas, 0, 0, 600, 600, 0, 0, viewportCanvasWidth, viewportCanvasHeight)
//
// appDiv.appendChild(viewportCanvas)
