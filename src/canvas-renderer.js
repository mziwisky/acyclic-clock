import * as d3 from 'd3'
import { compareSeconds } from './geometry';

// Q: what's still fun to do?
// A: make the zoom look as artifact-free as possible. at this point, that means adding visible crossfading sub-seconds here, and having lower-res seconds able to draw partials down to next 2 higher resolutions. that should probably make it all look pretty seamless
export const canvasRenderer = function(width, height) {
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
