(() => {

  const API_BASE = 'https://laptop-price-prediciton-2.onrender.com';

  // ---- Fallback option lists (used if /metadata is unreachable) ----
  const FALLBACK = {
    companies: ['Acer', 'Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'MSI', 'Toshiba'],
    type_names: ['2 in 1 Convertible', 'Gaming', 'Netbook', 'Notebook', 'Ultrabook', 'Workstation'],
    ram_options: [2, 4, 6, 8, 12, 16, 24, 32, 64],
    cpus: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'AMD Processor', 'Other Intel Processor'],
    gpus: ['Intel', 'Nvidia', 'AMD'],
    op_systems: ['Windows', 'Mac', 'Linux', 'No OS'],
  };

  // Not part of the dataset's dynamic metadata, so kept as fixed lists.
  const RESOLUTIONS = [
    '1366x768', '1600x900', '1920x1080', '1920x1200', '2160x1440',
    '2256x1504', '2304x1440', '2560x1440', '2560x1600', '2736x1824',
    '3200x1800', '3840x2160',
  ];
  const SSD_OPTIONS = [0, 8, 16, 32, 64, 128, 180, 240, 256, 512, 1000];
  const HDD_OPTIONS = [0, 128, 500, 1000, 2000];

  // ---- Element references ----
  const form = document.getElementById('predict-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');
  const apiStatusNote = document.getElementById('api-status-note');
  const scanLine = document.getElementById('scan-line');
  const screenContent = document.getElementById('screen-content');
  const ticketLines = document.getElementById('ticket-lines');
  const ticketTotal = document.getElementById('ticket-total');
  const ticketTotalAmount = document.getElementById('ticket-total-amount');
  const ticketDate = document.getElementById('ticket-date');

  const selects = {
    company: document.getElementById('company'),
    typeName: document.getElementById('typeName'),
    cpu: document.getElementById('cpu'),
    gpu: document.getElementById('gpu'),
    ram: document.getElementById('ram'),
    ssd: document.getElementById('ssd'),
    hdd: document.getElementById('hdd'),
    resolution: document.getElementById('resolution'),
    os: document.getElementById('os'),
  };
  const weightInput = document.getElementById('weight');
  const screenSizeInput = document.getElementById('screenSize');
  const touchscreenToggle = document.getElementById('touchscreen');
  const ipsToggle = document.getElementById('ips');

  // ---- Init ----
  ticketDate.textContent = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
  });

  function fillSelect(select, values, placeholder) {
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.disabled = true;
    opt.selected = true;
    opt.textContent = placeholder;
    select.appendChild(opt);
    values.forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  function fillPlainSelect(select, values) {
    select.innerHTML = '';
    values.forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  async function loadMetadata() {
    try {
      const res = await fetch(`${API_BASE}/metadata`);
      if (!res.ok) throw new Error(`Metadata request failed (${res.status})`);
      const data = await res.json();

      fillSelect(selects.company, data.companies?.length ? data.companies : FALLBACK.companies, 'Select manufacturer…');
      fillSelect(selects.typeName, data.type_names?.length ? data.type_names : FALLBACK.type_names, 'Select type…');
      fillSelect(selects.cpu, data.cpus?.length ? data.cpus : FALLBACK.cpus, 'Select processor…');
      fillSelect(selects.gpu, data.gpus?.length ? data.gpus : FALLBACK.gpus, 'Select GPU brand…');
      fillSelect(selects.ram, data.ram_options?.length ? data.ram_options : FALLBACK.ram_options, 'Select RAM…');
      fillSelect(selects.os, data.op_systems?.length ? data.op_systems : FALLBACK.op_systems, 'Select OS…');

      apiStatusNote.textContent = 'Connected to prediction API.';
    } catch (err) {
      // Fall back to static lists so the form stays usable offline.
      fillSelect(selects.company, FALLBACK.companies, 'Select manufacturer…');
      fillSelect(selects.typeName, FALLBACK.type_names, 'Select type…');
      fillSelect(selects.cpu, FALLBACK.cpus, 'Select processor…');
      fillSelect(selects.gpu, FALLBACK.gpus, 'Select GPU brand…');
      fillSelect(selects.ram, FALLBACK.ram_options, 'Select RAM…');
      fillSelect(selects.os, FALLBACK.op_systems, 'Select OS…');

      apiStatusNote.textContent = 'Could not reach /metadata — using default option lists. Check that the FastAPI server is running.';
    }

    // Fixed lists, independent of the backend metadata endpoint.
    fillPlainSelect(selects.resolution, RESOLUTIONS);
    selects.resolution.value = '1920x1080';
    fillPlainSelect(selects.ssd, SSD_OPTIONS);
    selects.ssd.value = '256';
    fillPlainSelect(selects.hdd, HDD_OPTIONS);
    selects.hdd.value = '0';

    updateTicket();
  }

  // ---- Toggles ----
  function bindToggle(button) {
    button.addEventListener('click', () => {
      const isOn = button.dataset.value === '1';
      const next = isOn ? '0' : '1';
      button.dataset.value = next;
      button.setAttribute('aria-checked', next === '1' ? 'true' : 'false');
      updateTicket();
    });
  }
  bindToggle(touchscreenToggle);
  bindToggle(ipsToggle);

  // ---- Ticket (live spec summary) ----
  function updateTicket() {
    const rows = [
      ['Manufacturer', selects.company.value],
      ['Type', selects.typeName.value],
      ['Processor', selects.cpu.value],
      ['GPU', selects.gpu.value],
      ['RAM', selects.ram.value ? `${selects.ram.value} GB` : ''],
      ['SSD', selects.ssd.value !== '' ? `${selects.ssd.value} GB` : ''],
      ['HDD', selects.hdd.value !== '' ? `${selects.hdd.value} GB` : ''],
      ['Screen', screenSizeInput.value ? `${screenSizeInput.value}"` : ''],
      ['Resolution', selects.resolution.value],
      ['Touchscreen', touchscreenToggle.dataset.value === '1' ? 'Yes' : 'No'],
      ['IPS panel', ipsToggle.dataset.value === '1' ? 'Yes' : 'No'],
      ['Weight', weightInput.value ? `${weightInput.value} kg` : ''],
      ['OS', selects.os.value],
    ];

    ticketLines.innerHTML = '';
    const filled = rows.filter(([, v]) => v);

    if (!filled.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Fill in the form to build the spec ticket…';
      ticketLines.appendChild(li);
      return;
    }

    rows.forEach(([label, value]) => {
      const li = document.createElement('li');
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = value || '—';
      li.appendChild(l);
      li.appendChild(v);
      ticketLines.appendChild(li);
    });
  }

  [selects.company, selects.typeName, selects.cpu, selects.gpu, selects.ram,
    selects.ssd, selects.hdd, selects.resolution, selects.os].forEach((el) =>
    el.addEventListener('change', updateTicket)
  );
  [weightInput, screenSizeInput].forEach((el) => el.addEventListener('input', updateTicket));

  // ---- Screen state helpers ----
  function setScreenIdle() {
    scanLine.classList.remove('active');
    screenContent.innerHTML = '<span class="screen-idle">Awaiting configuration</span>';
  }

  function setScreenLoading() {
    scanLine.classList.add('active');
    screenContent.innerHTML = '<span class="screen-loading">Analyzing spec sheet…</span>';
  }

  function setScreenError(message) {
    scanLine.classList.remove('active');
    screenContent.innerHTML = `<span class="screen-error">${escapeHtml(message)}</span>`;
  }

  function setScreenResult(price, currency) {
    scanLine.classList.remove('active');
    screenContent.innerHTML = `
      <div class="screen-result">
        <span class="price-label">Estimated price</span>
        <span class="price-value" id="price-value">${currency} 0</span>
      </div>`;
    animateCountUp(price, currency);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatCurrency(value, currency) {
    const formatted = Math.round(value).toLocaleString('en-IN');
    return currency === 'INR' ? `₹${formatted}` : `${currency} ${formatted}`;
  }

  function animateCountUp(target, currency) {
    const el = document.getElementById('price-value');
    if (!el) return;
    const duration = 700;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = formatCurrency(current, currency);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---- Validation ----
  function validate(values) {
    const errors = [];
    if (!values.company) errors.push('Select a manufacturer.');
    if (!values.type_name) errors.push('Select a laptop type.');
    if (!values.cpu) errors.push('Select a processor.');
    if (!values.gpu) errors.push('Select a GPU brand.');
    if (!values.ram) errors.push('Select a RAM size.');
    if (!values.os) errors.push('Select an operating system.');
    if (!values.resolution || !/^\d+x\d+$/.test(values.resolution)) {
      errors.push('Select a valid resolution.');
    }
    if (!values.weight || values.weight <= 0) errors.push('Enter a weight greater than 0.');
    if (!values.screen_size || values.screen_size <= 0) errors.push('Enter a valid screen size.');
    return errors;
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearFormError() {
    formError.hidden = true;
    formError.textContent = '';
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError();

    const payload = {
      company: selects.company.value,
      type_name: selects.typeName.value,
      ram: Number(selects.ram.value),
      weight: Number(weightInput.value),
      touchscreen: Number(touchscreenToggle.dataset.value),
      ips: Number(ipsToggle.dataset.value),
      screen_size: Number(screenSizeInput.value),
      resolution: selects.resolution.value,
      cpu: selects.cpu.value,
      hdd: Number(selects.hdd.value),
      ssd: Number(selects.ssd.value),
      gpu: selects.gpu.value,
      os: selects.os.value,
    };

    const errors = validate(payload);
    if (errors.length) {
      showFormError(errors.join(' '));
      return;
    }

    setLoading(true);
    setScreenLoading();
    ticketTotal.hidden = true;

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const detail = extractErrorDetail(data) || `Request failed with status ${res.status}.`;
        throw new Error(detail);
      }

      if (data?.status !== 'success' || typeof data.predicted_price !== 'number') {
        throw new Error('Unexpected response from the prediction API.');
      }

      setScreenResult(data.predicted_price, data.currency || 'INR');
      ticketTotalAmount.textContent = formatCurrency(data.predicted_price, data.currency || 'INR');
      ticketTotal.hidden = false;
    } catch (err) {
      const message = err instanceof TypeError
        ? 'Cannot reach the API. Make sure the FastAPI server is running at 127.0.0.1:8000.'
        : err.message;
      setScreenError(message);
      showFormError(message);
    } finally {
      setLoading(false);
    }
  });

  function extractErrorDetail(data) {
    if (!data) return null;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      // FastAPI/Pydantic validation error format
      return data.detail
        .map((d) => `${(d.loc || []).slice(-1)[0] || 'field'}: ${d.msg}`)
        .join(' ');
    }
    return null;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('loading', isLoading);
    submitBtn.querySelector('.btn-label').textContent = isLoading ? 'Estimating' : 'Estimate price';
  }

  setScreenIdle();
  loadMetadata();
})();
