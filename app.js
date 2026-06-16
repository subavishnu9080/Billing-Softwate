const totalAmountEl = document.getElementById('totalAmount');
const balanceAmountEl = document.getElementById('balanceAmount');
const invoiceNoInput = document.getElementById('invoiceNo');
const invoiceDateInput = document.getElementById('invoiceDate');
const returnDateInput = document.getElementById('returnDate');
const printBtn = document.getElementById('printInvoiceBtn');
const itemsTable = document.querySelector('.items-table');
const MAX_ROWS = 20;
const addRowBtn = document.getElementById('addRowBtn');

const indianCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return indianCurrency.format(value);
}

function getRentalDays() {
  if (!invoiceDateInput || !returnDateInput || !invoiceDateInput.value || !returnDateInput.value) {
    return 1;
  }

  const startDate = new Date(invoiceDateInput.value);
  const endDate = new Date(returnDateInput.value);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 1;
}

function updateAmounts() {
  let total = 0;
  const days = getRentalDays();
  const spans = document.querySelectorAll('.amount[data-row]');
  spans.forEach((span) => {
    const row = span.dataset.row;
    const qtyEl = document.querySelector(`.qty[data-row="${row}"]`);
    const rateEl = document.querySelector(`.rate[data-row="${row}"]`);
    const qty = qtyEl ? Number(qtyEl.value) || 0 : 0;
    const rate = rateEl ? Number(rateEl.value) || 0 : 0;
    const amount = qty * rate * days;
    span.textContent = formatCurrency(amount);
    total += amount;
  });

  totalAmountEl.textContent = formatCurrency(total);
  balanceAmountEl.textContent = formatCurrency(total);
}

function padTwo(n) {
  return String(n).padStart(2, '0');
}

function createRow(rowNum) {
  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = `
    <span>${padTwo(rowNum)}</span>
    <input type="text" placeholder="Product name or description" class="desc" data-row="${rowNum}" />
    <input type="number" min="0" value="0" class="qty" data-row="${rowNum}" />
    <input type="number" min="0" step="0.01" value="0.00" class="rate" data-row="${rowNum}" />
    <span class="amount" data-row="${rowNum}">${formatCurrency(0)}</span>
    <div class="row-actions">
      <button class="add-btn" data-row="${rowNum}">+</button>
      <button class="remove-btn" data-row="${rowNum}">−</button>
    </div>
  `;
  return row;
}

function wireRowEvents(rowNum) {
  const desc = document.querySelector(`.desc[data-row="${rowNum}"]`);
  const qty = document.querySelector(`.qty[data-row="${rowNum}"]`);
  const rate = document.querySelector(`.rate[data-row="${rowNum}"]`);
  const amount = document.querySelector(`.amount[data-row="${rowNum}"]`);

  const onInput = () => updateAmounts();
  if (qty) qty.addEventListener('input', onInput);
  if (rate) rate.addEventListener('input', onInput);

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusNextOrAdd(rowNum);
    }
  };

  if (desc) desc.addEventListener('keydown', handleEnter);
  if (qty) qty.addEventListener('keydown', handleEnter);
  if (rate) rate.addEventListener('keydown', handleEnter);
  // save on change
  const saveHandler = () => saveRowsToStorage();
  if (desc) desc.addEventListener('input', saveHandler);
  if (qty) qty.addEventListener('input', saveHandler);
  if (rate) rate.addEventListener('input', saveHandler);
  // per-row add/remove buttons
  const addBtn = document.querySelector(`.add-btn[data-row="${rowNum}"]`);
  const removeBtn = document.querySelector(`.remove-btn[data-row="${rowNum}"]`);
  if (addBtn) addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRowAfter(rowNum);
  });
  if (removeBtn) removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    removeRow(rowNum);
  });
}

function getCurrentRowCount() {
  return document.querySelectorAll('.amount[data-row]').length;
}

function focusNextOrAdd(currentRow) {
  const next = currentRow + 1;
  const nextDesc = document.querySelector(`.desc[data-row="${next}"]`);
  if (nextDesc) {
    nextDesc.focus();
    return;
  }

  const count = getCurrentRowCount();
  if (count >= MAX_ROWS) return;

  // add a new row
  const newRowNum = count + 1;
  const newRow = createRow(newRowNum);
  // append after the last .table-row
  const lastRow = itemsTable.querySelector('.table-row:last-of-type');
  if (lastRow) itemsTable.insertBefore(newRow, lastRow.nextSibling);
  else itemsTable.appendChild(newRow);
  wireRowEvents(newRowNum);
  updateAmounts();
  const newDesc = document.querySelector(`.desc[data-row="${newRowNum}"]`);
  if (newDesc) newDesc.focus();
}

function getAllRowData() {
  const data = [];
  const amounts = document.querySelectorAll('.amount[data-row]');
  amounts.forEach((span) => {
    const row = parseInt(span.dataset.row, 10);
    const desc = document.querySelector(`.desc[data-row="${row}"]`);
    const qty = document.querySelector(`.qty[data-row="${row}"]`);
    const rate = document.querySelector(`.rate[data-row="${row}"]`);
    data.push({
      desc: desc ? desc.value : '',
      qty: qty ? Number(qty.value) || 0 : 0,
      rate: rate ? Number(rate.value) || 0 : 0,
    });
  });
  return data;
}

function rebuildRowsFromData(rows) {
  // clear existing rows
  const existing = itemsTable.querySelectorAll('.table-row');
  existing.forEach((el) => el.remove());
  const limit = Math.min(rows.length, MAX_ROWS);
  for (let i = 0; i < limit; i++) {
    const rnum = i + 1;
    const row = createRow(rnum);
    itemsTable.appendChild(row);
    const desc = document.querySelector(`.desc[data-row="${rnum}"]`);
    const qty = document.querySelector(`.qty[data-row="${rnum}"]`);
    const rate = document.querySelector(`.rate[data-row="${rnum}"]`);
    if (desc) desc.value = rows[i].desc || '';
    if (qty) qty.value = rows[i].qty || 0;
    if (rate) rate.value = rows[i].rate || 0;
    wireRowEvents(rnum);
  }
  updateAmounts();
  saveRowsToStorage();
}

function addRowAfter(rowNum) {
  const rows = getAllRowData();
  if (rows.length >= MAX_ROWS) return;
  const idx = rowNum; // insert after current (0-based index = rowNum)
  rows.splice(idx, 0, { desc: '', qty: 0, rate: 0 });
  rebuildRowsFromData(rows);
  const newIndex = idx + 1; // 1-based
  const newDesc = document.querySelector(`.desc[data-row="${newIndex}"]`);
  if (newDesc) newDesc.focus();
}

function removeRow(rowNum) {
  const rows = getAllRowData();
  if (rows.length <= 2) return; // enforce minimum 2 rows
  const idx = rowNum - 1;
  rows.splice(idx, 1);
  rebuildRowsFromData(rows);
  const target = Math.min(rows.length, rowNum); // focus same index or last
  const desc = document.querySelector(`.desc[data-row="${target}"]`);
  if (desc) desc.focus();
}

// wire existing rows on load
function initRows() {
  // try to load saved rows first
  if (loadRowsFromStorage()) return;
  const amounts = document.querySelectorAll('.amount[data-row]');
  amounts.forEach((span) => {
    const rowNum = parseInt(span.dataset.row, 10);
    wireRowEvents(rowNum);
  });
}

initRows();
updateAmounts();

function saveRowsToStorage() {
  const rows = [];
  const amounts = document.querySelectorAll('.amount[data-row]');
  amounts.forEach((span) => {
    const row = parseInt(span.dataset.row, 10);
    const desc = document.querySelector(`.desc[data-row="${row}"]`);
    const qty = document.querySelector(`.qty[data-row="${row}"]`);
    const rate = document.querySelector(`.rate[data-row="${row}"]`);
    rows.push({
      desc: desc ? desc.value : '',
      qty: qty ? Number(qty.value) || 0 : 0,
      rate: rate ? Number(rate.value) || 0 : 0,
    });
  });
  try {
    localStorage.setItem('invoiceRows', JSON.stringify(rows));
  } catch (e) {
    console.warn('Could not save invoice rows', e);
  }
}

function loadRowsFromStorage() {
  try {
    const raw = localStorage.getItem('invoiceRows');
    if (!raw) return false;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length === 0) return false;

    // remove existing rows
    const existing = itemsTable.querySelectorAll('.table-row');
    existing.forEach((el) => el.remove());

    // recreate rows from saved data (limit to MAX_ROWS)
    const limit = Math.min(rows.length, MAX_ROWS);
    for (let i = 0; i < limit; i++) {
      const rnum = i + 1;
      const row = createRow(rnum);
      itemsTable.appendChild(row);
      const desc = document.querySelector(`.desc[data-row="${rnum}"]`);
      const qty = document.querySelector(`.qty[data-row="${rnum}"]`);
      const rate = document.querySelector(`.rate[data-row="${rnum}"]`);
      if (desc) desc.value = rows[i].desc || '';
      if (qty) qty.value = rows[i].qty || 0;
      if (rate) rate.value = rows[i].rate || 0;
      wireRowEvents(rnum);
    }
    updateAmounts();
    return true;
  } catch (e) {
    console.warn('Could not load invoice rows', e);
    return false;
  }
}

// add row button
if (addRowBtn) {
  addRowBtn.addEventListener('click', () => {
    const count = getCurrentRowCount();
    if (count >= MAX_ROWS) return;
    const newRowNum = count + 1;
    const newRow = createRow(newRowNum);
    const lastRow = itemsTable.querySelector('.table-row:last-of-type');
    if (lastRow) itemsTable.insertBefore(newRow, lastRow.nextSibling);
    else itemsTable.appendChild(newRow);
    wireRowEvents(newRowNum);
    updateAmounts();
    saveRowsToStorage();
  });
}

if (invoiceDateInput) {
  invoiceDateInput.addEventListener('change', updateAmounts);
}
if (returnDateInput) {
  returnDateInput.addEventListener('change', updateAmounts);
}

function refreshInvoiceDisplay() {
  if (!invoiceNoInput) return;
  const last = getLastInvoiceNumber();
  const next = last + 1;
  invoiceNoInput.value = padNumber(next, 3);
}

// Increment stored invoice number after printing completes
window.addEventListener('afterprint', () => {
  const last = getLastInvoiceNumber();
  const printed = last + 1;
  setLastInvoiceNumber(printed);
  // update display to the next number
  refreshInvoiceDisplay();
});

// Print button triggers print dialog (increment happens in afterprint)
if (printBtn) {
  printBtn.addEventListener('click', () => {
    window.print();
  });
}

// initialize displayed invoice number on load
refreshInvoiceDisplay();
