// ========================================
// KAPOW! - Modal System
// ========================================
// Ported from kapow.js lines 4847-4869.
// Custom modal for power card choices (replaces browser confirm dialogs).

// Custom modal for power card choices (replaces browser confirm dialogs)
export function showModal(title, buttons) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('power-modal');
    var titleEl = document.getElementById('power-modal-title');
    var buttonsEl = document.getElementById('power-modal-buttons');

    titleEl.textContent = title;
    buttonsEl.innerHTML = '';

    buttons.forEach(function(btn) {
      var buttonEl = document.createElement('button');
      buttonEl.className = 'modal-btn ' + (btn.style || 'primary');
      buttonEl.textContent = btn.label;
      buttonEl.addEventListener('click', function() {
        modal.classList.add('hidden');
        resolve(btn.value);
      });
      buttonsEl.appendChild(buttonEl);
    });

    modal.classList.remove('hidden');
  });
}
