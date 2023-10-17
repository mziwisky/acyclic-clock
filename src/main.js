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
// [] make it, but only going back to like 10000 BCE and forward to 10000 CE
// [] 

import * as d3 from 'd3'
import {tile as d3tile} from 'd3-tile'

// trying to make https://observablehq.com/@d3/zoomable-tiles work, not sure how to do that without the Observable runtime...

const width = 600
const height = 600
const MAX_DEPTH = 14 // empirically found, when scaleExtent is 1<<22

const map = function() {
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const tiler = d3tile()
    .extent([[0, 0], [width, height]]); // <-- no clue what this does

  const zoom = d3.zoom()
    .scaleExtent([1 << 8, 1 << 22]) // <-- scale extents. if you make the upper limit too high, e.g. 1<<28, then zooming in really deep gets "jittery". feels like, theoretically, there should be a way to "reset" the zoom after a certain depth to make in-zooming effectively infinite. but i probably don't need that capability for this project anyway.
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
    // console.log(transform)
    const tiles = tiler(transform);
    console.log(tiles)
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
        .call(g => g.append(d => drawTile(...d)))
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

const svg = map()
const appDiv = document.getElementById('app')
appDiv.appendChild(svg)
