// ============================================================
// SalaryInput: input de salario con máscara auto-formato.
//   - Sólo acepta dígitos.
//   - Los separadores (puntos de miles y guión de rango) se
//     insertan automáticamente y son inamovibles.
//   - Cuando el input está vacío, muestra un "hint" con el
//     formato esperado (ej: "3.000–4.000").
//   - El formato depende de: modo (rango/único), moneda (ARS/USD)
//     y frecuencia (por hora / mensual).
//
// Uso:
//   const si = new SalaryInput(inputEl, hintEl, {
//     getMode: () => 'range' | 'single',
//     getCurrency: () => 'usd' | 'ars',
//     getHourly: () => boolean,
//     onChange: () => {},
//   });
//   si.getValue();    // '3.500 – 4.000'
//   si.setValue('3.500 – 4.000');
//   si.refresh();     // recalcula según los getters
//   si.reset();       // vacía
// ============================================================

const FORMATS = {
  usd: {
    monthly: { range: '3.000–4.000',         single: '3.500' },
    hourly:  { range: '25–35',               single: '30' },
  },
  ars: {
    monthly: { range: '2.000.000–2.500.000', single: '2.200.000' },
    hourly:  { range: '15.000–25.000',       single: '20.000' },
  },
};

function countDigits(s) {
  return (String(s).match(/\d/g) || []).length;
}

function formatThousands(digits) {
  if (!digits) return '';
  digits = digits.replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
  // API pública
  // ----------------------------------------------------------
  getValue() {
    return this.input.value;
  }

  setValue(formatted) {
    this.digits = String(formatted || '').replace(/[^0-9]/g, '');
    this._render();
  }

  refresh() {
    // Si el contexto cambia y el formato nuevo tiene menos dígitos
    // permitidos, recortamos.
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

  _render() {
    const format = this._format();

    // Input vacío → hint visible
    if (!this.digits) {
      this.input.value = '';
      if (this.hint) {
        this.hint.textContent = format;
        this.hint.classList.add('visible');
      }
      this.onChange();
      return;
    }

    // Hint oculto cuando hay dígitos
    if (this.hint) {
      this.hint.classList.remove('visible');
    }

    // Distribuir los dígitos: primero min, después max
    const mode = this.getMode();
    if (mode === 'range') {
      const [minFmt, maxFmt] = format.split(/–|-/);
      const minLen = countDigits(minFmt);
      const maxLen = countDigits(maxFmt);

      const minDigits = this.digits.slice(0, minLen);
      const maxDigits = this.digits.slice(minLen, minLen + maxLen);

      const minTxt = formatThousands(minDigits);
      const maxTxt = maxDigits ? formatThousands(maxDigits) : '';

      this.input.value = maxDigits ? `${minTxt} – ${maxTxt}` : minTxt;
    } else {
      // single
      this.input.value = formatThousands(this.digits);
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
    // Backspace: borra el último dígito (no el separador)
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.digits = this.digits.slice(0, -1);
      this._render();
      return;
    }
    // Bloqueamos flechas para evitar reposicionamientos raros
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