// admin-reports.js
// Sử dụng Chart.js qua CDN, không import module

document.addEventListener('DOMContentLoaded', () => {
  // Ví dụ: vẽ biểu đồ nếu có phần tử canvas với id 'reportChart'
  const ctx = document.getElementById('reportChart');
  if (ctx && window.Chart) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Demo',
          data: [12, 19, 3],
          backgroundColor: ['#36a2eb', '#ff6384', '#ffce56']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  }
}); 