const STORAGE_KEY = 'cashflow-dashboard-v1';
const budgetValue = document.getElementById('budgetValue');
const incomeTotalEl = document.getElementById('incomeTotal');
const expenseTotalEl = document.getElementById('expenseTotal');
const balanceTotalEl = document.getElementById('balanceTotal');
const savingsTotalEl = document.getElementById('savingsTotal');
const summaryList = document.getElementById('summaryList');
const chart = document.getElementById('chart');
const transactionRows = document.getElementById('transactionRows');
const monthLabel = document.getElementById('monthLabel');
const modal = document.getElementById('modal');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const transactionForm = document.getElementById('transactionForm');

const categoryPalette = {
  Food: '#7dd3fc',
  Transport: '#a78bfa',
  Housing: '#4adea0',
  Shopping: '#fbbf24',
  Bills: '#f87171',
  Salary: '#22c55e',
  Freelance: '#22d3ee',
  Other: '#c4b5fd'
};

let budget = 5000;
let transactions = loadTransactions();

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function getTotals() {
  let income = 0;
  let expenses = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      income += Number(tx.amount);
    } else {
      expenses += Number(tx.amount);
    }
  });

  return {
    income,
    expenses,
    balance: income - expenses,
    savings: Math.max(income - expenses, 0)
  };
}

function renderStats() {
  const totals = getTotals();
  budgetValue.textContent = formatCurrency(budget);
  incomeTotalEl.textContent = formatCurrency(totals.income);
  expenseTotalEl.textContent = formatCurrency(totals.expenses);
  balanceTotalEl.textContent = formatCurrency(totals.balance);
  savingsTotalEl.textContent = formatCurrency(totals.savings);
  monthLabel.textContent = new Date().toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function renderSummary() {
  const grouped = {};
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      grouped[tx.category] = (grouped[tx.category] || 0) + Number(tx.amount);
    });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;

  summaryList.innerHTML = '';

  entries.forEach(([category, value]) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      <div class="summary-left">
        <span class="dot" style="background:${categoryPalette[category] || '#9bb1c9'}"></span>
        <div>
          <strong>${category}</strong>
          <span>${((value / total) * 100).toFixed(0)}% of spend</span>
        </div>
      </div>
      <strong>${formatCurrency(value)}</strong>
    `;
    summaryList.appendChild(item);
  });
}

function renderChart() {
  const grouped = {};
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      grouped[tx.category] = (grouped[tx.category] || 0) + Number(tx.amount);
    });

  chart.innerHTML = '';
  const values = Object.values(grouped);
  const max = Math.max(...values, 1);

  const categories = ['Food', 'Transport', 'Housing', 'Shopping', 'Bills', 'Other'];
  categories.forEach((category) => {
    const value = grouped[category] || 0;
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.title = `${category}: ${formatCurrency(value)}`;
    bar.style.height = `${(value / max) * 100}%`;
    bar.style.background = `linear-gradient(180deg, ${categoryPalette[category] || '#9bb1c9'} 0%, rgba(255,255,255,0.12) 100%)`;
    wrap.appendChild(bar);
    chart.appendChild(wrap);
  });
}

function renderTransactions() {
  transactionRows.innerHTML = '';

  [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .forEach((tx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tx.title}</td>
        <td>${tx.category}</td>
        <td>${tx.type === 'income' ? 'Income' : 'Expense'}</td>
        <td>${new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="${tx.type === 'income' ? 'amount-income' : 'amount-expense'}">${tx.type === 'income' ? '+' : '-'}${formatCurrency(Number(tx.amount))}</td>
        <td><button type="button" class="delete-btn" data-id="${tx.id}" aria-label="Delete ${tx.title}">×</button></td>
      `;
      transactionRows.appendChild(row);
    });

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      transactions = transactions.filter((tx) => tx.id !== button.dataset.id);
      saveTransactions();
      renderDashboard();
    });
  });
}

function renderDashboard() {
  renderStats();
  renderSummary();
  renderChart();
  renderTransactions();
}

function openModal() {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

addTransactionBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

transactionForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const tx = {
    id: crypto.randomUUID(),
    title: document.getElementById('titleInput').value.trim(),
    type: document.getElementById('typeInput').value,
    category: document.getElementById('categoryInput').value,
    date: document.getElementById('dateInput').value,
    amount: Number(document.getElementById('amountInput').value)
  };

  if (!tx.title || !tx.date || Number.isNaN(tx.amount) || tx.amount <= 0) {
    return;
  }

  transactions.push(tx);
  saveTransactions();
  transactionForm.reset();
  closeModal();
  renderDashboard();
});

renderDashboard();
