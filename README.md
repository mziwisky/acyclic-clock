# Acyclic Clock

It has no cycles. Each moment is unique, and when it's over, it's over.

## Development

Vite is awesome.

```
npm run dev
```

## Deploying

TODO: stop building on server. build locally, deploy static files.

I have a dokku instance set up. I deployed it there with the name "time". After
the first deploy, I had to ssh in and do

```
dokku config:set time NGINX_ROOT=dist
```

and now it works! Deploy with:

```
git push dokku HEAD:main
```

### Dealing with a full disk

If the deploy fails due to the host running out of space (e.g. an immediate
"error: remote unpack failed: unable to create temporary object directory", or
a later "/home/dokku/.basher/bash: line 1: main: command not found", or perhaps
some other error during the remote build), ssh in and do `docker system prune --volumes` and try again.

Also worth trying: `dokku repo:purge-cache <app>` for each app on the server

## TODO

- [ ] it think needs a scale in the corner. something dynamic, like google maps' scale that shows 10 feet or 20 or 50 or 100 feet or 1 mile or 2 or 5 or 10 or 20 miles, etc. but this one is a 2D scale. i dunno, will that be confusing? because each axis isn't linear, it has big leaps when you cross over a padding. still might be a useful visual aid though? so it would show that 18px in the X direction is a second, 136px in the Y direction is a minute, hourGeo.sizeWithPad px in the X is an hour, etc.
- [ ] new idea about the scale -- dynamic little curly braces, `{`, that label intervals on screen. so like center of a second tally to center of next second tally is "1 second", center of minute tally to center of next minute tally is "1 minute (60s)", century tally span is labelled "1 century (3144960000s)", etc. choosing where (and how large) to draw those braces is going to be tricky. want them to fit in the padding whenever possible, i think. also probably want them to track a particular tally pair as long as it's on screen? i dunno.
- [x] a cross-fade from the current geo to the next one encountered during a zoom, so it's not a harsh snapping from one zoom resolution to the next.
- [ ] start animating the live seconds ticking away, and frame the landing page to have the current day in view. maybe we stretch the canvas such that the viewport always shows exactly 1 day at the start? and maybe we use a second axis of X for portrait mode viewports and a second axis of Y for landscape ones, or vice versa. dunno, will have to experiment and see what looks best.
- [ ] landmarks! it's time! figure out how they should look and start inserting some!
- [ ] on touch devices, the thing gets confused about whether you're trying to pinch-zoom the SVG or the whole page. set the page attributes to make it not scalable. and while you're fixing the page, set a better title and favicon
- [x] a FPS plot that shows a window of the last several seconds
- [ ] datestamp labels (on hover? but what about mobile?) -- see https://stackoverflow.com/questions/3768565/drawing-an-svg-file-on-a-html5-canvas

## Notes

### Other possible names

- universal clock
- humanistic universal clock
- entire clock
- impractical clock
- lifeismeaningless.fyi
- youwillbedeadsoon.fyi
- deathiscertain.fyi
- timeisticking.fyi
- yourdaysarenumbered.fyi
- youarenoteternal.fyi
- everysecondcounts.fyi
- everysecond.fyi (fave? except it might give away the scale, compared to something that sounds more like a clock)
- finitude.space
- youarefinite.fyi
- allthetime.fyi
- allthetime.live
- allthetime.space
- clock.quest
- mortality.observer
- big clock

### Ideas

toggle to display seconds as "true epoch seconds" vs modern calendar time. true epoch seconds start with 0 at the big bang, and are currently up to something like 4.32e17 (i'll need to just decide on a mark for 1970-01-01 or whatever), and modern calendar time only gets rendered as far back as the birth of Earth? no, i think i'll render it back to the big bang, because it's more interesting to zoom in on a point far in the past and see it with a humanistic label of "feb 12, 321583828148343 BCE". (i'll probably make some simplification of what a "year" or "week" or "month" is, e.g. maybe there's no feb 29s before the birth of the Earth. might even want to make that kind of simplification for all time... because otherwise i need to decide some cutover, and whatever it is, it'll probably make everything harder if i don't have uniformity in my definitions of a given time span across the entire clock. e.g. i'm imagining i'll need a function to map a zoomable tile coordinate like `[13412,2099,14]` to a window of time like `13 hours centered around the moment that's exactly 432153831243347 seconds ago`. whatever i do here, make note of what it is and why i chose to do it in the "?" button mentioned below)

a "?" button that pops up information about different landmarks, my sources for them, and my decisions about where to place some of them (e.g. i'm going to have to choose a "true epoch second" for some modern-era date, so make note of that kind of thing)

"?" button also talks about the imprecisions. e.g. i'm probably just going to do 7 day weeks, 52 week years for all time. OOOOH or maybe i could add in leap year days and seconds and everything else in the "padding" areas! that would be pretty fun, actually!

toggle to change the end date. 50 years from now, year 3000, death of sun, or heat death of the universe. each gives a different, interesting perspective. what will future timespans look like? just totally blank? hollow outline? if blank, what are the zoom extents? how far out can i zoom?

button to snap (or actually fluidly zoom/pan) you back to the starting view, i.e. just today or just +/-1hr or whatever. (might actually be really hard to do this? does the "static frame of reference" actually need to be the starting scope, rather than the fully zoomed-out universal scale?)

use a gradient for the fill, so different eras are different colors.

Maybe it's more playful, e.g. animation of a robot drawing the seconds with chalk

One "mode" (at /age or /lifespan or /lifetime or /you) prompts you to enter your birthdate. then it renders a view of just 80 years. you can see how far along you are, how much time you have left. if you zoom in, you see that the seconds are ticking. maybe they're labeled with how much time you have left ("50 years, 22 weeks, 3 days, 20 hours, 5 minutes, 10 seconds left"). if you zoom out far enough, all the other tallies fade in from nothing, and maybe your lifespan remains a differen color to give you an idea of how insignificant it is. love this, actually. maybe this is the default mode, and the regular clock is a secondary mode. maybe instead of a hard 80 years, the not-yet-counted tallies fade towards the background color starting at 80 years, ending at 100 or whatever. yeah that seems good. also if you're older than 80, it says "Y years, W weeks, D days, H hours, M minutes, S seconds beyond expectation" or whatever. yeah, i love this. gets it back to my original vision/intent. and it can and will still have landmarks in the past, which show up when you zoom out far enough. but it makes all of that feel more like an easter egg. `everysecondcounts.fyi` is a decent fit for this. or any of the death ones.

Legend on screen showing all landmarks that are within the current viewport. Maybe click to highlight them.

### List of landmarks

- Big Bang
- Sun formed
- Earth formed
- First known lifeforms
- Dinosaurs
- Agriculture
- Jesus
- Other important religions
- Heliocentric theory
- Industrial revolution
- Theory of evolution
- Light bulb
- Telegraph
- Telephone
- Trinity test
- Xerox Alto demo or Mother Of All Demos (and/or some other step transition to PCs)
- Internet
- iPhone
