const API_URL =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?fields=country_currency_desc,exchange_rate,record_date&filter=record_date:gte:2024-01-01&sort=-record_date&page[size]=1000";

const currencySelect = document.getElementById("currency-select");
const currencySearch = document.getElementById("currency-search");
const tableBody = document.querySelector("#exchange-table tbody");
const summaryGrid = document.getElementById("summary-cards");
let exchangeData = [];
let chart;

// Load data and setup
fetch(API_URL)
  .then(res => res.json())
  .then(res => {
    exchangeData = res.data;
    const uniqueCurrencies = [...new Set(exchangeData.map(d => d.country_currency_desc))];
    populateDropdown(uniqueCurrencies);
    currencySelect.value = uniqueCurrencies[0];
    updateView(uniqueCurrencies[0]);
    generateSummaryCards(uniqueCurrencies);
  });

// Dropdown population with search filter
function populateDropdown(currencies) {
  currencySelect.innerHTML = "";
  currencies.forEach(curr => {
    const opt = document.createElement("option");
    opt.value = curr;
    opt.textContent = curr;
    currencySelect.appendChild(opt);
  });
}

currencySearch.addEventListener("input", () => {
  const term = currencySearch.value.toLowerCase();
  const filtered = [...new Set(exchangeData.map(d => d.country_currency_desc))]
    .filter(c => c.toLowerCase().includes(term));
  populateDropdown(filtered);
});

// Dropdown change
currencySelect.addEventListener("change", e => {
  updateView(e.target.value);
});

function updateView(currency) {
  const filtered = exchangeData.filter(d => d.country_currency_desc === currency);
  const sorted = filtered.sort((a, b) => new Date(a.record_date) - new Date(b.record_date));
  updateTable(sorted);
  updateChart(sorted);
}

function updateTable(data) {
  tableBody.innerHTML = "";
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const prev = data[i - 1];
    let changeHTML = "";

    if (prev) {
      const change = parseFloat(row.exchange_rate) - parseFloat(prev.exchange_rate);
      const isPositive = change > 0;
      const className = isPositive ? "rate-positive" : "rate-negative";
      const arrow = isPositive ? "🔺" : "🔻";
      changeHTML = `<span class="${className}">${arrow} ${Math.abs(change).toFixed(2)}</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.record_date}</td><td>${row.exchange_rate} ${changeHTML}</td>`;
    tableBody.appendChild(tr);
  }
}

function updateChart(data) {
  const ctx = document.getElementById("exchangeChart").getContext("2d");
  const labels = data.map(d => d.record_date);
  const values = data.map(d => parseFloat(d.exchange_rate));

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Exchange Rate",
          data: values,
          borderColor: "#0f9d58", // green
          backgroundColor: "transparent",
          fill: false,
          borderWidth: 2,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 6 } },
          y: { beginAtZero: false }
        }
      }
    });
  }
}

function generateSummaryCards(currencies) {
    summaryGrid.innerHTML = "";
  
    // Compute latest rate per currency
    const latestRates = currencies
      .map(currency => {
        const rates = exchangeData
          .filter(d => d.country_currency_desc === currency)
          .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  
        if (rates.length >= 2) {
          return {
            currency,
            latest: parseFloat(rates[0].exchange_rate),
            previous: parseFloat(rates[1].exchange_rate),
            record_date: rates[0].record_date,
            sparkData: rates.map(r => parseFloat(r.exchange_rate)).reverse(),
            sparkLabels: rates.map(r => r.record_date).reverse(),
          };
        }
        return null;
      })
      .filter(Boolean);
  
    // Sort descending by latest exchange rate
    latestRates.sort((a, b) => b.latest - a.latest);
  
    // Pick top 5
    latestRates.slice(0, 5).forEach(rateInfo => {
      const change = rateInfo.latest - rateInfo.previous;
      const isUp = change > 0;
  
      const card = document.createElement("div");
      card.className = "summary-card";
      card.innerHTML = `
        <strong>${rateInfo.currency}</strong><br/>
        ${rateInfo.latest.toFixed(2)} 
        <span class="${isUp ? "rate-positive" : "rate-negative"}">
          ${isUp ? "↑" : "↓"} ${Math.abs(change).toFixed(2)}
        </span><br/>
        <small>As of ${rateInfo.record_date}</small>
        <canvas class="sparkline"></canvas>
      `;
      summaryGrid.appendChild(card);
  
      const sparkCtx = card.querySelector(".sparkline").getContext("2d");
      new Chart(sparkCtx, {
        type: "line",
        data: {
          labels: rateInfo.sparkLabels,
          datasets: [{
            data: rateInfo.sparkData,
            borderColor: "#0f9d58",
            fill: false,
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 0
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      });
    });
  }
  
