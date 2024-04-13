
// sec1 < sec2 ==> -1
// sec1 = sec2 ==> 0
// sec1 > sec2 ==> 1
// if seconds come from different Geometries (i.e. arrays are different lengths),
// it only compares to the least significant value of the lowest common resolution.
export function compareSeconds(sec1, sec2) {
  const len = Math.min(sec1.length, sec2.length)
  for (let i = 0; i < len; i++) {
    if (sec1[i] < sec2[i]) return -1
    if (sec1[i] > sec2[i]) return 1
  }
  return 0
}

// simple elementwise sum, assumes arrays are same length
function sumElements(arr1, arr2) {
  return arr1.map((val, idx) => val + arr2[idx])
}

export class Geometry {
  #dims = []
  parent = null

  static withSecondDims(secWidth, secHeight, secPad) {
    const baseDim = {
      name: 'second',
      rollupCnt: null,
      width: secWidth,
      height: secHeight,
      pad: secPad,
      sizeWithPad: secWidth + secPad,
      axis: 'x', // the axis along which we step to draw each tally
    }
    return new Geometry([baseDim], null)
  }

  constructor(dims, parent) {
    this.#dims = dims
    this.parent = parent
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
    this.#dims.unshift(newDim)
  }

  subGeo() {
    if (this.#dims.length <= 1) return this
    return new Geometry(this.#dims.slice(0, this.#dims.length - 1), this)
  }

  superGeo() {
    if (!this.parent) return this
    return this.parent
  }

  get baseDim() {
    return this.#dims[this.#dims.length - 1]
  }

  get lastDim() {
    return this.#dims[0]
  }

  valueOfSecond(sec) {
    const len = this.#dims.length
    let result = 0
    let multiplier = 1
    for (let i = len - 1; i >= 0; i--) {
      const dim = this.#dims[i]
      if (dim.rollupCnt) {
        multiplier *= dim.rollupCnt
      }
      result += (sec[i] * multiplier)
    }
    return result
  }

  locationOf(sec) {
    const len = this.#dims.length
    const result = { x: 0, y: 0 }
    for (let i = 0; i < len; i++) {
      const dim = this.#dims[i]
      result[dim.axis] += sec[i] * dim.sizeWithPad
    }
    return result
  }

  nearestSecond(x, y) {
    const second = []
    const remainder = { x, y }
    for (let i = 0; i < this.#dims.length; i++) {
      const dim = this.#dims[i]
      const nextDim = this.#dims[i-1]
      // TODO: how should i handle non-ints?
      // TODO: is retular math sufficient for such large numbers, or do i have to use a bigint lib or decimal lib or something?
      // TODO: does it matter if my remainder ever hits exactly 0? (maybe... write tests!)
      let newRem = remainder[dim.axis] % dim.sizeWithPad
      let count = (remainder[dim.axis] - newRem) / dim.sizeWithPad
      if (nextDim && count >= nextDim.rollupCnt) {
        const max = nextDim.rollupCnt - 1
        const diff = count - max
        count = max
        newRem += dim.sizeWithPad * diff
      }
      second.push(Math.max(0, count))
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
        segments.push(`${values[i]} ${this.#dims[i].name}`)
      }
    }
    segments.push(`remainder (${nearest.remainder.x}, ${nearest.remainder.y})`)
    return segments.join(', ')
  }

  *secondsBetween(sec1, sec2) {
    let s = sec1
    while (compareSeconds(s, sec2) <= 0) {
      yield s
      s = this.increment(s)
    }
  }

  *visibleSecondsBetween(sec1, sec2) {
    const leftBound = this.xs(sec1)
    const rightBound = this.xs(sec2)
    const lowerBound = this.ys(sec2)

    let s = sec1
    while (true) {
      yield s
      s = this.incrementX(s)
      if (!s || this.compareSecondsXY(rightBound, s).x > 0) { // jump to next line down
        const below = this.incrementY(s)
        if (!below) break
        s = sumElements(leftBound, this.ys(below))
        if (this.compareSecondsXY(lowerBound, s).y > 0) break
      }
    }
  }

  incrementInAxis(axis, sec) {
    // degenerate case
    if (this.#dims.length === 1 && this.#dims[0].axis !== axis) return null

    const newSec = [...sec]
    for (let i = this.#dims.length - 1, j = 0; i >= 0; i--, j++) {
      if (this.#dims[i].axis != axis) continue
      const nextDim = this.#dims[i-1]
      const nextAlignedDim = this.#dims[i-2]
      newSec[i]++
      if (nextDim === undefined || newSec[i] < nextDim.rollupCnt) {
        break
      }
      if (!nextAlignedDim) {
        return null
      }
      newSec[i] = 0
    }
    return newSec
  }

  incrementX(sec) {
    return this.incrementInAxis('x', sec)
  }

  incrementY(sec) {
    return this.incrementInAxis('y', sec)
  }

  increment(sec) {
    const newSec = [...sec]
    for (let i = this.#dims.length - 1; i >= 0; i--) {
      const nextDim = this.#dims[i-1]
      newSec[i]++
      if (nextDim === undefined || newSec[i] < nextDim.rollupCnt) {
        break
      }
      newSec[i] = 0
    }
    return newSec
  }

  // toSec left of fromSec ==> x: -1
  // toSec right of fromSec ==> x: 1
  // toSec neither L nor R of fromSec ==> x: 0
  // toSec above fromSec ==> y: -1
  // toSec below fromSec ==> y: 1
  // toSec neither above nor below fromSec ==> y: 0
  compareSecondsXY(fromSec, toSec) {
    const result = { x: 0, y: 0 }
    for (let i = 0; i < fromSec.length; i++) {
      const axis = this.#dims[i].axis
      if (result[axis] != 0) continue
      if (toSec[i] < fromSec[i]) result[axis] = -1
      else if (toSec[i] > fromSec[i]) result[axis] = 1
      if (result.x != 0 && result.y != 0) break
    }
    return result
  }

  project(axis, sec) {
    return sec.map((val, i) => this.#dims[i].axis === axis ? val : 0)
  }

  xs(sec) {
    return this.project('x', sec)
  }

  ys(sec) {
    return this.project('y', sec)
  }

  s(partialSec) {
    const fullSec = new Array(this.#dims.length).fill(0);
    for (let p = partialSec.length - 1, f = fullSec.length - 1; p >= 0; p--, f--) {
      fullSec[f] = partialSec[p]
    }
    return fullSec
  }

  // both seconds can be partials
  sum(sec1, sec2) {
    const res = this.s(sec1)
    const remainders = this.s(sec2)
    for (let i = remainders.length - 1; i > 0; i--) {
      const nextDim = this.#dims[i-1]
      const sum = res[i] + remainders[i]
      const quotient = Math.floor(sum / nextDim.rollupCnt)
      const remainder = sum % nextDim.rollupCnt
      res[i] = remainder
      remainders[i-1] += quotient
    }
    res[0] += remainders[0]
    return res
  }

  // TODO: better name. "fill" is drawing-specific, Geometry shouldn't care about drawing.  err... what am i talking about, it's ALL about drawing
  getFillProportions(targetSec, nowSec) {
    const nowComp = compareSeconds(targetSec, nowSec)
    if (nowComp > 0) return [0.0]
    if (nowComp < 0) return [1.0]

    if (nowSec.length === targetSec.length) return [1.0]
    const res = []
    for (let i = targetSec.length; i < nowSec.length; i++) {
      res.push(nowSec[i] / this.#dims[i-1].rollupCnt)
    }
    return res
  }
}

function runTests() {

  // ===================================
  // UTILITY FUNCTIONS
  // ===================================
  function assert(errMsgIfFailed) {
    if (errMsgIfFailed) throw new Error(errMsgIfFailed)
    console.log('SUCCESS')
  }

  function xyEqual(xyRes, xyExp) {
    if (xyRes.x !== xyExp.x || xyRes.y !== xyExp.y) {
      return `compareSecondsXY is busted. exp: ${JSON.stringify(xyExp)}, res: ${JSON.stringify(xyRes)}`
    }
  }

  function secondsEqual(s1, s2) {
    if (compareSeconds(s1, s2) !== 0) return `seconds differ: ${JSON.stringify(s1)} <> ${JSON.stringify(s2)}`
  }

  function arrayOfSecondsEqual(a1, a2) {
    if (a1.length !== a2.length) return 'arrays different lengths'
    for (let i = 0; i < a1.length; i++) {
      const errRes = secondsEqual(a1[i], a2[i])
      if (errRes) return errRes
    }
  }

  function equal(v1, v2) {
    if (v1 != v2) return `values differ: ${v1} <> ${v2}`
  }

  // ===================================
  // Geometry
  // ===================================
  const geo0 = Geometry.withSecondDims(16, 128, 2)
  geo0.addDimension('minute', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('hour', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('day', 4, geo0.lastDim.pad * 2)
  geo0.addDimension('week', 7, geo0.lastDim.pad * 2)

  assert(equal(geo0.valueOfSecond([0,1,0,2,3]), 3+2*4+1*4*4*4))

  assert(xyEqual(geo0.compareSecondsXY([0,0,0,58,59], [0,0,0,59,0]), { x: -1, y: 1 }))
  assert(xyEqual(geo0.compareSecondsXY([0,0,0,59,0], [0,0,0,59,1]), { x: 1, y: 0 }))
  assert(xyEqual(geo0.compareSecondsXY([0,0,0,59,59], [0,0,1,0,0]), { x: 1, y: -1 }))

  assert(arrayOfSecondsEqual(
    [...geo0.secondsBetween([0,0,2,3,2], [0,0,3,1,1])],
    [
      [0,0,2,3,2], [0,0,2,3,3], [0,0,3,0,0], [0,0,3,0,1],
      [0,0,3,0,2], [0,0,3,0,3], [0,0,3,1,0], [0,0,3,1,1]
    ]
  ))

  assert(secondsEqual(sumElements([0,20,3,5], [0,1,0,15]), [0,21,3,20]))

  assert(secondsEqual(geo0.sum([0,0,0,0,0], [2]), [0,0,0,0,2]))
  assert(secondsEqual(geo0.sum([0,0,0,0,0], [2,2]), [0,0,0,2,2]))
  assert(secondsEqual(geo0.sum([0,0,0,0,0], [4]), [0,0,0,1,0]))
  assert(secondsEqual(geo0.sum([0,1,2,2,2], [4]), [0,1,2,3,2]))
  assert(secondsEqual(geo0.sum([0,1,2,2,2], [16]), [0,1,3,2,2]))
  assert(secondsEqual(geo0.sum([0,1,2,3,2], [17]), [0,1,3,3,3]))
  assert(secondsEqual(geo0.sum([1,6,3,3,3], [1]), [2,0,0,0,0]))

  assert(secondsEqual(geo0.incrementX([1,1,1,1,1]), [1,1,1,1,2]))
  assert(secondsEqual(geo0.incrementX([1,1,1,1,3]), [1,1,2,1,0]))
  assert(secondsEqual(geo0.incrementX([1,1,3,1,3]), [2,1,0,1,0]))

  assert(secondsEqual(geo0.incrementY([1,1,1,1,1]), [1,1,1,2,1]))
  assert(secondsEqual(geo0.incrementY([1,1,1,3,1]), [1,2,1,0,1]))
  assert(geo0.incrementY([1,6,1,3,1]) && 'incrementY is busted')

  assert(arrayOfSecondsEqual(
    [...geo0.visibleSecondsBetween([0,0,2,2,2], [1,1,1,0,1])],
    [
      ...geo0.secondsBetween([0,0,2,2,2], [0,0,2,2,3]),
      ...geo0.secondsBetween([0,0,3,2,0], [0,0,3,2,3]),
      ...geo0.secondsBetween([1,0,0,2,0], [1,0,0,2,3]),
      ...geo0.secondsBetween([1,0,1,2,0], [1,0,1,2,1]),

      ...geo0.secondsBetween([0,0,2,3,2], [0,0,2,3,3]),
      ...geo0.secondsBetween([0,0,3,3,0], [0,0,3,3,3]),
      ...geo0.secondsBetween([1,0,0,3,0], [1,0,0,3,3]),
      ...geo0.secondsBetween([1,0,1,3,0], [1,0,1,3,1]),

      ...geo0.secondsBetween([0,1,2,0,2], [0,1,2,0,3]),
      ...geo0.secondsBetween([0,1,3,0,0], [0,1,3,0,3]),
      ...geo0.secondsBetween([1,1,0,0,0], [1,1,0,0,3]),
      ...geo0.secondsBetween([1,1,1,0,0], [1,1,1,0,1]),
    ]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,0,1], [0,0,0,0,0]),
    [0.0]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,0,1], [0,0,0,0,2]),
    [1.0]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,0,1], [0,0,0,0,1]),
    [1.0]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,0], [0,0,0,1,2]),
    [1.0]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,1], [0,0,0,0,2]),
    [0.0]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0,0], [0,0,0,0,2]),
    [0.5]
  ))

  assert(secondsEqual(
    geo0.getFillProportions([0,0,0], [0,0,0,1,2]),
    [0.25, 0.5] // TODO: right?  can i work with that? turn it into a drawing?
    // one number means "fill it this much"
    // two means "fill it as much as the first says, then fill the next increment as much as the second says".  so that's.... not enough information, i'd say.  needs to be something like
    // [0.25, [0.25, 0.5]]
    // which says (fill up 25%, then the next 25% gets filled up 50% in the other dimension
  ))

  const geo = Geometry.withSecondDims(16, 128, 2)
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

  const pointInPadding = geo.nearestSecond(6067, 8312)
  assert(secondsEqual(pointInPadding.second, geo.s([5,59,19])))
  assert(xyEqual(pointInPadding.remainder, {x: 15, y: 288}))

  assert(arrayOfSecondsEqual(
    [...geo.visibleSecondsBetween(geo.s([58,42]), geo.s([1,1,0,8]))],
    [
      ...geo.secondsBetween(geo.s([58,42]), geo.s([58,59])),
      ...geo.secondsBetween(geo.s([1,58,0]), geo.s([1,58,8])),

      ...geo.secondsBetween(geo.s([59,42]), geo.s([59,59])),
      ...geo.secondsBetween(geo.s([1,59,0]), geo.s([1,59,8])),

      ...geo.secondsBetween(geo.s([1,0,0,42]), geo.s([1,0,0,59])),
      ...geo.secondsBetween(geo.s([1,1,0,0]), geo.s([1,1,0,8])),
    ]
  ))
}

runTests()
