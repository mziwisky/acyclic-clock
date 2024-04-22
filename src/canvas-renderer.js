import * as d3 from 'd3'
import { compareSeconds } from './geometry';

export const canvasRenderer = function(geo, width, height) {
  // TODO: possibly worry about devicePixelRatio? see https://talk.observablehq.com/t/dom-context2d-vs-dom-canvas-what-am-i-doing-wrong/3836/2
  const canvas = document.createElement('canvas')

  const resize = (width, height) => {
    canvas.width = width
    canvas.height = height
  }
  resize(width, height)

  const context = canvas.getContext("2d")

  function draw(_geo, _geoSub, subOpacity, visibleSecs, visibleSubSecs, nowSec, curTransform) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (visibleSecs.length == 0) return

    const dim = geo.dimFor(visibleSecs[0])
    const tallyWidth = curTransform.k * dim.width
    const tallyHeight = curTransform.k * dim.height
    // hue: 0-360
    // k: 2e-9 - 1.0
    const hue = Math.log(curTransform.k) * -12.8
    const fullTallyStyle = `hsl(${hue},100%,50%)`
    const emptyTallyStyle = 'lightgray'
    for (const sec of visibleSecs) {
      const l = geo.locationOf(sec)
      const x = curTransform.applyX(l.x)
      const y = curTransform.applyY(l.y)
      const nowComp = compareSeconds(sec, nowSec)
      if (nowComp === 0) {
        // this is the CURRENT moment which, if we're zoomed out past the threshold that renders minutes, means we need to subdivide some tallies.
        // we do this by finding the dividing path that goes between the filled and empty portions of the Full Tally, and then use it to draw two polygons (the filled portion and the empty portion).
        // The idea is to get the bottom right corner of each "finer tally", then sort them left-to-right, then stair-step our way through them (up,right,up,right,...)
        const finerTallies = []
        for (let i = sec.length + 1; i <= nowSec.length; i++) {
          let previousFullTallySec = nowSec.slice(0, i)
          previousFullTallySec[previousFullTallySec.length-1]-- // TODO: handle when it started at 0
          finerTallies.push(geo.locationOf(previousFullTallySec))
        }
        const bottomRight = (t) => ({x: curTransform.applyX(t.x + t.w), y: curTransform.applyY(t.y + t.h)})
        const byX = (pt1, pt2) => pt1.x - pt2.x
        const brs = finerTallies.map(bottomRight).sort(byX)
        // console.log("BRS: ", brs)

        // TODO: ensure this does the right thing for edge cases, e.g. nowSec = [13, 70, 20, 8, 0, 54, 24, 6, 7, 12, 5] -- that 6 for Days puts us at the bottom of a week columnTally, and we draw the path along the bottom edge of the tally.  this might cause problems once we try to fill the empty part.  (or it might not!)  Also 0's in there might cause problems (almost certainly will).
        if (brs.length) {
          const divisionPts = []
          if (dim.axis === 'x') {
            divisionPts.push([x, brs[0].y])
          }
          divisionPts.push([brs[0].x, brs[0].y])
          for (let i = 1; i < brs.length; i++) {
            divisionPts.push([brs[i-1].x, brs[i].y])
            divisionPts.push([brs[i].x, brs[i].y])
          }
          if (dim.axis === 'y') {
            divisionPts.push([brs[brs.length - 1].x, y])
          }

          let filledPart = new Path2D()
          let emptyPart = new Path2D()
          if (dim.axis === 'x') {
            filledPart.moveTo(x + tallyWidth, y)
            filledPart.lineTo(x, y)
            emptyPart.moveTo(x + tallyWidth, y + tallyHeight)
            emptyPart.lineTo(x, y + tallyHeight)
          } else {
            filledPart.moveTo(x, y)
            filledPart.lineTo(x, y + tallyHeight)
            emptyPart.moveTo(x + tallyWidth, y)
            emptyPart.lineTo(x + tallyWidth, y + tallyHeight)
          }
          for (let pt of divisionPts) {
            filledPart.lineTo(...pt)
            emptyPart.lineTo(...pt)
          }
          context.fillStyle = fullTallyStyle
          context.fill(filledPart)
          context.fillStyle = emptyTallyStyle
          context.fill(emptyPart)
        } else {
          context.fillStyle = emptyTallyStyle
          context.fillRect(x, y, tallyWidth, tallyHeight)
        }
      } else if (nowComp > 0) {
        context.fillStyle = emptyTallyStyle
        context.fillRect(x, y, tallyWidth, tallyHeight)
      } else {
        context.fillStyle = fullTallyStyle
        context.fillRect(x, y, tallyWidth, tallyHeight)
      }

      context.save()
      const lineHeight = 0.6 * (dim.axis == 'x' ? tallyWidth : tallyHeight)
      context.fillStyle = 'black'
      context.font = `${lineHeight}px serif`
      context.textAlign = 'center'
      if (dim.axis == 'x') {
        context.translate(x + tallyWidth/2 + lineHeight/2, y + tallyHeight/2)
        context.rotate(-Math.PI / 2)
      } else {
        context.translate(x + tallyWidth/2, y + tallyHeight/2 + lineHeight/2)
      }
      context.fillText(sec, 0, 0)
      context.restore()
    }
    // TODO: subsecs, text labels
  }

  return {
    zoomable: d3.select(canvas),
    node: canvas,
    draw,
    resize,
  }
}
