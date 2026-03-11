// ===== Variables Globales =====
const API_BASE = 'https://api.frankfurter.app';
let exchangeRates = {};
let chart = null;
let currentPeriod = '1M';

const PERIOD_CONFIG = {
    '1H': { days: 2,    label: 'Última hora',          note: 'La API solo provee datos diarios. Se muestra el último día disponible.' },
    '1D': { days: 5,    label: 'Últimos días' },
    '1S': { days: 7,    label: 'Última semana' },
    '1M': { days: 30,   label: 'Último mes' },
    '3M': { days: 90,   label: 'Últimos 3 meses' },
    '6M': { days: 180,  label: 'Últimos 6 meses' },
    '1A': { days: 365,  label: 'Último año' },
    '5A': { days: 1825, label: 'Últimos 5 años' },
};

// ===== Elementos del DOM =====
const amountInput = document.getElementById('amount');
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const resultInput = document.getElementById('result');
const exchangeRateText = document.getElementById('exchangeRate');
const lastUpdateText = document.getElementById('lastUpdate');
const swapBtn = document.getElementById('swapBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const themeToggle = document.getElementById('themeToggle');

// ===== Inicialización =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadHistory();
    fetchExchangeRates();
    setupEventListeners();
    setupChart();
});

// ===== Tema Claro/Oscuro =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ===== Event Listeners =====
function setupEventListeners() {
    amountInput.addEventListener('input', performConversion);
    fromCurrencySelect.addEventListener('change', () => {
        fetchExchangeRates();
        updateChart();
    });
    toCurrencySelect.addEventListener('change', () => {
        fetchExchangeRates();
        updateChart();
    });
    swapBtn.addEventListener('click', swapCurrencies);
    clearHistoryBtn.addEventListener('click', clearHistory);
}

// ===== Obtener Tasas de Cambio =====
async function fetchExchangeRates() {
    try {
        const from = fromCurrencySelect.value;
        const to = toCurrencySelect.value;
        
        const response = await fetch(`${API_BASE}/latest?from=${from}&to=${to}`);
        const data = await response.json();
        
        if (data.rates) {
            exchangeRates = data.rates;
            performConversion();
            updateExchangeInfo(data);
            showNotification('Tasas de cambio actualizadas', 'success');
        }
    } catch (error) {
        console.error('Error al obtener tasas:', error);
        showNotification('Error al obtener tasas de cambio', 'error');
    }
}

// ===== Actualizar Información de Tasas =====
function updateExchangeInfo(data) {
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;
    const rate = exchangeRates[to];
    
    if (rate) {
        exchangeRateText.textContent = `Tasa de cambio: 1 ${from} = ${rate} ${to}`;
    }
    
    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    lastUpdateText.textContent = `Última actualización: ${formattedDate}`;
}

// ===== Realizar Conversión =====
function performConversion() {
    const amount = parseFloat(amountInput.value) || 0;
    const rate = exchangeRates[toCurrencySelect.value];
    
    if (amount < 0) {
        showNotification('La cantidad no puede ser negativa', 'error');
        amountInput.value = 0;
        return;
    }
    
    if (rate) {
        const result = (amount * rate).toFixed(2);
        resultInput.value = result;
    }
}

// ===== Intercambiar Monedas =====
function swapCurrencies() {
    const temp = fromCurrencySelect.value;
    fromCurrencySelect.value = toCurrencySelect.value;
    toCurrencySelect.value = temp;
    
    fetchExchangeRates();
    updateChart();
}

// ===== Historial de Conversiones =====
function addToHistory() {
    const amount = parseFloat(amountInput.value);
    const result = resultInput.value;
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;
    
    if (amount <= 0 || !result) return;
    
    const time = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
    history.unshift({
        amount,
        result,
        from,
        to,
        time,
        timestamp: Date.now()
    });
    
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('conversionHistory', JSON.stringify(history));
    displayHistory();
}

function loadHistory() {
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
    
    if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No hay conversiones aún</li>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <li class="history-item">
            <div class="history-text">
                <span class="history-amount">${item.amount} ${item.from}</span>
                <span class="history-arrow">→</span>
                <span class="history-result">${item.result} ${item.to}</span>
            </div>
            <span class="history-time">${item.time}</span>
        </li>
    `).join('');
}

function clearHistory() {
    if (confirm('¿Deseas eliminar todo el historial?')) {
        localStorage.removeItem('conversionHistory');
        displayHistory();
        showNotification('Historial eliminado', 'success');
    }
}

// ===== Gráfica de Histórico =====
function setupChart() {
    const mainContent = document.querySelector('.main-content');
    const chartSection = document.createElement('section');
    chartSection.className = 'chart-section';
    chartSection.id = 'chartSection';
    chartSection.innerHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <h2>Evolución del Tipo de Cambio</h2>
                <div class="period-selector">
                    <button class="period-btn" data-period="1H">1H</button>
                    <button class="period-btn" data-period="1D">1D</button>
                    <button class="period-btn" data-period="1S">1S</button>
                    <button class="period-btn active" data-period="1M">1M</button>
                    <button class="period-btn" data-period="3M">3M</button>
                    <button class="period-btn" data-period="6M">6M</button>
                    <button class="period-btn" data-period="1A">1A</button>
                    <button class="period-btn" data-period="5A">5A</button>
                </div>
            </div>
            <p class="period-note" id="periodNote" style="display:none"></p>
            <div class="chart-container" id="chartContainer">
                <div class="chart-loading">
                    <div class="spinner"></div>
                    Cargando datos...
                </div>
            </div>
        </div>
    `;
    
    const featuresSection = document.querySelector('.features-section');
    mainContent.insertBefore(chartSection, featuresSection);

    chartSection.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chartSection.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            updateChart();
        });
    });
}

async function updateChart() {
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;
    const container = document.getElementById('chartContainer');
    const periodNote = document.getElementById('periodNote');
    const config = PERIOD_CONFIG[currentPeriod];

    if (periodNote) {
        if (config.note) {
            periodNote.textContent = `⚠️ ${config.note}`;
            periodNote.style.display = 'block';
        } else {
            periodNote.style.display = 'none';
        }
    }

    container.innerHTML = `
        <div class="chart-loading">
            <div class="spinner"></div>
            Cargando datos...
        </div>
    `;
    
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - config.days * 24 * 60 * 60 * 1000);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const response = await fetch(
            `${API_BASE}/${startStr}..${endStr}?from=${from}&to=${to}`
        );
        const data = await response.json();
        
        if (data.rates) {
            const dates = Object.keys(data.rates).sort();
            const rates = dates.map(d => parseFloat(data.rates[d][to]).toFixed(4));
            
            if (chart) {
                chart.destroy();
            }
            
            container.innerHTML = '<canvas id="rateChart"></canvas>';
            const canvas = document.getElementById('rateChart');
            
            chart = new Chart(canvas, {
                type: 'line',
                plugins: [{
                    id: 'crosshair',
                    afterDraw(ch) {
                        if (!ch.tooltip._active || !ch.tooltip._active.length) return;
                        const ctx = ch.ctx;
                        const x = ch.tooltip._active[0].element.x;
                        const top = ch.chartArea.top;
                        const bottom = ch.chartArea.bottom;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, top);
                        ctx.lineTo(x, bottom);
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = 'rgba(37, 99, 235, 0.5)';
                        ctx.setLineDash([5, 4]);
                        ctx.stroke();
                        ctx.restore();
                    }
                }],
                data: {
                    labels: dates.map(d => formatDateLabel(d, currentPeriod)),
                    datasets: [{
                        label: `${from} → ${to}`,
                        data: rates,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: dates.length > 100 ? 0 : 5,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: '#1e40af',
                        hoverBackgroundColor: 'rgba(37, 99, 235, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: { size: 14, weight: 'bold' },
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-color').trim(),
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(15, 23, 42, 0.92)',
                            padding: 14,
                            titleFont: { size: 13, weight: 'bold' },
                            bodyFont: { size: 14, weight: '600' },
                            titleColor: '#93c5fd',
                            bodyColor: '#ffffff',
                            borderColor: '#2563eb',
                            borderWidth: 2,
                            caretSize: 8,
                            cornerRadius: 10,
                            displayColors: false,
                            callbacks: {
                                title: function(items) {
                                    return dates[items[0].dataIndex];
                                },
                                label: function(context) {
                                    const val = parseFloat(context.raw).toFixed(4);
                                    return `💱 1 ${from} = ${val} ${to}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: {
                                color: 'rgba(37, 99, 235, 0.1)',
                                drawBorder: true
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-light').trim(),
                                font: { size: 11 }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-light').trim(),
                                font: { size: 11 },
                                maxTicksLimit: getMaxTicks(currentPeriod),
                                maxRotation: 45
                            }
                        }
                    }
                }
            });
            
            container.style.animation = 'fadeIn 0.8s ease';
        }
    } catch (error) {
        console.error('Error al obtener datos históricos:', error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-light);">
                Error al cargar el historial de tasas
            </div>
        `;
    }
}

function formatDateLabel(dateStr, period) {
    const date = new Date(dateStr + 'T12:00:00');
    if (['1H', '1D', '1S'].includes(period)) {
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    } else if (['1M', '3M'].includes(period)) {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else {
        return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
}

function getMaxTicks(period) {
    const map = { '1H': 4, '1D': 5, '1S': 7, '1M': 10, '3M': 12, '6M': 12, '1A': 12, '5A': 10 };
    return map[period] || 10;
}

// ===== Notificaciones =====
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Actualización automática de tasas =====
setInterval(() => {
    const hour = new Date().getHours();
    if (Math.random() < 0.1) {
        fetchExchangeRates();
    }
}, 5 * 60 * 1000);

// ===== Agregar conversión al historial =====
amountInput.addEventListener('blur', addToHistory);
fromCurrencySelect.addEventListener('change', () => addToHistory());
toCurrencySelect.addEventListener('change', () => addToHistory());

// Cargar Chart.js desde CDN
function loadChartLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => {
        updateChart();
    };
    document.head.appendChild(script);
}

window.addEventListener('load', loadChartLibrary);

// ===== Validación de entrada =====
amountInput.addEventListener('input', (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts[1];
    }
    
    if (value.startsWith('-')) {
        value = value.substring(1);
    }
    
    e.target.value = value;
});

// ===== Teclado Enter para convertir =====
amountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addToHistory();
    }
});

console.log('✅ Conversor de Divisas iniciado correctamente');
