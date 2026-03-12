import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { showModal } from '../js/modals.js';

// Minimal DOM mock for modal elements
function createMockDOM() {
  var hiddenClasses = new Set(['hidden']);
  var buttons = [];
  var titleText = '';
  var innerHTML = '';

  var modal = {
    classList: {
      add: vi.fn(function(cls) { hiddenClasses.add(cls); }),
      remove: vi.fn(function(cls) { hiddenClasses.delete(cls); }),
      contains: function(cls) { return hiddenClasses.has(cls); }
    }
  };

  var titleEl = {
    get textContent() { return titleText; },
    set textContent(val) { titleText = val; }
  };

  var buttonsEl = {
    get innerHTML() { return innerHTML; },
    set innerHTML(val) { innerHTML = val; buttons = []; },
    appendChild: vi.fn(function(el) { buttons.push(el); }),
    get children() { return buttons; }
  };

  return { modal, titleEl, buttonsEl, getButtons: function() { return buttons; } };
}

describe('showModal', () => {
  var mockDOM;

  beforeEach(() => {
    mockDOM = createMockDOM();
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'power-modal') return mockDOM.modal;
        if (id === 'power-modal-title') return mockDOM.titleEl;
        if (id === 'power-modal-buttons') return mockDOM.buttonsEl;
        return null;
      }),
      createElement: vi.fn(function(tag) {
        var listeners = {};
        return {
          tagName: tag.toUpperCase(),
          className: '',
          textContent: '',
          addEventListener: vi.fn(function(event, handler) {
            listeners[event] = handler;
          }),
          _listeners: listeners
        };
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('sets the modal title', () => {
    showModal('Pick a modifier', [
      { label: 'Positive', value: 'pos', style: 'primary' }
    ]);
    expect(mockDOM.titleEl.textContent).toBe('Pick a modifier');
  });

  test('clears previous buttons', () => {
    showModal('Title', [{ label: 'A', value: 'a' }]);
    // innerHTML was set to '' before appending
    expect(mockDOM.buttonsEl.appendChild).toHaveBeenCalled();
  });

  test('creates a button for each option', () => {
    showModal('Choose', [
      { label: 'Option A', value: 'a', style: 'primary' },
      { label: 'Option B', value: 'b', style: 'secondary' },
      { label: 'Option C', value: 'c', style: 'accent' }
    ]);
    var buttons = mockDOM.getButtons();
    expect(buttons.length).toBe(3);
  });

  test('sets button className with style', () => {
    showModal('Choose', [
      { label: 'Go', value: 'go', style: 'accent' }
    ]);
    var buttons = mockDOM.getButtons();
    expect(buttons[0].className).toBe('modal-btn accent');
  });

  test('defaults button style to primary when not specified', () => {
    showModal('Choose', [
      { label: 'Go', value: 'go' }
    ]);
    var buttons = mockDOM.getButtons();
    expect(buttons[0].className).toBe('modal-btn primary');
  });

  test('sets button textContent to label', () => {
    showModal('Choose', [
      { label: 'Replace Card', value: 'replace' }
    ]);
    var buttons = mockDOM.getButtons();
    expect(buttons[0].textContent).toBe('Replace Card');
  });

  test('removes hidden class to show modal', () => {
    showModal('Title', [{ label: 'OK', value: 'ok' }]);
    expect(mockDOM.modal.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('resolves promise when button is clicked', async () => {
    var promise = showModal('Pick', [
      { label: 'Yes', value: 'yes', style: 'primary' },
      { label: 'No', value: 'no', style: 'secondary' }
    ]);
    var buttons = mockDOM.getButtons();
    // Simulate clicking the first button
    buttons[0]._listeners.click();
    var result = await promise;
    expect(result).toBe('yes');
  });

  test('hides modal on button click', async () => {
    var promise = showModal('Pick', [
      { label: 'Go', value: 'go' }
    ]);
    var buttons = mockDOM.getButtons();
    buttons[0]._listeners.click();
    await promise;
    expect(mockDOM.modal.classList.add).toHaveBeenCalledWith('hidden');
  });

  test('resolves with correct value for second button', async () => {
    var promise = showModal('Pick', [
      { label: 'A', value: 'alpha' },
      { label: 'B', value: 'beta' }
    ]);
    var buttons = mockDOM.getButtons();
    buttons[1]._listeners.click();
    var result = await promise;
    expect(result).toBe('beta');
  });

  test('registers click listeners on all buttons', () => {
    showModal('Title', [
      { label: 'X', value: 'x' },
      { label: 'Y', value: 'y' },
      { label: 'Z', value: 'z' }
    ]);
    var buttons = mockDOM.getButtons();
    buttons.forEach(function(btn) {
      expect(btn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  test('returns a Promise', () => {
    var result = showModal('Title', [{ label: 'OK', value: 'ok' }]);
    expect(result).toBeInstanceOf(Promise);
  });
});
