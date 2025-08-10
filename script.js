let currentMonth = '';
let budgetData = {};
let expenseData = {};

document.addEventListener('DOMContentLoaded', () => {
    populateMonthSelector();

    document.getElementById('newMonth').addEventListener('click', () => {
        const selectedMonth = prompt("Enter new month (e.g., August 2025):");
        if (selectedMonth) {
            currentMonth = selectedMonth;
            budgetData[currentMonth] = { total: 0, categories: {} };
            expenseData[currentMonth] = [];
            saveData();
            document.getElementById('plannerSection').style.display = 'block';
            updateMonthSelector();
        }
    });

    document.getElementById('monthSelector').addEventListener('change', (e) => {
        currentMonth = e.target.value;
        if (currentMonth) {
            document.getElementById('plannerSection').style.display = 'block';
            displayAllocatedBudgets();
            updateCategoryDropdown();
            updateExpenseDateFilter();
            updateSummaryDateFilter();
        }
    });

    document.getElementById('setBudget').addEventListener('click', () => {
        const total = parseFloat(document.getElementById('totalBudget').value);
        const categoryInput = document.getElementById('categories').value;
        const categoryLines = categoryInput.split('\n');
        let sum = 0;
        const categories = {};

        categoryLines.forEach(line => {
            const [cat, percent] = line.split(':');
            const p = parseFloat(percent);
            if (!isNaN(p)) {
                sum += p;
                categories[cat.trim()] = (p / 100) * total;
            }
        });

        if (sum !== 100) {
            alert("Category percentages must sum to 100.");
            return;
        }

        budgetData[currentMonth] = { total, categories };
        saveData();
        displayAllocatedBudgets();
        updateCategoryDropdown();
    });

    document.getElementById('addExpense').addEventListener('click', () => {
        const date = document.getElementById('expenseDate').value;
        const desc = document.getElementById('expenseDesc').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;

        if (!date || !desc || isNaN(amount) || !category) return;

        if (!expenseData[currentMonth]) expenseData[currentMonth] = [];

        expenseData[currentMonth].push({ date, desc, amount, category });
        saveData();
        updateExpenseDateFilter();
        updateSummaryDateFilter();
        showExpensesForDate(date);
    });

    document.getElementById('expenseDateFilter').addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        showExpensesForDate(selectedDate);
    });

    document.getElementById('viewSummary').addEventListener('click', () => {
        const selectedDate = document.getElementById('summaryDateFilter').value;
        showSummaryForDate(selectedDate);
    });

    document.getElementById('downloadCSV').addEventListener('click', () => {
        const rows = [["Date", "Description", "Amount", "Category"]];
        expenseData[currentMonth]?.forEach(exp => {
            rows.push([exp.date, exp.desc, exp.amount, exp.category]);
        });

        const csv = rows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${currentMonth}-expenses.csv`;
        a.click();
    });

    document.getElementById('viewYearlySummary').addEventListener('click', () => {
        showYearlySummary();
    });

    document.getElementById('clearAllData').addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all data?")) {
            localStorage.clear();
            location.reload();
        }
    });
});

function populateMonthSelector() {
    const storedBudget = localStorage.getItem("budgetData");
    const storedExpense = localStorage.getItem("expenseData");
    if (storedBudget) budgetData = JSON.parse(storedBudget);
    if (storedExpense) expenseData = JSON.parse(storedExpense);

    updateMonthSelector();
}

function updateMonthSelector() {
    const selector = document.getElementById('monthSelector');
    selector.innerHTML = '<option value="">-- Select Month --</option>';
    Object.keys(budgetData).forEach(month => {
        const opt = document.createElement("option");
        opt.value = month;
        opt.textContent = month;
        selector.appendChild(opt);
    });
    if (currentMonth) selector.value = currentMonth;
}

function updateCategoryDropdown() {
    const categoryDropdown = document.getElementById('expenseCategory');
    categoryDropdown.innerHTML = '';
    const categories = budgetData[currentMonth]?.categories || {};
    Object.keys(categories).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryDropdown.appendChild(opt);
    });
}

function displayAllocatedBudgets() {
    const allocatedList = document.getElementById('allocatedList');
    allocatedList.innerHTML = '';
    const categories = budgetData[currentMonth]?.categories || {};
    Object.entries(categories).forEach(([cat, amt]) => {
        const li = document.createElement("li");
        li.textContent = `${cat}: ₹${amt.toFixed(2)}`;
        allocatedList.appendChild(li);
    });
}

function showExpensesForDate(date) {
    const list = document.getElementById('expenseList');
    list.innerHTML = '';

    let totalSpent = 0;

    const expenses = expenseData[currentMonth]?.filter(e => date === "all" || e.date === date) || [];
    expenses.forEach(e => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${e.date}</strong>: ₹${e.amount.toFixed(2)} for ${e.desc} [${e.category}]`;
        list.appendChild(li);
        totalSpent += e.amount;
    });

    const summaryDiv = document.getElementById('expenseSummary');
    if (date !== "all") {
        const remaining = budgetData[currentMonth]?.total - totalSpent;
        summaryDiv.innerHTML = `<strong>Total Spent on ${date}</strong>: ₹${totalSpent.toFixed(2)}<br><strong>Remaining Budget:</strong> ₹${remaining.toFixed(2)}`;
    } else {
        summaryDiv.innerHTML = '';
    }
}

function showSummaryForDate(date) {
    const report = document.getElementById('summaryReport');
    const summaryList = document.getElementById('summaryList');
    const summaryTotal = document.getElementById('summaryTotal');
    report.style.display = 'block';

    let totalSpent = 0;
    const categorySpend = {};

    const expenses = expenseData[currentMonth]?.filter(e => date === "all" || e.date === date) || [];
    expenses.forEach(e => {
        totalSpent += e.amount;
        categorySpend[e.category] = (categorySpend[e.category] || 0) + e.amount;
    });

    summaryTotal.innerHTML = `<strong>Total Spent:</strong> ₹${totalSpent.toFixed(2)}`;

    summaryList.innerHTML = '';
    Object.entries(categorySpend).forEach(([cat, amt]) => {
        const li = document.createElement("li");
        const allocated = budgetData[currentMonth]?.categories[cat] || 0;
        const warning = amt >= allocated ? `<span class="warning"> - Near/Over Budget!</span>` : '';
        li.innerHTML = `${cat}: ₹${amt.toFixed(2)} / ₹${allocated.toFixed(2)}${warning}`;
        summaryList.appendChild(li);
    });
}

function showYearlySummary() {
    const yearlyTotalDiv = document.getElementById('yearlyTotalSpent');
    const yearlyList = document.getElementById('yearlyCategoryBreakdown');
    const yearlySection = document.getElementById('yearlySummaryReport');
    yearlySection.style.display = 'block';

    let yearlyTotal = 0;
    const categoryTotals = {};

    Object.values(expenseData).flat().forEach(e => {
        yearlyTotal += e.amount;
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    yearlyTotalDiv.innerHTML = `<strong>Total Spent This Year:</strong> ₹${yearlyTotal.toFixed(2)}`;

    yearlyList.innerHTML = '';
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
        const li = document.createElement("li");
        li.textContent = `${cat}: ₹${amt.toFixed(2)} (${((amt / yearlyTotal) * 100).toFixed(1)}%)`;
        yearlyList.appendChild(li);
    });

    drawPieChart(categoryTotals);
}

let chartInstance = null;

function drawPieChart(data) {
    let canvas = document.getElementById('yearlyPieChart');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'yearlyPieChart';
        document.getElementById('yearlySummaryReport').appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");

    // Destroy previous chart instance if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0',
                    '#F44336', '#00BCD4', '#FFC107', '#E91E63'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.chart._metasets[context.datasetIndex].total;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}


function updateExpenseDateFilter() {
    const selector = document.getElementById('expenseDateFilter');
    selector.innerHTML = '<option value="all">Show All Dates</option>';
    const dates = [...new Set(expenseData[currentMonth]?.map(e => e.date))];
    dates.forEach(date => {
        const opt = document.createElement("option");
        opt.value = date;
        opt.textContent = date;
        selector.appendChild(opt);
    });
}

function updateSummaryDateFilter() {
    const selector = document.getElementById('summaryDateFilter');
    selector.innerHTML = '<option value="all">Show All Dates</option>';
    const dates = [...new Set(expenseData[currentMonth]?.map(e => e.date))];
    dates.forEach(date => {
        const opt = document.createElement("option");
        opt.value = date;
        opt.textContent = date;
        selector.appendChild(opt);
    });
}

function saveData() {
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
    localStorage.setItem("expenseData", JSON.stringify(expenseData));
}
