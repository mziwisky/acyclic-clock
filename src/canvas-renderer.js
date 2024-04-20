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
    // context.fillStyle = 'yellow'
    // context.fillRect(0, 0, width, height)
    let tallyWidth = curTransform.k * geo.baseDim.width
    let tallyHeight = curTransform.k * geo.baseDim.height
    const hue = curTransform.k * 100 // TODO: something log-scale that works better than this
    const fullTallyStyle = `hsl(${hue},100%,50%)`
    const emptyTallyStyle = 'blue'
    for (const sec of visibleSecs) {
      const l = geo.locationOf(sec)
      const x = curTransform.applyX(l.x)
      const y = curTransform.applyY(l.y)
      const nowComp = compareSeconds(sec, nowSec)
      if (nowComp === 0) {
        // THIS IS THE OLD APPROACH which basically works, but has artifacts, so i'm leaving it in as i work out the new appraoch below
        //
        // TODO: calling compareSeconds and then calling getFillProportions is obviously wasteful, because the latter calls the former anyway.
        const proportions = geoSecond.getFillProportions(sec, nowSec)
        // TODO: i think a proportions approach is somehow flawed.  other ideas:
        //  - actually drawing finer-resolution tallies (plus pre-padding!)
        //    - might be a quick-ish way to accomplish this one by drawing ALL super-tallies (plus pre-padding) rather than just the ones nearest the frontier
        //  - figuring out the shape of this tally as a pair of polygons and drawing those
        let axis = geo.baseDim.axis
        let curGeo = geo
        let xOffset = 0, yOffset = 0
        // if (proportions.length === 2) debugger
        console.log(`FULL TALLY: ${x}, ${y}, ${tallyWidth}, ${tallyHeight}`)
        for (const [idx, prop] of proportions.entries()) {
          const FUDGE = Math.min(idx, 1) * 0
          const tWidth = curTransform.k * curGeo.baseDim.width
          const tHeight = curTransform.k * curGeo.baseDim.height
          if (axis === 'y') {
            const r1 = [x + xOffset, y + yOffset - FUDGE, tWidth * prop, tHeight + FUDGE]
            const r2 = [x + xOffset + tWidth * prop, y + yOffset, tWidth * (1 - prop), tHeight]
            context.fillStyle = fullTallyStyle
            context.fillRect(...r1)
            context.fillStyle = emptyTallyStyle
            context.fillRect(...r2)
            console.log(`ySPLIT strt: ${r1}`)
            console.log(`ySPLIT end : ${r2}`)
            axis = 'x'
            curGeo = curGeo.superGeo()
            xOffset += tWidth * prop
          } else {
            const r1 = [x + xOffset - FUDGE, y + yOffset, tWidth + FUDGE, tHeight * prop]
            const r2 = [x + xOffset, y + yOffset + tHeight * prop, tWidth, tHeight * (1 - prop)]
            context.fillStyle = fullTallyStyle
            context.fillRect(...r1)
            context.fillStyle = emptyTallyStyle
            context.fillRect(...r2)
            console.log(`xSPLIT strt: ${r1}`)
            console.log(`xSPLIT end : ${r2}`)
            axis = 'y'
            curGeo = curGeo.superGeo()
            yOffset += tHeight * prop
          }
        }

        // OK, here's the new approach -- find the dividing path that goes between the filled and empty portions of the Full Tally, and then use it to draw two polygons (the full portion and the empty portion).
        // The idea is to get the bottom right corner of each "finer tally", then sort them left-to-right, then stair-step our way through them (up,right,up,right,...)
        const finerTallies = []
        for (let i = sec.length + 1; i <= nowSec.length; i++) {
          let previousFullTallySec = nowSec.slice(0, i)
          previousFullTallySec[previousFullTallySec.length-1]-- // TODO: handle when it started at 0
          finerTallies.push({...geoSecond.locationOf(previousFullTallySec), sec: previousFullTallySec})
        // TODO: remove the `sec` from the above. it's just for debugging.
        }
        const bottomRight = (t) => ({x: curTransform.applyX(t.x + t.w), y: curTransform.applyY(t.y + t.h), tally: t, sec: t.sec})
        // TODO: remove the `tally` and `sec` from the above. they're just for debugging.
        const byX = (pt1, pt2) => pt1.x - pt2.x
        const brs = finerTallies.map(bottomRight).sort(byX)
        console.log("BRS: ", brs)

        // TODO: ensure this does the right thing for edge cases, e.g. nowSec = [13, 70, 20, 8, 0, 54, 24, 6, 7, 12, 5] -- that 6 for Days puts us at the bottom of a week columnTally, and we draw the path along the bottom edge of the tally.  this might cause problems once we try to fill the empty part.  (or it might not!)  Also 0's in there might cause problems (almost certainly will).
        if (brs.length) {
          const divisionPts = []
          if (geo.baseDim.axis === 'x') {
            divisionPts.push([x, brs[0].y])
          }
          divisionPts.push([brs[0].x, brs[0].y])
          for (let i = 1; i < brs.length; i++) {
            divisionPts.push([brs[i-1].x, brs[i].y])
            divisionPts.push([brs[i].x, brs[i].y])
          }
          if (geo.baseDim.axis === 'y') {
            divisionPts.push([brs[brs.length - 1].x, y])
          }

          // TODO: figure out why this absolutely tanks performance.  dammit.  i guess if i had to, i could do this with overlapping fillRects.  fill to each bottom-right corner we just found.  actually that's not a bad idea at all now is it...
          const tWidth = curTransform.k * l.w
          const tHeight = curTransform.k * l.h
          let filledPart = new Path2D()
          let emptyPart = new Path2D()
          if (geo.baseDim.axis === 'x') {
            filledPart.moveTo(x + tWidth, y)
            filledPart.lineTo(x, y)
            emptyPart.moveTo(x + tWidth, y + tHeight)
            emptyPart.lineTo(x, y + tHeight)
          } else {
            filledPart.moveTo(x, y)
            filledPart.lineTo(x, y + tHeight)
            emptyPart.moveTo(x + tWidth, y)
            emptyPart.lineTo(x + tWidth, y + tHeight)
          }
          for (let pt of divisionPts) {
            filledPart.lineTo(...pt)
            emptyPart.lineTo(...pt)
          }
          context.fillStyle = "orange"
          context.fill(filledPart)
          context.fillStyle = "green"
          context.fill(emptyPart)
        }
      }
      else if (nowComp > 0) {
        context.fillStyle = emptyTallyStyle
        context.fillRect(x, y, tallyWidth, tallyHeight)
      }
      else {
        context.fillStyle = fullTallyStyle
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
