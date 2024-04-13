import * as d3 from 'd3'
import { compareSeconds } from './geometry';

export const svgRenderer = function(width, height) {
  const svg = d3.create("svg")
  // TODO: this width/height needs to be able to change dynamically when the user resizes the display area
      .attr("viewBox", [0, 0, width, height]);

  let talliesGroup = svg.append("g")
  let tallies = talliesGroup.selectAll('rect')
  let tallyLabels = talliesGroup.selectAll('text')

  let subTalliesGroup = svg.append("g")
  let subTallies = subTalliesGroup.selectAll('rect')

  function calcFill(nowSec) {
    return (sec) => {
      const comp = compareSeconds(sec, nowSec)
      if (comp === 0) return 'red'
      if (comp > 0) return 'lightgray'
      return 'black'
    }
  }

  // TODO: feels wrong to have to pass in visibleSubSecs... but is it? maybe not. this function gets called even when the zoom doesn't change. we want to be able to keep visible{Secs,SubSecs,SubSubSecs,...} in state and not recalculate them each time this is called.  and this should be a pure function (essentially, but not really, because it's updating a dom element), so it shouldn't be keeping that state.
  function draw(geo, geoSub, subOpacity, visibleSecs, visibleSubSecs, nowSec, curTransform) {
    console.log("NOW: " + nowSec)
    tallies = tallies.data(visibleSecs, d => d)
      .join(enter => enter.append('rect'))
      // .attr('fill', sec => compareSeconds(sec, nowSec) > 0 ? 'lightgray' : 'black')
      .attr('fill', calcFill(nowSec))
      .attr('width', _sec => curTransform.k * geo.baseDim.width)
      .attr('height', _sec => curTransform.k * geo.baseDim.height)
      // could use a `.attr` for each of `x` and `y`, but using `.each` allows us to reuse
      // the result of the `geo.locationOf` calculation
      .each((sec, i, nodes) => {
        const l = geo.locationOf(sec)
        // `nodes[i]` is the actual DOM node in question, not the D3 selection,
        // so must use `.setAttribute` as opposed to `.attr`
        nodes[i].setAttribute('x', curTransform.applyX(l.x))
        nodes[i].setAttribute('y', curTransform.applyY(l.y))
      })

    tallyLabels = tallyLabels.data(visibleSecs, d => d)
      .join(enter => enter.append('text'))
      .attr('style', sec => {
        const l = geo.locationOf(sec)
        const x = curTransform.applyX(l.x)
        const y = curTransform.applyY(l.y)
        const scale = 0.55 * curTransform.k
        return `transform: rotate(90deg) scale(${scale}) translate(${y/scale + 7}px, -${x/scale + 9}px)`
      })
      .attr('fill', 'yellow')
      .text(sec => sec)
    // TODO: make tally labels human-friendly

    subTallies = subTallies.data(visibleSubSecs, d => d)
      .join(enter => enter.append('rect'))
      .attr('fill', sec => compareSeconds(sec, nowSec) > 0 ? 'lightgray' : 'black')
      .attr('fill-opacity', subOpacity)
      .attr('width', _sec => curTransform.k * geoSub.baseDim.width)
      .attr('height', _sec => curTransform.k * geoSub.baseDim.height)
      // could use a `.attr` for each of `x` and `y`, but using `.each` allows us to reuse
      // the result of the `geoSub.locationOf` calculation
      .each((sec, i, nodes) => {
        const l = geoSub.locationOf(sec)
        // `nodes[i]` is the actual DOM node in question, not the D3 selection,
        // so must use `.setAttribute` as opposed to `.attr`
        nodes[i].setAttribute('x', curTransform.applyX(l.x))
        nodes[i].setAttribute('y', curTransform.applyY(l.y))
      })
  }

  return {
    zoomable: svg,
    node: svg.node(),
    draw,
  }
}
