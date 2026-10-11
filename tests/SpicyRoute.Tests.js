const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../Extensions/spicy-lyrics.mjs'), 'utf8');
const handler = source.match(/async function oe\(z\)\{.*?\}(?=M\.Event\.listen)/s)?.[0];
assert.ok(handler, 'Spicy Lyrics route handler not found');
const start = source.indexOf('Zt=()=>');
const end = source.indexOf(',Rl=null', start);
assert.ok(start >= 0 && end > start, 'Main-view resolver not found');
const container = { id: 'main-view-container' };
const domContext = vm.createContext({ document: {
  querySelector(selector) { return selector === '#main-view .main-view-container' ? container : null; },
} });
vm.runInContext('globalThis.resolveMainView = ' + source.slice(start + 3, end), domContext);
assert.equal(domContext.resolveMainView(), container, 'Lyrics page lost its mount when Spotify scroll classes changed');
let opened = 0, closed = 0;
const context = vm.createContext({
  a: { debug() {} }, q: { pathname: '/' },
  re: { Open() { opened++; }, async Destroy() { closed++; } },
  d: { Button: { active: false } },
});
vm.runInContext(handler + '; globalThis.routeHandler = oe;', context);
(async () => {
  await context.routeHandler({ location: { pathname: '/SpicyLyrics' }, action: 'PUSH' });
  assert.equal(opened, 1, 'Wrapped history event did not open the lyrics page');
  assert.equal(context.d.Button.active, true);
  await context.routeHandler({ pathname: '/' });
  assert.equal(closed, 1, 'Leaving the lyrics page did not clean it up');
  await context.routeHandler({ pathname: '/SpicyLyrics' });
  assert.equal(opened, 2, 'Legacy history event no longer opens the page');
  console.log('Spicy Lyrics route compatibility: PASS');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
