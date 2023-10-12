// import './style.css'
//
// age of universe: 13.7 billion years
// heat death: 1.7e106 years
//
// DOWN 1000 ms -> 1 s
// ACRS 60 s -> 1 min
// DOWN 60 min -> 1 hr
// ACRS 24 hr -> 1 day
// DOWN 7 days -> 1 week
// ACRS 52 weeks ~~ 1 year
// DOWN 100 years -> 1 century
// ACRS 10 centuries -> 1 millenium
// DOWN 1000 milleniums -> 1 millions years
// ACRS 1000 millions years -> 1 billions years
// DOWN 1000 billions years -> 1 1e12 years
// ACRS 1000 1e12 -> 1 1e15
// DOWN -> 1e18
// ACRS -> 1e21
// ... are chunks of 1000 actually a good idea? Pixel 7 screen resolution is only 2400 × 1080... does that matter?

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
        .scale(1 << 8)); // <-- initial scale

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
        .call(g => g.append(d => circlesForDepth(d[2])))
    );
  }

  // programatic scale, animates to the resulting zoom
  // svg.transition().call(zoom.scaleBy, 20)
  return svg.node();
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
