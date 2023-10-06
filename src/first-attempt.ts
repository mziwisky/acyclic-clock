// import './style.css'

import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui.js";

const two = new Two({
  type: Two.Types.canvas,
  fullscreen: true,
  autostart: true
}).appendTo(document.body);

const zui = new ZUI(two.scene);
zui.addLimits(0.0002, 80);

two.renderer.domElement.addEventListener("mousewheel", mousewheel, false);

function mousewheel(e: WheelEvent) {
  e.stopPropagation();
  e.preventDefault();

  var dy = -e.deltaY / 1000;

  zui.zoomBy(dy, e.clientX, e.clientY);
}
var cX = two.width / 2
var cY = two.height / 2

var styles = {
  alignment: "center",
  size: 36,
  family: "Lato"
}

var rect = two.makeRectangle(two.width / 2, two.height / 2, 50 ,50)
var timeText = two.makeText('', cX, 200, styles)
var fpsText = two.makeText('', cX, 250, styles)

// Visual Parameters
const vp = {
  secWidth: 20,
  subdivsPerSec: 100,
  subdivsHeight: 1,
  subdivsSeparation: 0.1,
  secSeparation: 2
}

class Second {
  renderable: any
  subdivs: any

  constructor(x: number, y: number) {
    this.subdivs = []
    for (var i = 0; i < vp.subdivsPerSec; i++) {
      this.subdivs.push(new Two.Rectangle(x, y + i*(vp.subdivsHeight + vp.subdivsSeparation), vp.secWidth, vp.subdivsHeight))
    }
    this.renderable = new Two.Group(this.subdivs)
    this.renderable.noStroke()
    this.renderable.fill = "gray"
  }

  // millis is 0-999.  or maybe 0-1000.  i dunno.
  update(millis: number) {
    // TODO: cache last update, don't loop if it won't change anything.
    // ALSO, if you're caching last update, then you can deterministically calculate which subdivs need updates and target them directly and _never_ have to loop.
    let mult = 1000 / vp.subdivsPerSec
    for (var i = 0; i < vp.subdivsPerSec; i++) {
      if (millis >= mult*(i+0.5)) {
        this.subdivs[i].fill = "black"
      } else {
        this.subdivs[i].fill = "gray"
      }
    }
  }

  on() {
    this.renderable.fill = "black"
  }

  off() {
    this.renderable.fill = "gray"
  }
}

class Minute {
  renderable: any
  seconds: Second[]

  constructor(x: number, y: number) {
    // TODO: probably need to be more deliberate w/ x and y.
    this.seconds = []
    for (let i = 0; i < 60; i++) {
      let second = new Second(x + i*(vp.secWidth + vp.secSeparation), y)
      this.seconds.push(second)
    }
    this.renderable = new Two.Group(this.seconds.map(s => s.renderable))
  }

  update(millis: number) {
    let progressThroughSeconds = millis % 60000 // TODO: can/should i just always feed this a num between 1 and 60000?
    let numSecOn = Math.floor(progressThroughSeconds / 1000)
    // console.log(millis + ' ' + progressThroughSeconds + ' ' + numSecOn)
    for (let i = 0; i < numSecOn; i++) {
      this.seconds[i].on()
    }
    this.seconds[numSecOn].update(progressThroughSeconds % 1000)
    for (let i = numSecOn + 1; i < 60; i++) {
      this.seconds[i].off()
    }
  }

  on() {
    this.renderable.fill = "black"
  }

  off() {
    this.renderable.fill = "gray"
  }
}


// TODO: obviously this will become an hour class
const minutes: any = []
const numMin = 10
for (let i = 0; i < numMin; i++) {
  let minute = new Minute(cX, cY + i*120)
  minutes.push(minute)
  two.add(minute.renderable)
}

let lastUpdate = 0

two.bind('update', function() {
  let now = Date.now()
  let fps = Math.round(10000 / (now - lastUpdate)) / 10
  lastUpdate = now
  timeText.value = now.toString()
  fpsText.value = `FPS: ${fps}`
  rect.rotation += 0.001
  // animatedSecond.position.add(0.1,0)

  // TODO: the changes that have to be made here will probably tell me something important about the recursive abstraction that's going on.... maybe.... i dunno, just fix this.  won't be long before we have to start worrying about optimizations.
  // let progressThroughNMinuteSection = now % (numMin * 60000)
  // let numMinOn = Math.floor(progressThroughNMinuteSection / 60000)
  // for (let i = 0; i < numMinOn; i++) {
  //   minutes[i].on()
  // }
  // minutes[numMinOn].update(progressThroughNMinuteSection) // TODO: is that right?
  // for (let i = numMinOn + 1; i < numMin; i++) {
  //   minutes[i].off()
  // }
});
