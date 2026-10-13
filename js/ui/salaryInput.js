// ============================================================
// SalaryInput: salary input with auto-format mask.
//   - Only digits are accepted.
//   - Separators (thousand dots and range dash) are inserted
//     automatically and cannot be moved.
//   - When empty, shows a hint with the expected format
//     (e.g. "3,000–4,000").
//   - Format depends on: mode (range/single), currency (ARS/USD)
//     and frequency (hourly / monthly).
//
// Usage:
//   const si = new SalaryInput(inputEl, hintEl, {
//     getMode: () => 'range' | 'single',
//     getCurrency: () => 'usd' | 'ars',
//     getHourly: () => boolean,
//     onChange: () => {},
//   });
//   si.getValue();    // '3,500 – 4,000'
//   si.setValue('3,500 – 4,000');
//   si.refresh();     // recomputes from the getters
//   si.reset();       // clears
// ============================================================

const FORMATS = {
  usd: {
    monthly: { range: '3,000–4,000',         single: '3,500' },
    hourly:  { range: '25–35',               single: '30' },
  },
  ars: {
    monthly: { range: '2,000,000–2,500,000', single: '2,200,000' },
    hourly:  { range: '15,000–25,000',       single: '20,000' },
  },
};

// Currency symbols. Edit these if you prefer "$" or "U$S".
const CURRENCY_SYMBOLS = {
  ars: 'ARS ',
  usd: 'USD ',
};

function countDigits(s) {
  return (String(s).match(/\d/g) || []).length;
}

function formatThousands(digits) {
  if (!digits) return '';
  digits = digits.replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export class SalaryInput {
  constructor(inputEl, hintEl, opts = {}) {
    this.input = inputEl;
    this.hint = hintEl;
    this.getMode = opts.getMode || (() => 'range');
    this.getCurrency = opts.getCurrency || (() => 'usd');
    this.getHourly = opts.getHourly || (() => false);
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};

    this.digits = '';

    this._onInput = this._onInput.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onPaste = this._onPaste.bind(this);

    this.input.addEventListener('input', this._onInput);
    this.input.addEventListener('keydown', this._onKeyDown);
    this.input.addEventListener('paste', this._onPaste);

    this._render();
  }

  destroy() {
    this.input.removeEventListener('input', this._onInput);
    this.input.removeEventListener('keydown', this._onKeyDown);
    this.input.removeEventListener('paste', this._onPaste);
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  getValue() {
    return this.input.value;
  }

  setValue(formatted) {
    this.digits = String(formatted || '').replace(/[^0-9]/g, '');
    this._render();
  }

  refresh() {
    // If the context changed and the new format allows fewer digits,
    // truncate.
    const max = this._maxDigits();
    if (this.digits.length > max) {
      this.digits = this.digits.slice(0, max);
    }
    this._render();
  }

  reset() {
    this.digits = '';
    this._render();
  }

  // ----------------------------------------------------------
  // Internals
  // ----------------------------------------------------------
  _format() {
    const cur = this.getCurrency();
    const freq = this.getHourly() ? 'hourly' : 'monthly';
    const mode = this.getMode();
    return FORMATS[cur][freq][mode] || '';
  }

  _maxDigits() {
    return countDigits(this._format());
  }

  _getSymbol() {
    return CURRENCY_SYMBOLS[this.getCurrency()] || '';
  }

  _render() {
    const format = this._format();
    const symbol = this._getSymbol();

    // Empty input → show hint.
    if (!this.digits) {
      this.input.value = '';
      if (this.hint) {
        this.hint.textContent = symbol + format;
        this.hint.classList.add('visible');
      }
      this.onChange();
      return;
    }

    // Hide hint when there are digits.
    if (this.hint) {
      this.hint.classList.remove('visible');
    }

    // Distribute the digits: min first, then max.
    const mode = this.getMode();
    if (mode === 'range') {
      const [minFmt, maxFmt] = format.split(/–|-/);
      const minLen = countDigits(minFmt);
      const maxLen = countDigits(maxFmt);

      const minDigits = this.digits.slice(0, minLen);
      const maxDigits = this.digits.slice(minLen, minLen + maxLen);

      const minTxt = formatThousands(minDigits);
      const maxTxt = maxDigits ? formatThousands(maxDigits) : '';

      this.input.value = maxDigits
        ? `${symbol}${minTxt} – ${maxTxt}`
        : `${symbol}${minTxt}`;
    } else {
      // single
      this.input.value = symbol + formatThousands(this.digits);
    }

    this.onChange();
  }

  _onInput() {
    const raw = this.input.value;
    this.digits = raw.replace(/[^0-9]/g, '');
    const max = this._maxDigits();
    this.digits = this.digits.slice(0, max);
    this._render();
  }

  _onKeyDown(e) {
    // Backspace: delete the last digit (not the separator).
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.digits = this.digits.slice(0, -1);
      this._render();
      return;
    }
    // Block arrows to avoid weird repositioning.
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Delete'].includes(e.key)) {
      e.preventDefault();
    }
  }

  _onPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text') || '';
    const pasted = text.replace(/[^0-9]/g, '');
    const max = this._maxDigits();
    this.digits = (this.digits + pasted).slice(0, max);
    this._render();
  }
}