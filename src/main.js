// import './style.css'

import * as d3 from 'd3'
import {tile as d3tile} from 'd3-tile'

// trying to make https://observablehq.com/@d3/zoomable-tiles work, not sure how to do that without the Observable runtime...

const width = 600
const height = 600

const map = function() {
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const tiler = d3tile()
      .extent([[0, 0], [width, height]]);

  const zoom = d3.zoom()
      .scaleExtent([1 << 8, 1 << 22])
      .extent([[0, 0], [width, height]])
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
        .scale(1 << 10));

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
    );
  }

  return svg.node();
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
