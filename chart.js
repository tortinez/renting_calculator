// Chart visualization for comparison

function drawChart(results) {
    const canvas = document.getElementById('comparisonChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Prepare data
    const options = [
        { label: 'Comprar', npv: results.purchase.npv, color: '#f5576c' },
        { label: 'Renting 10k', npv: results.renting10k.npv, color: '#4facfe' },
        { label: 'Renting 15k', npv: results.renting15k.npv, color: '#00f2fe' }
    ];
    
    // Find max value for scaling
    const maxNpv = Math.max(...options.map(o => Math.abs(o.npv)));
    const scale = chartHeight / (maxNpv * 1.2); // 20% margin
    
    // Draw bars
    const barWidth = chartWidth / (options.length * 2);
    const spacing = barWidth / 2;
    
    options.forEach((option, index) => {
        const x = padding + (index * 2 + 0.5) * barWidth + index * spacing;
        const barHeight = Math.abs(option.npv) * scale;
        const y = padding + chartHeight / 2 - (option.npv > 0 ? barHeight : 0);
        
        // Draw bar
        ctx.fillStyle = option.color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(option.label, x + barWidth / 2, padding + chartHeight + 25);
        
        // Draw value
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        const valueText = formatEuro(option.npv);
        ctx.fillText(valueText, x + barWidth / 2, y - 10);
    });
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    
    // X axis (at zero line)
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight / 2);
    ctx.lineTo(padding + chartWidth, padding + chartHeight / 2);
    ctx.stroke();
    
    // Y axis label
    ctx.save();
    ctx.translate(20, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Valor Presente Neto (€)', 0, 0);
    ctx.restore();
    
    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Comparación de Valor Presente Neto (DCF)', width / 2, 30);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        
        // Grid value labels
        const value = maxNpv * 1.2 * (0.5 - i / 4);
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(formatEuro(value), padding - 10, y + 4);
    }
}

function formatEuro(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Redraw chart on window resize
window.addEventListener('resize', () => {
    if (typeof calculator !== 'undefined' && calculator.results && calculator.results.purchase) {
        drawChart(calculator.results);
    }
});
