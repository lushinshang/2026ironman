// shared/ui-toast.js
function showToast(msg, ms) {
  if (ms === undefined) ms = 2000;
  var el = document.getElementById('__shared_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__shared_toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (el.__hideTimer) {
    clearTimeout(el.__hideTimer);
  }
  el.__hideTimer = setTimeout(function () {
    el.classList.remove('show');
  }, ms);
}
