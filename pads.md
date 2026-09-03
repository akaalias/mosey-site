---
layout: default
title: Which pads work
permalink: /pads/
description: Every walking pad and treadmill we know the Bluetooth protocol of — verified, should work, won't work — and a search box for yours.
---

<div class="prose" style="max-width:none;padding-top:28px">
<div class="kicker">Which pads work</div>
<h1 style="font-size:46px;line-height:1.08;margin:14px 0 18px;max-width:22ch">If your pad speaks Bluetooth FTMS, it works. Here's who does.</h1>
<p style="max-width:66ch">Mosey contains no pad-specific code. It looks for the standard <em>Fitness Machine Service</em> that many pads broadcast, reads speed and incline from it, and drives the belt through it. So the question is never "does Mosey support my pad" but "does my pad speak the standard". Two rules of thumb: a listing that says <strong>Zwift</strong> or <strong>Kinomap</strong> compatible almost certainly does; one that says "works with our app only" almost certainly doesn't. Pads without incline walk the same rounds flat.</p>

{% include pads-table.html %}
<h2 style="margin-top:44px">Your pad isn't here?</h2>
<p style="max-width:66ch">Install Mosey and look: if your pad speaks the standard it simply appears in the list during setup. If it doesn't, nothing breaks — and <a href="mailto:alexis.rondeau@gmail.com?subject=My%20walking%20pad">an email with the model name</a> gets it onto this page, whichever way it turns out. Evidence for this list comes from the <a href="https://github.com/cagnulein/qdomyos-zwift">QDomyos-Zwift</a> device drivers, the walkingpad-controller and ph4-walkingpad projects, manufacturers' own Zwift and Kinomap pages, and our own pad.</p>
</div>
