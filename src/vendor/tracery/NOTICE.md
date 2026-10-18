# Tracery attribution

Tracery by Kate Compton, https://github.com/galaxykate/tracery

Source: root `tracery.js` at commit `11db07cb8e3564477de7b9d1eef0b5bb5bd6f391`.
License: Apache License 2.0; full original license is retained in `LICENSE.MD` and at `/vendor/tracery/LICENSE.MD`.
Original README is retained as `readme.md`. No upstream NOTICE file was present in the inspected tree.

PuffSqueeze modifications (2026-10-15):
- Added an ES module default export and a TypeScript declaration.
- Scoped the original inheritance helper's `Class` inside this module instead of assigning to global `this`.
- Replaced `arguments.callee` with the named `extendClass` function for strict-mode compatibility.
- Replaced the single jQuery `$.extend` call with the upstream file's own native `extend` helper.
- Added a `@ts-nocheck` annotation to retain the original JavaScript implementation without introducing a framework dependency.

The inherited class utility credits John Resig / base2 / Prototype in the original source comments; those comments remain unchanged. All poem vocabularies, templates and the page integration were written for PuffSqueeze.
