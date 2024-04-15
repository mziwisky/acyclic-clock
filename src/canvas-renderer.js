import * as d3 from 'd3'
import { compareSeconds } from './geometry';

// Q: what's still fun to do?
// A: make the zoom look as artifact-free as possible. at this point, that means adding visible crossfading sub-seconds here, and having lower-res seconds able to draw partials down to next 2 higher resolutions. that should probably make it all look pretty seamless
// TODO: geoSecond should be all we actually ever need, i think... right? maybe?
export const canvasRenderer = function(geoSecond, width, height) {
  // courtesy of https://github.com/observablehq/stdlib/blob/7f0f870/src/dom/context2d.js
  // for tips on dpi, see https://talk.observablehq.com/t/dom-context2d-vs-dom-canvas-what-am-i-doing-wrong/3836
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

  // TODO: this width/height needs to be able to change dynamically when the user resizes the display area
  const context = context2d(width, height)

  function draw(geo, geoSub, subOpacity, visibleSecs, visibleSubSecs, nowSec, curTransform) {
    context.clearRect(0, 0, width, height);
    let tallyWidth = curTransform.k * geo.baseDim.width
    let tallyHeight = curTransform.k * geo.baseDim.height
    for (const sec of visibleSecs) {
      const l = geo.locationOf(sec)
      const x = curTransform.applyX(l.x)
      const y = curTransform.applyY(l.y)
      const nowComp = compareSeconds(sec, nowSec)
      if (nowComp === 0) {
        // TODO: calling compareSeconds and then calling getFillProportions is obviously wasteful, because the latter calls the former anyway.
        // ALSO TODO: this is clearly wrong (e.g. always adjusting Width, never Height; only caring about the 0th proportion; the result showing lots of unintended shortened tallies), but it's a quick and dirty demonstration that i'm on the right track
        const proportions = geoSecond.getFillProportions(sec, nowSec)
        let axis = geo.baseDim.axis
        let curGeo = geo
        let xOffset = 0, yOffset = 0
        // if (proportions.length === 2) debugger
        for (let prop of proportions) {
          let tWidth = curTransform.k * curGeo.baseDim.width
          let tHeight = curTransform.k * curGeo.baseDim.height
          if (axis === 'y') {
            context.fillStyle = 'blue'
            context.fillRect(x + xOffset, y + yOffset, tWidth * prop, tHeight)
            context.fillStyle = 'lightblue'
            context.fillRect(x + xOffset + tWidth * prop, y + yOffset, tWidth * (1 - prop), tHeight)
            axis = 'x'
            curGeo = curGeo.superGeo()
            xOffset += tWidth * prop
          } else {
            context.fillStyle = 'blue'
            context.fillRect(x + xOffset, y + yOffset, tWidth, tHeight * prop)
            context.fillStyle = 'lightblue'
            context.fillRect(x + xOffset, y + yOffset + tHeight * prop, tWidth, tHeight * (1 - prop))
            axis = 'y'
            curGeo = curGeo.superGeo()
            yOffset += tHeight * prop
          }
        }
      }
      else if (nowComp > 0) {
        context.fillStyle = 'lightgray'
        context.fillRect(x, y, tallyWidth, tallyHeight)
      }
      else {
        context.fillStyle = 'black'
        context.fillRect(x, y, tallyWidth, tallyHeight)
      }
    }
    // TODO: subsecs, text labels
  }

  return {
    zoomable: d3.select(context.canvas),
    node: context.canvas,
    draw,
  }
}
