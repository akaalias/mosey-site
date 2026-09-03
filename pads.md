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
<h2 style="margin-top:44px">Same pad, different name</h2>
<p style="max-width:66ch">This list is not the world. Nearly every walking pad is built by a handful of factories in Zhejiang and Guangdong and sold under a local brand — one design can carry five names across Amazon.de, Amazon.com, Otto and Best Buy, and the same brand can switch factories between batches. So the name on the box tells you little. What decides whether Mosey works is the <strong>Bluetooth module</strong> inside, and there are only a few of those:</p>
<div class="table-wrap"><table>
<thead><tr><th>Module family</th><th>How you recognise it</th><th>Mosey</th></tr></thead>
<tbody>
<tr><td class="model">FitShow</td><td class="why">The box says to install the <em>FitShow</em> app; the pad shows up in Bluetooth as <code>FS-…</code>. Made by FitShow (Xiamen), sold to dozens of brands — they publish no list of them.</td><td class="status"><i class="dot likely"></i>Works — the module speaks FTMS beside its own protocol</td></tr>
<tr><td class="model">FitHome</td><td class="why">Bluetooth name like <code>JJ-BT…</code>; the module inside the Sportstech sPad500.</td><td class="status"><i class="dot ok"></i>Works — verified</td></tr>
<tr><td class="model">KingSmith, newer</td><td class="why">WalkingPad Z1, R3, X218; <em>KS Fit</em> app; Bluetooth name <code>KS-HD-…</code>, <code>KS-AP-…</code>, <code>KS-NG-…</code>. Also sold as Toputure.</td><td class="status"><i class="dot likely"></i>Works</td></tr>
<tr><td class="model">KingSmith, older</td><td class="why">WalkingPad A1, C1, C2, R1, R2, X21, K12; <em>KS Fit</em> app. Also the Xiaomi-branded WalkingPads.</td><td class="status"><i class="dot no"></i>Won't — two proprietary protocols, no FTMS</td></tr>
<tr><td class="model">PitPat</td><td class="why">The box says <em>PitPat</em>; Bluetooth name <code>PITPAT-…</code>. DeerRun, Superun and many Amazon brands.</td><td class="status"><i class="dot no"></i>Won't — proprietary with an unlock handshake</td></tr>
<tr><td class="model">Sperax</td><td class="why"><em>Sperax Fitness</em> app; models RM-…</td><td class="status"><i class="dot no"></i>Won't</td></tr>
<tr><td class="model">Zwift or Kinomap on the box</td><td class="why">Whatever the brand: both apps talk only FTMS, so the pad must.</td><td class="status"><i class="dot likely"></i>Works</td></tr>
</tbody></table></div>
<p style="max-width:66ch"><strong>How to check yours in one minute:</strong> turn the pad on, open your phone's Bluetooth settings or the app the box told you to install, and read the device name. <code>FS-…</code>, <code>JJ-BT…</code>, <code>KS-HD/AP/NG-…</code> or a Zwift badge means Mosey will find it. <code>PITPAT-…</code>, <code>RM-…</code> or an older <code>KS-…</code> means it won't. Or just install Mosey: if the pad speaks the standard it appears in the list during setup, and if it doesn't, nothing breaks.</p>

<h2 style="margin-top:44px">Your pad isn't here?</h2>
<p style="max-width:66ch">Install Mosey and look: if your pad speaks the standard it simply appears in the list during setup. If it doesn't, nothing breaks — and <a href="mailto:alexis.rondeau@gmail.com?subject=My%20walking%20pad">an email with the model name</a> gets it onto this page, whichever way it turns out. Evidence for this list comes from the <a href="https://github.com/cagnulein/qdomyos-zwift">QDomyos-Zwift</a> device drivers, the walkingpad-controller and ph4-walkingpad projects, manufacturers' own Zwift and Kinomap pages, and our own pad.</p>
</div>
