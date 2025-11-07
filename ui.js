// UI Controller for DCF Calculator v1.3.1

class UIController {
    constructor() {
        this.calculator = window.calculator;
        this.currentInputs = this.getDefaultInputs();
        // Store chart instances for cleanup
        this.chartInstances = {};
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
            contracts: JSON.parse(JSON.stringify(this.calculator.defaults.contracts)),
            weeklyPlan: JSON.parse(JSON.stringify(this.calculator.defaults.weeklyPlan)),
            oneOffTrips: JSON.parse(JSON.stringify(this.calculator.defaults.oneOffTrips)),
            weeksOff: 0,
            customWeeks: JSON.parse(JSON.stringify(this.calculator.defaults.customWeeks))
        };
    }

    initializeUI() {
        this.renderRentingContracts();
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

        // Add renting contract
        document.getElementById('addContractBtn').addEventListener('click', () => {
            this.addRentingContract();
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

    renderRentingContracts() {
        const container = document.getElementById('rentingContracts');
        container.innerHTML = '';

        if (!this.currentInputs.contracts.length) {
            this.addRentingContract();
            return;
        }

        const defaultContracts = this.calculator.defaults.contracts;
        this.currentInputs.contracts = this.currentInputs.contracts.map((contract, idx) => {
            const normalized = { ...contract };
            const fallback = defaultContracts[idx] || {};

            if (!normalized.id) {
                normalized.id = `contract_${idx}`;
            }
            if (!normalized.label || normalized.label.trim() === '') {
                normalized.label = fallback.label || `Renting ${idx + 1}`;
            }
            if (!Number.isFinite(normalized.monthlyFeeNoVAT)) {
                normalized.monthlyFeeNoVAT = fallback.monthlyFeeNoVAT || 0;
            }
            if (!Number.isFinite(normalized.annualAllowance)) {
                normalized.annualAllowance = fallback.annualAllowance || 10000;
            }
            if (!Number.isFinite(normalized.penaltyPerKm)) {
                normalized.penaltyPerKm = fallback.penaltyPerKm || 0.03;
            }

            return normalized;
        });

        this.currentInputs.contracts.forEach((contract, idx) => {
            const contractDiv = document.createElement('div');
            contractDiv.className = 'renting-contract';

            const header = document.createElement('div');
            header.className = 'contract-header';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = contract.label;
            nameInput.placeholder = 'Nombre contrato';
            nameInput.oninput = (e) => {
                this.currentInputs.contracts[idx].label = e.target.value;
                this.saveToLocalStorage();
            };

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove-contract';
            removeBtn.innerHTML = '✕';
            removeBtn.title = 'Eliminar contrato';
            removeBtn.disabled = this.currentInputs.contracts.length <= 1;
            removeBtn.onclick = () => {
                if (this.currentInputs.contracts.length <= 1) return;
                this.currentInputs.contracts.splice(idx, 1);
                this.renderRentingContracts();
                this.saveToLocalStorage();
            };

            header.appendChild(nameInput);
            header.appendChild(removeBtn);
            contractDiv.appendChild(header);

            contractDiv.appendChild(this.createContractField({
                label: 'Cuota mensual (sin IVA):',
                value: contract.monthlyFeeNoVAT,
                step: '10',
                min: '0',
                unit: '€',
                onChange: (val) => {
                    this.currentInputs.contracts[idx].monthlyFeeNoVAT = val;
                }
            }));

            contractDiv.appendChild(this.createContractField({
                label: 'Km incluidos/año:',
                value: contract.annualAllowance,
                step: '500',
                min: '0',
                unit: 'km',
                onChange: (val) => {
                    this.currentInputs.contracts[idx].annualAllowance = val;
                }
            }));

            contractDiv.appendChild(this.createContractField({
                label: 'Penalización km:',
                value: contract.penaltyPerKm,
                step: '0.001',
                min: '0',
                max: '1',
                unit: '€/km',
                onChange: (val) => {
                    this.currentInputs.contracts[idx].penaltyPerKm = val;
                }
            }));

            container.appendChild(contractDiv);
        });
    }

    renderRentingKpis(results) {
        const container = document.getElementById('rentingKpiGrid');
        if (!container) return;

        container.innerHTML = '';

        results.renting.forEach(r => {
            const card = document.createElement('div');
            card.className = 'kpi-card renting';

            const isOptimal = r.contract.id === results.optimal.contract.id;
            if (isOptimal) {
                card.classList.add('optimal');
            }

            const monthlyFeeWithVat = r.contract.monthlyFeeNoVAT * (1 + this.currentInputs.vat);
            const allowanceLabel = `${this.calculator.formatNumber(r.contract.annualAllowance, 0)} km/año`;
            const feeLabel = `${this.calculator.formatCurrency(monthlyFeeWithVat)}/mes con IVA`;
            // Difference: positive = this renting option costs less than purchase (saves money)
            const diff = r.npv - results.purchase.npv;
            const diffLabel = diff > 0 ? 'Ahorro vs compra' : 'Sobrecoste vs compra';
            const diffValue = this.calculator.formatCurrency(Math.abs(diff));
            const penaltyText = r.penalty > 0
                ? `⚠️ Penalización: ${this.calculator.formatCurrency(r.penalty)} (${this.calculator.formatNumber(r.excessKm, 0)} km)`
                : '✅ Sin penalización';

            card.innerHTML = `
                <div class="kpi-card-title">
                    <h3>${r.contract.label}</h3>
                    ${isOptimal ? '<span class="kpi-badge">Óptimo</span>' : ''}
                </div>
                <div class="kpi-value">${this.calculator.formatCurrency(Math.abs(r.npv))}</div>
                <div class="kpi-label">CPN (€)</div>
                <div class="kpi-meta">
                    <span>${allowanceLabel}</span>
                    <span>${feeLabel}</span>
                </div>
                <div class="penalty-info">
                    ${diffLabel}: ${diffValue}<br>
                    ${penaltyText}
                </div>
            `;

            container.appendChild(card);
        });
    }

    createContractField({ label, value, step, min, max, unit, onChange }) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        group.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = 'number';
        input.value = value ?? '';
        if (step) input.step = step;
        if (min) input.min = min;
        if (max) input.max = max;
        input.oninput = (e) => {
            const val = parseFloat(e.target.value) || 0;
            onChange(val);
            this.saveToLocalStorage();
        };
        group.appendChild(input);

        if (unit) {
            const unitEl = document.createElement('span');
            unitEl.className = 'unit';
            unitEl.textContent = unit;
            group.appendChild(unitEl);
        }

        return group;
    }

    addRentingContract() {
        const newContract = {
            id: `contract_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            label: `Renting ${this.currentInputs.contracts.length + 1}`,
            monthlyFeeNoVAT: 300,
            annualAllowance: 12000,
            penaltyPerKm: 0.03
        };
        this.currentInputs.contracts.push(newContract);
        this.renderRentingContracts();
        this.saveToLocalStorage();
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
        // Update KPIs - display as positive values (NPC = Net Present Cost)
        document.getElementById('npvPurchase').textContent = this.calculator.formatCurrency(Math.abs(results.purchase.npv));
        // Difference shows savings: positive = renting saves money
        document.getElementById('difference').textContent = this.calculator.formatCurrency(results.difference);
        this.renderRentingKpis(results);
        
        // Recommendation
        const recommendation = document.getElementById('recommendation');
        if (results.bestOption === 'purchase') {
            recommendation.className = 'recommendation best-purchase';
            recommendation.textContent = `💰 Recomendación: COMPRAR es más económico. Ahorro: ${this.calculator.formatCurrency(Math.abs(results.difference))}`;
        } else {
            recommendation.className = 'recommendation best-renting';
            recommendation.textContent = `🚗 Recomendación: ${results.optimal.contract.label} es más económico. Ahorro: ${this.calculator.formatCurrency(results.difference)}`;
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
        
        // Destroy existing chart if it exists
        if (this.chartInstances.npvChart) {
            this.chartInstances.npvChart.destroy();
        }
        
        // Convert to positive values (CPN = Net Present Cost)
        const data = [
            { label: 'Comprar', value: Math.abs(results.purchase.npv), color: '#f5576c' },
            ...results.renting.map(r => ({
                label: r.contract.label,
                value: Math.abs(r.npv),
                color: r.contract.id === results.optimal.contract.id ? '#43e97b' : '#4facfe'
            }))
        ];
        
        this.chartInstances.npvChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: 'VPN',
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderColor: data.map(d => d.color),
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: (context) => {
                                return `VPN: ${this.calculator.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'VPN (€)',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            callback: function(value) {
                                return new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Opción',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    drawAnnualChart(results) {
        const canvas = document.getElementById('annualChart');
        
        // Destroy existing chart if it exists
        if (this.chartInstances.annualChart) {
            this.chartInstances.annualChart.destroy();
        }
        
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
                
                if (pCF) purchaseTotal -= pCF.amount;
                if (rCF) rentingTotal -= rCF.amount;
            }
            
            purchaseAnnual.push(purchaseTotal);
            rentingAnnual.push(rentingTotal);
        }
        
        // Add initial purchase cost to year 0
        if (results.purchase.cashFlows.length > 0) {
            purchaseAnnual[0] -= results.purchase.cashFlows[0].amount;
        }
        
        const labels = Array.from({ length: years }, (_, i) => `Año ${i + 1}`);

        const buildWaterfallSegments = (values) => {
            const segments = [];
            let cumulative = 0;
            values.forEach((delta, idx) => {
                const start = cumulative;
                const end = start + delta;
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                segments.push({
                    x: labels[idx],
                    y: [low, high],
                    delta,
                    start,
                    end
                });
                cumulative = end;
            });
            return segments;
        };

        const purchaseSegments = buildWaterfallSegments(purchaseAnnual);
        const rentingSegments = buildWaterfallSegments(rentingAnnual);
        
        this.chartInstances.annualChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Compra',
                    data: purchaseSegments,
                    parsing: {
                        xAxisKey: 'x',
                        yAxisKey: 'y'
                    },
                    backgroundColor: (context) => {
                        const delta = context.raw?.delta || 0;
                        return delta >= 0 ? '#f5576c' : '#10b981';
                    },
                    borderColor: (context) => {
                        const delta = context.raw?.delta || 0;
                        return delta >= 0 ? '#f5576c' : '#10b981';
                    },
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.8,
                    categoryPercentage: 0.45
                }, {
                    label: 'Renting',
                    data: rentingSegments,
                    parsing: {
                        xAxisKey: 'x',
                        yAxisKey: 'y'
                    },
                    backgroundColor: (context) => {
                        const delta = context.raw?.delta || 0;
                        return delta >= 0 ? '#4facfe' : '#10b981';
                    },
                    borderColor: (context) => {
                        const delta = context.raw?.delta || 0;
                        return delta >= 0 ? '#4facfe' : '#10b981';
                    },
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.8,
                    categoryPercentage: 0.45
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: (context) => {
                                const delta = context.raw?.delta || 0;
                                const sign = delta >= 0 ? '+' : '−';
                                return `${context.dataset.label}: ${sign}${this.calculator.formatCurrency(Math.abs(delta))}`;
                            },
                            footer: (context) => {
                                const raw = context[0]?.raw;
                                if (!raw) return '';
                                return `Acumulado: ${this.calculator.formatCurrency(raw.end)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Coste acumulado (€)',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            callback: (value) => {
                                return this.calculator.formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Año',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    drawWeeklyChart(results) {
        const canvas = document.getElementById('weeklyChart');
        
        // Destroy existing chart if it exists
        if (this.chartInstances.weeklyChart) {
            this.chartInstances.weeklyChart.destroy();
        }
        
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayKm = dayKeys.map(day => {
            return (this.currentInputs.weeklyPlan[day] || []).reduce((sum, trip) => 
                sum + trip.trips * trip.kmPerTrip, 0
            );
        });
        
        this.chartInstances.weeklyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Kilómetros',
                    data: dayKm,
                    backgroundColor: '#667eea',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.y} km`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Kilómetros',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            callback: function(value) {
                                return value + ' km';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Día de la Semana',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    calculateBreakeven() {
        const breakevenData = this.calculator.findBreakEven(this.currentInputs);
        
        const info = document.getElementById('breakevenInfo');
        info.innerHTML = `
            <h4>Punto de Equilibrio Aproximado</h4>
            <p><strong>Meses:</strong> ${breakevenData.breakEven.months} (${breakevenData.breakEven.years.toFixed(1)} años)</p>
            <p><strong>Diferencia CPN:</strong> ${this.calculator.formatCurrency(Math.abs(breakevenData.breakEven.difference))}</p>
            <p><strong>CPN Compra:</strong> ${this.calculator.formatCurrency(Math.abs(breakevenData.breakEven.purchaseNPV))}</p>
            <p><strong>CPN Renting:</strong> ${this.calculator.formatCurrency(Math.abs(breakevenData.breakEven.rentingNPV))}</p>
        `;
        
        this.drawBreakevenChart(breakevenData.curve);
    }

    drawBreakevenChart(curve) {
        const canvas = document.getElementById('breakevenChart');
        
        // Destroy existing chart if it exists
        if (this.chartInstances.breakevenChart) {
            this.chartInstances.breakevenChart.destroy();
        }
        
        this.chartInstances.breakevenChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: curve.map(c => c.months),
                datasets: [{
                    label: 'Diferencia VPN (Renting - Compra)',
                    data: curve.map(c => c.difference),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 4,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#667eea',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            title: (context) => {
                                return `${context[0].label} meses (${(context[0].label / 12).toFixed(1)} años)`;
                            },
                            label: (context) => {
                                return `Diferencia: ${this.calculator.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Diferencia VPN (Renting - Compra) €',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            callback: function(value) {
                                return new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        },
                        grid: {
                            color: (context) => {
                                return context.tick.value === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)';
                            },
                            lineWidth: (context) => {
                                return context.tick.value === 0 ? 2 : 1;
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Meses',
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            maxTicksLimit: 12
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
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

        const wrapper = canvas.parentElement;
        const width = (wrapper ? wrapper.clientWidth : canvas.offsetWidth) || 600;
        const height = (wrapper ? wrapper.clientHeight : 500) || 500;
        
        canvas.width = width;
        canvas.height = height;
        
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
        
        // Store mesh data for interactivity
        this.meshData = {
            mesh,
            months,
            kmValues,
            cellWidth,
            cellHeight,
            padding,
            maxAbs
        };
        
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
        
        // Setup interactivity
        this.setupMeshInteractivity(canvas);
    }
    
    setupMeshInteractivity(canvas) {
        // Remove existing listeners if they exist
        if (canvas._meshMouseMoveHandler) {
            canvas.removeEventListener('mousemove', canvas._meshMouseMoveHandler);
        }
        if (canvas._meshMouseLeaveHandler) {
            canvas.removeEventListener('mouseleave', canvas._meshMouseLeaveHandler);
        }
        
        // Create or get tooltip element
        let tooltip = document.getElementById('meshTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'meshTooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.display = 'none';
            tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '13px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.zIndex = '1000';
            tooltip.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            tooltip.style.maxWidth = '300px';
            tooltip.style.lineHeight = '1.5';
            
            // Append to canvas wrapper for better CSS isolation
            const wrapper = canvas.parentElement;
            if (wrapper) {
                wrapper.style.position = 'relative';
                wrapper.appendChild(tooltip);
            } else {
                document.body.appendChild(tooltip);
            }
        }
        
        // Add mouse move handler
        const mouseMoveHandler = (e) => {
            if (!this.meshData) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            const { mesh, months, kmValues, cellWidth, cellHeight, padding } = this.meshData;
            
            // Check if mouse is within the heatmap area
            if (x < padding || x > canvas.width - padding || y < padding || y > canvas.height - padding) {
                tooltip.style.display = 'none';
                canvas.style.cursor = 'default';
                return;
            }
            
            // Find the cell under the mouse
            const cellX = Math.floor((x - padding) / cellWidth);
            const cellY = Math.floor((y - padding) / cellHeight);
            
            if (cellX >= 0 && cellX < months.length && cellY >= 0 && cellY < kmValues.length) {
                const month = months[cellX];
                const km = kmValues[cellY];
                const point = mesh.find(p => p.months === month && p.kmPerYear === km);
                
                if (point) {
                    canvas.style.cursor = 'pointer';
                    
                    // Show tooltip
                    const diffSign = point.difference > 0 ? '+' : '';
                    const winner = point.difference > 0 ? '🚗 Renting mejor' : '🏪 Compra mejor';
                    
                    tooltip.innerHTML = `
                        <strong>${winner}</strong><br>
                        <strong>Duración:</strong> ${point.months} meses (${point.years.toFixed(1)} años)<br>
                        <strong>Km/año:</strong> ${this.calculator.formatNumber(point.kmPerYear, 0)} km<br>
                        <strong>Diferencia:</strong> ${diffSign}${this.calculator.formatCurrency(point.difference)}<br>
                        <strong>CPN Compra:</strong> ${this.calculator.formatCurrency(Math.abs(point.purchaseNPV))}<br>
                        <strong>CPN Renting:</strong> ${this.calculator.formatCurrency(Math.abs(point.rentingNPV))}<br>
                        <em>Contrato óptimo: ${point.optimalContract === 'rent10k' ? 'Renting 10k' : 'Renting 15k'}</em>
                    `;
                    
                    tooltip.style.display = 'block';
                    
                    // Position tooltip relative to wrapper if it's a child, otherwise relative to body
                    const wrapper = canvas.parentElement;
                    if (wrapper && wrapper.contains(tooltip)) {
                        const wrapperRect = wrapper.getBoundingClientRect();
                        tooltip.style.left = (e.clientX - wrapperRect.left + 15) + 'px';
                        tooltip.style.top = (e.clientY - wrapperRect.top + 15) + 'px';
                    } else {
                        tooltip.style.left = (e.clientX + 15) + 'px';
                        tooltip.style.top = (e.clientY + 15) + 'px';
                    }
                } else {
                    tooltip.style.display = 'none';
                    canvas.style.cursor = 'default';
                }
            } else {
                tooltip.style.display = 'none';
                canvas.style.cursor = 'default';
            }
        };
        
        // Store the handler reference for cleanup
        canvas._meshMouseMoveHandler = mouseMoveHandler;
        canvas.addEventListener('mousemove', mouseMoveHandler);
        
        // Hide tooltip when mouse leaves canvas
        const mouseLeaveHandler = () => {
            tooltip.style.display = 'none';
            canvas.style.cursor = 'default';
        };
        
        // Store the handler reference for cleanup
        canvas._meshMouseLeaveHandler = mouseLeaveHandler;
        canvas.addEventListener('mouseleave', mouseLeaveHandler);
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
        
        // Redraw mesh chart when mesh tab is shown to ensure proper sizing
        if (tabName === 'mesh' && this.calculator.results && this.currentInputs) {
            // Use requestAnimationFrame to ensure the tab content is rendered
            requestAnimationFrame(() => {
                this.generateMesh();
            });
        }
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
            this.renderRentingContracts();
            this.updateAnnualKm();
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
});
