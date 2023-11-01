# Acyclic Clock

It has no cycles. Each moment is unique, and when it's over, it's over.

## Development

Vite is awesome.

```
npm run dev
```

## Deploying

I have a dokku instance set up. I deployed it there with the name "time". After
the first deploy, I had to ssh in and do

```
dokku config:set time NGINX_ROOT=dist
```

and now it works!

## TODO

- [ ] tests?

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
- everysecond.fyi
- finitude.space
- youarefinite.fyi
- allthetime.fyi
- allthetime.live
- allthetime.space
- clock.quest
- mortality.observer

### Ideas

toggle to display seconds as "true epoch seconds" vs modern calendar time. true epoch seconds start with 0 at the big bang, and are currently up to something like 4.32e17 (i'll need to just decide on a mark for 1970-01-01 or whatever), and modern calendar time only gets rendered as far back as the birth of Earth? no, i think i'll render it back to the big bang, because it's more interesting to zoom in on a point far in the past and see it with a humanistic label of "feb 12, 321583828148343 BCE". (i'll probably make some simplification of what a "year" or "week" or "month" is, e.g. maybe there's no feb 29s before the birth of the Earth. might even want to make that kind of simplification for all time... because otherwise i need to decide some cutover, and whatever it is, it'll probably make everything harder if i don't have uniformity in my definitions of a given time span across the entire clock. e.g. i'm imagining i'll need a function to map a zoomable tile coordinate like `[13412,2099,14]` to a window of time like `13 hours centered around the moment that's exactly 432153831243347 seconds ago`. whatever i do here, make note of what it is and why i chose to do it in the "?" button mentioned below)

a "?" button that pops up information about different landmarks, my sources for them, and my decisions about where to place some of them (e.g. i'm going to have to choose a "true epoch second" for some modern-era date, so make note of that kind of thing)

"?" button also talks about the imprecisions. e.g. i'm probably just going to do 7 day weeks, 52 week years for all time. OOOOH or maybe i could add in leap year days and seconds and everything else in the "padding" areas! that would be pretty fun, actually!

toggle to change the end date. 50 years from now, year 3000, death of sun, or heat death of the universe. each gives a different, interesting perspective. what will future timespans look like? just totally blank? hollow outline? if blank, what are the zoom extents? how far out can i zoom?

button to snap (or actually fluidly zoom/pan) you back to the starting view, i.e. just today or just +/-1hr or whatever. (might actually be really hard to do this? does the "static frame of reference" actually need to be the starting scope, rather than the fully zoomed-out universal scale?)

use a gradient for the fill, so different eras are different colors.

Maybe it's more playful, e.g. animation of a robot drawing the seconds with chalk

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
