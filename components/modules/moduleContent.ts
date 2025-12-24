export const kpiMonitorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Apt Engineering - Executive KPI Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc; color: #333; margin: 0; padding: 0; }
    .container { max-width: 1000px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
    header { background: #1a3b5d; color: #fff; padding: 15px 20px; text-align: center; }
    .logo { max-height: 60px; margin-bottom: 5px; }
    h1, h2, h3 { margin: 0; font-weight: 600; }
    h1 { font-size: 22px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; color: #2c5282; }
    .subtitle { font-size: 15px; opacity: 0.9; margin-top: 5px; }
    .section { padding: 20px; border-bottom: 1px solid #e0e0e0; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
    .info-item { display: flex; }
    .info-label { font-weight: 600; min-width: 180px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background-color: #f0f4f8; color: #1a3b5d; font-weight: 600; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .editable { background-color: #f9f9f9; border: 1px dashed #ccc; padding: 4px; border-radius: 3px; }
    .btn-container { text-align: center; padding: 20px; }
    .btn { display: inline-block; padding: 10px 20px; margin: 5px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; text-decoration: none; }
    .btn:hover { background: #0055aa; }
    footer { text-align: center; padding: 15px; font-size: 12px; color: #777; background: #f0f0f0; border-top: 1px solid #ddd; }
    .print-only { display: none; }
    .page-break { page-break-before: always; break-before: page; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .dashboard-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .metric-card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; border-left: 4px solid #0066cc; }
    .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .metric-label { color: #6c757d; font-size: 14px; }
    .chart-container { position: relative; height: 300px; margin: 20px 0; }
    .risk-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .risk-card { border-radius: 8px; padding: 15px; }
    .risk-high { background-color: #f8d7da; border: 1px solid #f5c6cb; }
    .risk-medium { background-color: #fff3cd; border: 1px solid #ffeeba; }
    .risk-low { background-color: #d4edda; border: 1px solid #c3e6cb; }
    .action-plan { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    @media print {
      body, .container { background: white; color: black; box-shadow: none; margin: 0; padding: 0; }
      .no-print, .btn-container { display: none !important; }
      .page-break { page-break-before: always; break-before: page; }
      .section { page-break-inside: avoid; }
      table { page-break-inside: avoid; font-size: 11px; }
      h1 { font-size: 20px; } h2 { font-size: 18px; } h3 { font-size: 16px; }
      .info-grid { font-size: 14px; }
      .info-label { min-width: 160px; }
      .print-only { display: block; text-align: center; font-size: 14px; margin: 10px 0; color: #0066cc; }
      .dashboard-metrics { grid-template-columns: repeat(2, 1fr); }
      .risk-summary { grid-template-columns: 1fr; }
      .chart-container { height: 250px; }
    }
  </style>
</head>
<body>
  <div class="print-only"><div style="text-align:center; margin-top:100px;"><h2>Apt Engineering</h2><h3>Executive KPI Dashboard</h3></div></div>
  <div class="container page-break">
    <header><h1>Executive KPI Dashboard</h1></header>
    <div class="section">
      <div class="dashboard-header"><h2>Organizational Performance Summary</h2></div>
      <div class="dashboard-metrics">
        <div class="metric-card"><div class="metric-label">Overall Performance</div><div class="metric-value" id="overallScore">7.8</div></div>
        <div class="metric-card" style="border-left-color: #28a745;"><div class="metric-label">Knowledge Revenue</div><div class="metric-value">18%</div></div>
        <div class="metric-card" style="border-left-color: #ffc107;"><div class="metric-label">On-Time Delivery</div><div class="metric-value">92%</div></div>
        <div class="metric-card" style="border-left-color: #dc3545;"><div class="metric-label">Risk Exposure</div><div class="metric-value">2.3</div></div>
      </div>
      <div class="chart-container"><canvas id="departmentChart"></canvas></div>
      <div class="risk-summary">
        <div class="risk-card risk-high"><h3>High Priority Areas</h3><ul><li class="editable" contenteditable="true" data-kpi-key="highRisk1">Knowledge Revenue Framework</li></ul></div>
        <div class="risk-card risk-medium"><h3>Medium Priority Areas</h3><ul><li class="editable" contenteditable="true" data-kpi-key="medRisk1">Training program</li></ul></div>
      </div>
    </div>
  </div>
  <!-- Operations Manager KPI -->
  <div class="container page-break">
    <div class="section"><h3>Operations Manager Assessment</h3>
      <table><thead><tr><th>#</th><th>KPI</th><th>Progress (1-10)</th></tr></thead>
      <tbody><tr><td>1</td><td>Setup Apt Engineering operation plan</td><td><input type="number" min="1" max="10" value="8" style="width:50px; text-align:center;" data-kpi-key="opsScore1" /></td></tr></tbody></table>
      <p><strong>Average Score:</strong> <span id="opsAverageScore">7.5</span> / 10</p>
    </div>
  </div>
  
  <div class="btn-container"><button class="btn" onclick="printAllReports()">🖨️ Print Full Executive Report</button></div>
  <script>
    const KPI_DATA_KEY = 'aeWorkKpiData';
    function saveKpiData() {
        const data = {};
        document.querySelectorAll('[data-kpi-key]').forEach(el => {
            const key = el.getAttribute('data-kpi-key');
            if (el.tagName === 'INPUT' && el.type === 'number') data[key] = parseInt(el.value, 10) || 0;
            else data[key] = el.textContent;
        });
        localStorage.setItem(KPI_DATA_KEY, JSON.stringify(data));
    }
    function loadKpiData() {
        const dataStr = localStorage.getItem(KPI_DATA_KEY);
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                Object.keys(data).forEach(key => {
                    const el = document.querySelector(\`[data-kpi-key="\${key}"]\`);
                    if (el) {
                        if (el.tagName === 'INPUT' && el.type === 'number') el.value = data[key];
                        else el.textContent = data[key];
                    }
                });
            } catch (e) {}
        }
    }
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('[data-kpi-key]').forEach(el => { el.addEventListener('input', saveKpiData); });
        loadKpiData();
        const deptCtx = document.getElementById('departmentChart').getContext('2d');
        window.departmentChart = new Chart(deptCtx, {
            type: 'bar',
            data: { labels: ['Ops', 'Eng', 'Fab', 'Proj', 'Sales', 'Qual'], datasets: [{ label: 'KPI Score', data: [7.5, 7.7, 8.5, 8.2, 8.0, 9.0], backgroundColor: '#0066cc' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 10 } } }
        });
    });
    function printAllReports() { window.print(); }
  </script>
</body>
</html>
`;