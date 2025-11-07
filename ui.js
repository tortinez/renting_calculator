// UI Controller for DCF Calculator v1.3.1

class UIController {
    constructor() {
        this.calculator = window.calculator;
        this.currentInputs = this.getDefaultInputs();
        this.initializeUI();
        this.attachEventListeners();
        this.loadFromLocalStorage();
        this.updateAnnualKm();
    }

    getDefaultInputs() {
        return {
            months: 72,
            discountRate: 0.03,
            inflationRate: 0.02,
            vat: 0.21,
            purchasePrice: 33000,
            ownershipCosts: 1200,
            fuelCost: 0.104,
            residualAnchors: this.calculator.defaults.residualAnchors,
            contracts: this.calculator.defaults.contracts,
            weeklyPlan: JSON.parse(JSON.stringify(this.calculator.defaults.weeklyPlan)),
            oneOffTrips: JSON.parse(JSON.stringify(this.calculator.defaults.oneOffTrips)),
            weeksOff: 0,
            customWeeks: JSON.parse(JSON.stringify(this.calculator.defaults.customWeeks))
        };
    }

    initializeUI() {
        this.renderWeeklyPlanner();
        this.renderOneOffTrips();
        this.renderCustomWeeks();
        this.syncInputsToUI();
    }

    syncInputsToUI() {
        document.getElementById('months').value = this.currentInputs.months;
        document.getElementById('monthsValue').textContent = this.currentInputs.months;
        document.getElementById('discountRate').value = this.currentInputs.discountRate * 100;
        document.getElementById('inflationRate').value = this.currentInputs.inflationRate * 100;
        document.getElementById('vat').value = this.currentInputs.vat * 100;
        document.getElementById('purchasePrice').value = this.currentInputs.purchasePrice;
        document.getElementById('ownershipCosts').value = this.currentInputs.ownershipCosts;
        document.getElementById('fuelCost').value = this.currentInputs.fuelCost;
        document.getElementById('rent10kFee').value = this.currentInputs.contracts[0].monthlyFeeNoVAT;
        document.getElementById('rent10kPenalty').value = this.currentInputs.contracts[0].penaltyPerKm;
        document.getElementById('rent15kFee').value = this.currentInputs.contracts[1].monthlyFeeNoVAT;
        document.getElementById('rent15kPenalty').value = this.currentInputs.contracts[1].penaltyPerKm;
        document.getElementById('weeksOff').value = this.currentInputs.weeksOff;
    }

    attachEventListeners() {
        // Month slider
        document.getElementById('months').addEventListener('input', (e) => {
            document.getElementById('monthsValue').textContent = e.target.value;
        });

        // Calculate button
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.collectInputs();
            this.calculate();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });

        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Export buttons
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportJSON());

        // Add trip button
        document.getElementById('addTripBtn').addEventListener('click', () => {
            this.currentInputs.oneOffTrips.push({ label: 'Nuevo viaje', roundTripKm: 0, inDestinationKm: 0, monthHint: '' });
            this.renderOneOffTrips();
            this.updateAnnualKm();
        });

        // Add custom week button
        document.getElementById('addCustomWeekBtn').addEventListener('click', () => {
            this.currentInputs.customWeeks.push({ label: 'Nuevo período', weeks: 1, multiplier: 1.0 });
            this.renderCustomWeeks();
            this.updateAnnualKm();
        });

        // Input changes for annual km update
        document.getElementById('weeksOff').addEventListener('input', () => {
            this.updateAnnualKm();
        });
    }

    renderWeeklyPlanner() {
        const container = document.getElementById('weeklyPlanner');
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        container.innerHTML = '';

        days.forEach((day, idx) => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-planner';

            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = dayLabels[idx];
            dayDiv.appendChild(header);

            if (!this.currentInputs.weeklyPlan[day]) {
                this.currentInputs.weeklyPlan[day] = [];
            }

            this.currentInputs.weeklyPlan[day].forEach((trip, tripIdx) => {
                const tripDiv = this.createTripEntry(day, tripIdx, trip);
                dayDiv.appendChild(tripDiv);
            });

            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-trip';
            addBtn.textContent = '+ Viaje';
            addBtn.onclick = () => {
                this.currentInputs.weeklyPlan[day].push({ trips: 1, kmPerTrip: 0 });
                this.renderWeeklyPlanner();
                this.updateAnnualKm();
            };
            dayDiv.appendChild(addBtn);

            container.appendChild(dayDiv);
        });
    }

    createTripEntry(day, tripIdx, trip) {
        const div = document.createElement('div');
        div.className = 'trip-entry';

        const tripsInput = document.createElement('input');
        tripsInput.type = 'number';
        tripsInput.value = trip.trips;
        tripsInput.min = '0';
        tripsInput.placeholder = 'Viajes';
        tripsInput.onchange = (e) => {
            this.currentInputs.weeklyPlan[day][tripIdx].trips = parseFloat(e.target.value) || 0;
            this.updateAnnualKm();
        };

        const kmInput = document.createElement('input');
        kmInput.type = 'number';
        kmInput.value = trip.kmPerTrip;
        kmInput.min = '0';
        kmInput.placeholder = 'Km/viaje';
        kmInput.onchange = (e) => {
            this.currentInputs.weeklyPlan[day][tripIdx].kmPerTrip = parseFloat(e.target.value) || 0;
            this.updateAnnualKm();
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => {
            this.currentInputs.weeklyPlan[day].splice(tripIdx, 1);
            this.renderWeeklyPlanner();
            this.updateAnnualKm();
        };

        div.appendChild(tripsInput);
        div.appendChild(kmInput);
        div.appendChild(removeBtn);

        return div;
    }

    renderOneOffTrips() {
        const container = document.getElementById('oneOffTrips');
        container.innerHTML = '';

        this.currentInputs.oneOffTrips.forEach((trip, idx) => {
            const div = document.createElement('div');
            div.className = 'one-off-entry';

            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.value = trip.label;
            labelInput.placeholder = 'Descripción';
            labelInput.onchange = (e) => {
                this.currentInputs.oneOffTrips[idx].label = e.target.value;
            };

            const roundTripInput = document.createElement('input');
            roundTripInput.type = 'number';
            roundTripInput.value = trip.roundTripKm;
            roundTripInput.placeholder = 'Km ida y vuelta';
            roundTripInput.onchange = (e) => {
                this.currentInputs.oneOffTrips[idx].roundTripKm = parseFloat(e.target.value) || 0;
                this.updateAnnualKm();
            };

            const destInput = document.createElement('input');
            destInput.type = 'number';
            destInput.value = trip.inDestinationKm;
            destInput.placeholder = 'Km en destino';
            destInput.onchange = (e) => {
                this.currentInputs.oneOffTrips[idx].inDestinationKm = parseFloat(e.target.value) || 0;
                this.updateAnnualKm();
            };

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.textContent = '✕ Eliminar';
            removeBtn.onclick = () => {
                this.currentInputs.oneOffTrips.splice(idx, 1);
                this.renderOneOffTrips();
                this.updateAnnualKm();
            };

            div.appendChild(labelInput);
            div.appendChild(roundTripInput);
            div.appendChild(destInput);
            div.appendChild(removeBtn);

            container.appendChild(div);
        });
    }

    renderCustomWeeks() {
        const container = document.getElementById('customWeeks');
        container.innerHTML = '';

        this.currentInputs.customWeeks.forEach((cw, idx) => {
            const div = document.createElement('div');
            div.className = 'custom-week-entry';

            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.value = cw.label;
            labelInput.placeholder = 'Descripción';
            labelInput.onchange = (e) => {
                this.currentInputs.customWeeks[idx].label = e.target.value;
            };

            const weeksInput = document.createElement('input');
            weeksInput.type = 'number';
            weeksInput.value = cw.weeks;
            weeksInput.placeholder = 'Semanas';
            weeksInput.onchange = (e) => {
                this.currentInputs.customWeeks[idx].weeks = parseFloat(e.target.value) || 0;
                this.updateAnnualKm();
            };

            const multInput = document.createElement('input');
            multInput.type = 'number';
            multInput.value = cw.multiplier;
            multInput.step = '0.1';
            multInput.placeholder = 'Multiplicador';
            multInput.onchange = (e) => {
                this.currentInputs.customWeeks[idx].multiplier = parseFloat(e.target.value) || 0;
                this.updateAnnualKm();
            };

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.textContent = '✕ Eliminar';
            removeBtn.onclick = () => {
                this.currentInputs.customWeeks.splice(idx, 1);
                this.renderCustomWeeks();
                this.updateAnnualKm();
            };

            div.appendChild(labelInput);
            div.appendChild(weeksInput);
            div.appendChild(multInput);
            div.appendChild(removeBtn);

            container.appendChild(div);
        });
    }

    updateAnnualKm() {
        // Collect current weeks off
        this.currentInputs.weeksOff = parseFloat(document.getElementById('weeksOff').value) || 0;
        
        const kmPerYear = this.calculator.calculateAnnualKm(this.currentInputs);
        const weeklyKm = this.calculator.calculateWeeklyKm(this.currentInputs.weeklyPlan);
        
        document.getElementById('weeklyKm').textContent = this.calculator.formatNumber(weeklyKm, 0);
        document.getElementById('annualKm').textContent = this.calculator.formatNumber(kmPerYear, 0);
    }

    collectInputs() {
        this.currentInputs.months = parseInt(document.getElementById('months').value);
        this.currentInputs.discountRate = parseFloat(document.getElementById('discountRate').value) / 100;
        this.currentInputs.inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
        this.currentInputs.vat = parseFloat(document.getElementById('vat').value) / 100;
        this.currentInputs.purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
        this.currentInputs.ownershipCosts = parseFloat(document.getElementById('ownershipCosts').value);
        this.currentInputs.fuelCost = parseFloat(document.getElementById('fuelCost').value);
        
        this.currentInputs.contracts[0].monthlyFeeNoVAT = parseFloat(document.getElementById('rent10kFee').value);
        this.currentInputs.contracts[0].penaltyPerKm = parseFloat(document.getElementById('rent10kPenalty').value);
        this.currentInputs.contracts[1].monthlyFeeNoVAT = parseFloat(document.getElementById('rent15kFee').value);
        this.currentInputs.contracts[1].penaltyPerKm = parseFloat(document.getElementById('rent15kPenalty').value);
        
        this.currentInputs.weeksOff = parseFloat(document.getElementById('weeksOff').value) || 0;
        
        this.saveToLocalStorage();
    }

    calculate() {
        try {
            const results = this.calculator.calculate(this.currentInputs);
            this.displayResults(results);
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Error al calcular. Por favor, verifica los datos ingresados.');
        }
    }

    displayResults(results) {
        // Update KPIs
        document.getElementById('npvPurchase').textContent = this.calculator.formatCurrency(results.purchase.npv);
        document.getElementById('npvOptimal').textContent = this.calculator.formatCurrency(results.optimal.npv);
        document.getElementById('optimalTitle').textContent = results.optimal.contract.label;
        document.getElementById('difference').textContent = this.calculator.formatCurrency(results.difference);
        
        // Penalty info
        const penaltyInfo = document.getElementById('penaltyInfo');
        if (results.optimal.penalty > 0) {
            penaltyInfo.innerHTML = `⚠️ Penalización: ${this.calculator.formatCurrency(results.optimal.penalty)}<br>` +
                                   `(${this.calculator.formatNumber(results.optimal.excessKm, 0)} km excedidos)`;
        } else {
            penaltyInfo.innerHTML = '✅ Sin penalización';
        }
        
        // Recommendation
        const recommendation = document.getElementById('recommendation');
        if (results.bestOption === 'purchase') {
            recommendation.className = 'recommendation best-purchase';
            recommendation.textContent = `💰 Recomendación: COMPRAR es más económico. Ahorro VPN: ${this.calculator.formatCurrency(-results.difference)}`;
        } else {
            recommendation.className = 'recommendation best-renting';
            recommendation.textContent = `🚗 Recomendación: ${results.optimal.contract.label} es más económico. Ahorro VPN: ${this.calculator.formatCurrency(-results.difference)}`;
        }
        
        // Draw charts
        this.drawNPVChart(results);
        this.drawAnnualChart(results);
        this.drawWeeklyChart(results);
        
        // Calculate and display breakeven
        this.calculateBreakeven();
        
        // Generate mesh
        this.generateMesh();
        
        // Show details table
        this.showDetailsTable(results);
    }

    drawNPVChart(results) {
        const canvas = document.getElementById('npvChart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        
        ctx.clearRect(0, 0, width, height);
        
        const data = [
            { label: 'Comprar', value: results.purchase.npv, color: '#f5576c' },
            ...results.renting.map(r => ({
                label: r.contract.label.replace('Renting ', ''),
                value: r.npv,
                color: r.contract.id === results.optimal.contract.id ? '#43e97b' : '#4facfe'
            }))
        ];
        
        const maxAbs = Math.max(...data.map(d => Math.abs(d.value)));
        const barWidth = (width - 2 * padding) / (data.length * 1.5);
        const scale = (height - 2 * padding) / (maxAbs * 1.2);
        
        data.forEach((d, i) => {
            const x = padding + (i + 0.5) * barWidth * 1.5;
            const barHeight = Math.abs(d.value) * scale;
            const y = padding + (height - 2 * padding) / 2 - (d.value > 0 ? barHeight : 0);
            
            ctx.fillStyle = d.color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(d.label, x + barWidth / 2, height - padding + 20);
            
            // Value
            ctx.fillText(this.calculator.formatCurrency(d.value), x + barWidth / 2, y - 5);
        });
        
        // Zero line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding + (height - 2 * padding) / 2);
        ctx.lineTo(width - padding, padding + (height - 2 * padding) / 2);
        ctx.stroke();
        
        // Y axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VPN (€)', 0, 0);
        ctx.restore();
    }

    drawAnnualChart(results) {
        const canvas = document.getElementById('annualChart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        
        ctx.clearRect(0, 0, width, height);
        
        // Group cash flows by year
        const years = Math.ceil(this.currentInputs.months / 12);
        const purchaseAnnual = [];
        const rentingAnnual = [];
        
        for (let y = 0; y < years; y++) {
            const startMonth = y * 12 + 1;
            const endMonth = Math.min((y + 1) * 12, this.currentInputs.months);
            
            let purchaseTotal = 0;
            let rentingTotal = 0;
            
            for (let m = startMonth; m <= endMonth; m++) {
                const pCF = results.purchase.cashFlows.find(cf => cf.month === m);
                const rCF = results.optimal.cashFlows.find(cf => cf.month === m);
                
                if (pCF) purchaseTotal += Math.abs(pCF.amount);
                if (rCF) rentingTotal += Math.abs(rCF.amount);
            }
            
            purchaseAnnual.push(purchaseTotal);
            rentingAnnual.push(rentingTotal);
        }
        
        // Add initial purchase cost to year 0
        purchaseAnnual[0] += Math.abs(results.purchase.cashFlows[0].amount);
        
        const maxCost = Math.max(...purchaseAnnual, ...rentingAnnual);
        const xStep = (width - 2 * padding) / years;
        const yScale = (height - 2 * padding) / (maxCost * 1.1);
        
        // Draw purchase line
        ctx.strokeStyle = '#f5576c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        purchaseAnnual.forEach((cost, i) => {
            const x = padding + (i + 0.5) * xStep;
            const y = height - padding - cost * yScale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw renting line
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        rentingAnnual.forEach((cost, i) => {
            const x = padding + (i + 0.5) * xStep;
            const y = height - padding - cost * yScale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // X labels
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < years; i++) {
            const x = padding + (i + 0.5) * xStep;
            ctx.fillText(`Año ${i + 1}`, x, height - padding + 15);
        }
        
        // Legend
        ctx.fillStyle = '#f5576c';
        ctx.fillRect(width - 150, padding, 15, 15);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Compra', width - 130, padding + 12);
        
        ctx.fillStyle = '#4facfe';
        ctx.fillRect(width - 150, padding + 25, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('Renting', width - 130, padding + 37);
    }

    drawWeeklyChart(results) {
        const canvas = document.getElementById('weeklyChart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        
        ctx.clearRect(0, 0, width, height);
        
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayKm = dayKeys.map(day => {
            return (this.currentInputs.weeklyPlan[day] || []).reduce((sum, trip) => 
                sum + trip.trips * trip.kmPerTrip, 0
            );
        });
        
        const maxKm = Math.max(...dayKm, 1);
        const barWidth = (width - 2 * padding) / (days.length * 1.5);
        const yScale = (height - 2 * padding) / (maxKm * 1.1);
        
        dayKm.forEach((km, i) => {
            const x = padding + (i + 0.5) * barWidth * 1.5;
            const barHeight = km * yScale;
            const y = height - padding - barHeight;
            
            ctx.fillStyle = '#667eea';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(days[i], x + barWidth / 2, height - padding + 15);
            
            // Value
            if (km > 0) {
                ctx.fillText(`${Math.round(km)} km`, x + barWidth / 2, y - 5);
            }
        });
        
        // Axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
    }

    calculateBreakeven() {
        const breakevenData = this.calculator.findBreakEven(this.currentInputs);
        
        const info = document.getElementById('breakevenInfo');
        info.innerHTML = `
            <h4>Punto de Equilibrio Aproximado</h4>
            <p><strong>Meses:</strong> ${breakevenData.breakEven.months} (${breakevenData.breakEven.years.toFixed(1)} años)</p>
            <p><strong>Diferencia VPN:</strong> ${this.calculator.formatCurrency(breakevenData.breakEven.difference)}</p>
            <p><strong>VPN Compra:</strong> ${this.calculator.formatCurrency(breakevenData.breakEven.purchaseNPV)}</p>
            <p><strong>VPN Renting:</strong> ${this.calculator.formatCurrency(breakevenData.breakEven.rentingNPV)}</p>
        `;
        
        this.drawBreakevenChart(breakevenData.curve);
    }

    drawBreakevenChart(curve) {
        const canvas = document.getElementById('breakevenChart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 400;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        
        ctx.clearRect(0, 0, width, height);
        
        const maxDiff = Math.max(...curve.map(c => Math.abs(c.difference)));
        const xScale = (width - 2 * padding) / curve.length;
        const yScale = (height - 2 * padding) / (maxDiff * 1.2);
        
        // Draw zero line
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, padding + (height - 2 * padding) / 2);
        ctx.lineTo(width - padding, padding + (height - 2 * padding) / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw curve
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        curve.forEach((point, i) => {
            const x = padding + i * xScale;
            const y = padding + (height - 2 * padding) / 2 - point.difference * yScale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // X labels
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < curve.length; i += 10) {
            const x = padding + i * xScale;
            ctx.fillText(curve[i].months, x, height - padding + 15);
        }
        
        ctx.fillText('Meses', width / 2, height - padding + 35);
        
        // Y label
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Diferencia VPN (Renting - Compra) €', 0, 0);
        ctx.restore();
    }

    generateMesh() {
        const mesh = this.calculator.generateMesh(this.currentInputs);
        this.drawMeshChart(mesh);
    }

    // Helper function to calculate heatmap color based on difference
    getHeatmapColor(difference, maxAbs) {
        const ratio = difference / maxAbs;
        if (ratio < 0) {
            // Renting better (negative difference) - green
            const intensity = Math.abs(ratio);
            return `rgb(${Math.round(255 * (1 - intensity))}, 255, ${Math.round(255 * (1 - intensity))})`;
        } else {
            // Purchase better (positive difference) - red
            const intensity = ratio;
            return `rgb(255, ${Math.round(255 * (1 - intensity))}, ${Math.round(255 * (1 - intensity))})`;
        }
    }

    drawMeshChart(mesh) {
        const canvas = document.getElementById('meshChart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = 500;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 80;
        
        ctx.clearRect(0, 0, width, height);
        
        // Extract unique months and km values
        const months = [...new Set(mesh.map(m => m.months))].sort((a, b) => a - b);
        const kmValues = [...new Set(mesh.map(m => m.kmPerYear))].sort((a, b) => a - b);
        
        const cellWidth = (width - 2 * padding) / months.length;
        const cellHeight = (height - 2 * padding) / kmValues.length;
        
        // Find min/max differences for color scale
        const diffs = mesh.map(m => m.difference);
        const minDiff = Math.min(...diffs);
        const maxDiff = Math.max(...diffs);
        const maxAbs = Math.max(Math.abs(minDiff), Math.abs(maxDiff));
        
        // Draw cells
        mesh.forEach(point => {
            const xIdx = months.indexOf(point.months);
            const yIdx = kmValues.indexOf(point.kmPerYear);
            
            const x = padding + xIdx * cellWidth;
            const y = padding + yIdx * cellHeight;
            
            // Color based on difference using helper function
            const color = this.getHeatmapColor(point.difference, maxAbs);
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, cellWidth, cellHeight);
            
            // Border
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(x, y, cellWidth, cellHeight);
        });
        
        // X axis labels (months)
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        months.forEach((m, i) => {
            const x = padding + (i + 0.5) * cellWidth;
            ctx.fillText(m, x, height - padding + 20);
        });
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Meses', width / 2, height - padding + 40);
        
        // Y axis labels (km/year)
        ctx.textAlign = 'right';
        ctx.font = '10px Arial';
        kmValues.forEach((km, i) => {
            const y = padding + (i + 0.5) * cellHeight;
            ctx.fillText(this.calculator.formatNumber(km, 0), padding - 10, y + 3);
        });
        
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Km/año', 0, 0);
        ctx.restore();
        
        // Legend
        const legendY = padding + 10;
        const legendWidth = 200;
        const legendHeight = 20;
        const legendX = width - padding - legendWidth;
        
        // Gradient
        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, 'rgb(255, 100, 100)');
        gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
        gradient.addColorStop(1, 'rgb(100, 255, 100)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Compra mejor', legendX + legendWidth / 4, legendY + legendHeight + 15);
        ctx.fillText('Renting mejor', legendX + 3 * legendWidth / 4, legendY + legendHeight + 15);
    }

    showDetailsTable(results) {
        const container = document.getElementById('detailsTable');
        
        let html = '<table><thead><tr>';
        html += '<th>Mes</th>';
        html += '<th>Compra</th>';
        html += '<th>Combustible</th>';
        html += '<th>Mantenimiento</th>';
        html += '<th>Residual</th>';
        html += '<th>VP</th>';
        html += '<th>Renting</th>';
        html += '<th>Cuota</th>';
        html += '<th>Combustible</th>';
        html += '<th>Penalización</th>';
        html += '<th>VP</th>';
        html += '</tr></thead><tbody>';
        
        const maxLength = Math.max(results.purchase.cashFlows.length, results.optimal.cashFlows.length);
        
        for (let i = 0; i < maxLength; i++) {
            const pCF = results.purchase.cashFlows[i];
            const rCF = results.optimal.cashFlows[i];
            
            html += '<tr>';
            html += `<td>${i}</td>`;
            
            if (pCF) {
                html += `<td>${this.calculator.formatCurrency(pCF.amount)}</td>`;
                html += `<td>${this.calculator.formatCurrency(pCF.fuel || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(pCF.maintenance || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(pCF.residual || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(pCF.pv)}</td>`;
            } else {
                html += '<td></td><td></td><td></td><td></td><td></td>';
            }
            
            if (rCF) {
                html += `<td>${this.calculator.formatCurrency(rCF.amount)}</td>`;
                html += `<td>${this.calculator.formatCurrency(rCF.rentFee || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(rCF.fuel || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(rCF.penalty || 0)}</td>`;
                html += `<td>${this.calculator.formatCurrency(rCF.pv)}</td>`;
            } else {
                html += '<td></td><td></td><td></td><td></td><td></td>';
            }
            
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    exportCSV() {
        const csv = this.calculator.exportToCSV();
        this.downloadFile(csv, 'renting-calculator.csv', 'text/csv');
    }

    exportJSON() {
        const json = this.calculator.exportToJSON();
        this.downloadFile(json, 'renting-calculator.json', 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('rentingCalculatorInputs', JSON.stringify(this.currentInputs));
        } catch (e) {
            console.error('No se pudo guardar en localStorage:', e);
            // Silently fail - localStorage might be disabled or full
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('rentingCalculatorInputs');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.currentInputs = { ...this.currentInputs, ...parsed };
                this.syncInputsToUI();
                this.renderWeeklyPlanner();
                this.renderOneOffTrips();
                this.renderCustomWeeks();
                this.updateAnnualKm();
            }
        } catch (e) {
            console.error('No se pudo cargar desde localStorage:', e);
            // Continue with default values
        }
    }

    reset() {
        if (confirm('¿Restablecer todos los valores a los predeterminados?')) {
            localStorage.removeItem('rentingCalculatorInputs');
            this.currentInputs = this.getDefaultInputs();
            this.syncInputsToUI();
            this.renderWeeklyPlanner();
            this.renderOneOffTrips();
            this.renderCustomWeeks();
            this.updateAnnualKm();
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
});
