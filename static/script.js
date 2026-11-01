// Initialize Chart.js defaults for dark theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#1e293b';

// Render initial analytics charts
let driversChart, segmentationChart;

window.addEventListener('DOMContentLoaded', () => {
    initCharts();
});

function initCharts() {
    // Top Drivers Bar Chart
    const ctx1 = document.getElementById('driversChart').getContext('2d');
    driversChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Month-to-Month', 'Fiber Optic', 'High Monthly ($)', 'No Tech Support', 'Short Tenure'],
            datasets: [{
                label: 'SHAP Feature Importance Impact',
                data: [0.42, 0.35, 0.28, 0.22, 0.19],
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Risk Segmentation Doughnut Chart
    const ctx2 = document.getElementById('segmentationChart').getContext('2d');
    segmentationChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Low Risk (Retained)', 'Medium Risk (Monitor)', 'High Risk (Intervene)'],
            datasets: [{
                data: [65, 20, 15],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
        }
    });
}

function fillSampleData(type) {
    if (type === 'high') {
        document.getElementById('tenure').value = 2;
        document.getElementById('Contract').value = 0; // Month-to-Month
        document.getElementById('MonthlyCharges').value = 95.20;
        document.getElementById('TotalCharges').value = 190.40;
        document.getElementById('InternetService').value = 1; // Fiber
        document.getElementById('PaymentMethod').value = 2; // Electronic check
    }
}

async function submitPrediction() {
    // Collect form data matching Pydantic schema
    const payload = {
        gender: parseInt(document.getElementById('gender').value),
        SeniorCitizen: document.getElementById('SeniorCitizen').checked ? 1 : 0,
        Partner: parseInt(document.getElementById('Partner').value),
        Dependents: parseInt(document.getElementById('Dependents').value),
        tenure: parseFloat(document.getElementById('tenure').value),
        PhoneService: parseInt(document.getElementById('PhoneService').value),
        MultipleLines: parseInt(document.getElementById('MultipleLines').value),
        InternetService: parseInt(document.getElementById('InternetService').value),
        OnlineSecurity: parseInt(document.getElementById('OnlineSecurity').value),
        OnlineBackup: parseInt(document.getElementById('OnlineBackup').value),
        DeviceProtection: parseInt(document.getElementById('DeviceProtection').value),
        TechSupport: document.getElementById('TechSupport').checked ? 1 : 0,
        StreamingTV: parseInt(document.getElementById('StreamingTV').value),
        StreamingMovies: parseInt(document.getElementById('StreamingMovies').value),
        Contract: parseInt(document.getElementById('Contract').value),
        PaperlessBilling: document.getElementById('PaperlessBilling').checked ? 1 : 0,
        PaymentMethod: parseInt(document.getElementById('PaymentMethod').value),
        MonthlyCharges: parseFloat(document.getElementById('MonthlyCharges').value),
        TotalCharges: parseFloat(document.getElementById('TotalCharges').value)
    };

    try {
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Prediction request failed');

        const result = await response.json();
        updateUI(result);
    } catch (error) {
        console.error(error);
        alert('Could not connect to FastAPI backend. Ensure uvicorn is running!');
    }
}

function updateUI(result) {
    const probPercent = (result.churn_probability * 100).toFixed(1) + '%';
    document.getElementById('probValue').innerText = probPercent;

    const badge = document.getElementById('riskBadge');
    const predText = document.getElementById('predText');
    const actionBox = document.getElementById('actionBox');
    const actionText = document.getElementById('actionText');

    // Show the prescriptive action box
    actionBox.classList.remove('hidden');
    actionText.innerText = result.recommended_action;

    if (result.risk_tier === 'High Risk') {
        badge.className = 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-red-500/10 text-red-400 border border-red-500/20';
        badge.innerText = 'High Risk Tier';
        predText.innerText = 'Immediate retention intervention required!';
    } else if (result.risk_tier === 'Medium Risk') {
        badge.className = 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-amber-500/10 text-amber-400 border border-amber-500/20';
        badge.innerText = 'Medium Risk Tier';
        predText.innerText = 'Monitor customer engagement closely.';
    } else {
        badge.className = 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        badge.innerText = 'Low Risk (Healthy)';
        predText.innerText = 'Customer is stable with strong loyalty indicators.';
    }
}