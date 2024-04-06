import * as d3 from 'd3'

export function fpsMeter({ numHistoryPoints } = {}) {
  if (!numHistoryPoints) numHistoryPoints = 500

  const margin = {top: 2, right: 2, bottom: 3, left: 30},
    width = 192 - margin.left - margin.right,
    height = 100 - margin.top - margin.bottom

  const x = d3.scaleLinear().range([margin.left, width - margin.right]).domain([1 - numHistoryPoints, 0])
  const y = d3.scaleLinear().range([height - margin.bottom, margin.top]).domain([0, 140])

  const svg = d3.create("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
      .attr("x2", width - margin.left - margin.right)
      .attr("stroke-opacity", 0.1)
    )
    .call(g => g.append("text")
      .attr("x", -margin.left)
      .attr("y", 10)
      .attr("fill", "currentColor")
    )

  const line = d3.line()
    .x(d => x(d[0]))
    .y(d => y(d[1]))

  const data = []
  for (let i = 0; i < numHistoryPoints; i++) {
    data.push([i - numHistoryPoints + 1, 0])
  }

  const plotLine = svg.append("path")
    .datum(data)
    .attr('fill', 'none')
    .attr("stroke", "black")
    .attr("stroke-width", 1.5)
    .attr("d", line)

  // Function to update the chart
  function updateChart(newData) {
    // Add new data to the existing data array
    data.push(newData)
    data.shift()

    // Update the scale domains
    x.domain(d3.extent(data, d => d[0]))
    // y.domain(d3.extent(data, d => d[1]))
    // y.domain([0, d3.max(data, d => d[1])])
    // y.domain([0, 130])

    plotLine.attr("d", line(data));
  }

  const node = document.createElement('div')
  node.className = 'fpsMeter'
  const fpsText = document.createElement('p')

  node.appendChild(fpsText)
  node.appendChild(svg.node())

  let lastUpdate = 0
  let iii = 0
  const timerCallback = (elapsed) => {
    const fps = Math.round(10000 / (elapsed - lastUpdate)) / 10
    lastUpdate = elapsed
    fpsText.textContent = `FPS: ${fps}`
    updateChart([iii++, fps])
  }
  const timer = d3.timer(timerCallback)

  const stop = () => timer.stop()
  const start = () => timer.restart(timerCallback)

  return {
    node,
    stop,
    start,
  }
}

export function fpsToggler(parentNode) {
  let on = false
  const fps = fpsMeter()
  fps.stop()
  return () => {
    if (on) {
      on = false
      parentNode.removeChild(fps.node)
      fps.stop()
    } else {
      on = true
      parentNode.appendChild(fps.node)
      fps.start()
    }
  }
}
