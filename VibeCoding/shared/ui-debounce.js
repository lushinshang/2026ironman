// shared/ui-debounce.js
function debounce(fn, ms) {
  if (ms === undefined) ms = 150;
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, ms);
  };
}
