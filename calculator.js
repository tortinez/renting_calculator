// DCF Calculator for Vehicle Purchase vs Renting Comparison

class RentingCalculator {
    constructor() {
        this.inputs = {};
        this.results = {};
    }

    // Gather all inputs from the form
    collectInputs() {
        this.inputs = {
            // General parameters
            analysisYears: parseFloat(document.getElementById('analysisYears').value),
            discountRate: parseFloat(document.getElementById('discountRate').value) / 100,
            inflationRate: parseFloat(document.getElementById('inflationRate').value) / 100,
            annualKm: parseFloat(document.getElementById('annualKm').value),
            
            // Purchase option
            purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
            downPayment: parseFloat(document.getElementById('downPayment').value),
            loanInterest: parseFloat(document.getElementById('loanInterest').value) / 100,
            maintenanceCost: parseFloat(document.getElementById('maintenanceCost').value),
            insuranceCost: parseFloat(document.getElementById('insuranceCost').value),
            roadTax: parseFloat(document.getElementById('roadTax').value),
            resaleValue: parseFloat(document.getElementById('resaleValue').value),
            
            // Renting options
            renting10k: parseFloat(document.getElementById('renting10k').value),
            penalty10k: parseFloat(document.getElementById('penalty10k').value),
            renting15k: parseFloat(document.getElementById('renting15k').value),
            penalty15k: parseFloat(document.getElementById('penalty15k').value)
        };
    }

    // Calculate present value of a future cash flow
    calculatePV(cashFlow, year, discountRate) {
        return cashFlow / Math.pow(1 + discountRate, year);
    }

    // Calculate adjusted cost with inflation
    applyInflation(cost, year, inflationRate) {
        return cost * Math.pow(1 + inflationRate, year);
    }

    // Calculate loan payment (annual)
    calculateLoanPayment(principal, interestRate, years) {
        if (interestRate === 0) return principal / years;
        const monthlyRate = interestRate / 12;
        const numPayments = years * 12;
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                               (Math.pow(1 + monthlyRate, numPayments) - 1);
        return monthlyPayment * 12;
    }

    // Calculate purchase option with DCF
    calculatePurchaseOption() {
        const loanAmount = this.inputs.purchasePrice - this.inputs.downPayment;
        const annualLoanPayment = this.calculateLoanPayment(
            loanAmount, 
            this.inputs.loanInterest, 
            this.inputs.analysisYears
        );

        let totalNominalCost = this.inputs.downPayment;
        let npv = this.inputs.downPayment; // Initial down payment at year 0
        const yearlyDetails = [];

        for (let year = 1; year <= this.inputs.analysisYears; year++) {
            // Operating costs with inflation
            const maintenance = this.applyInflation(this.inputs.maintenanceCost, year - 1, this.inputs.inflationRate);
            const insurance = this.applyInflation(this.inputs.insuranceCost, year - 1, this.inputs.inflationRate);
            const tax = this.applyInflation(this.inputs.roadTax, year - 1, this.inputs.inflationRate);
            
            let cashFlow = annualLoanPayment + maintenance + insurance + tax;
            
            // Subtract resale value in the final year
            if (year === this.inputs.analysisYears) {
                cashFlow -= this.inputs.resaleValue;
            }

            totalNominalCost += (year === this.inputs.analysisYears) 
                ? annualLoanPayment + maintenance + insurance + tax 
                : annualLoanPayment + maintenance + insurance + tax;

            const pv = this.calculatePV(cashFlow, year, this.inputs.discountRate);
            npv += pv;

            yearlyDetails.push({
                year: year,
                loanPayment: annualLoanPayment,
                maintenance: maintenance,
                insurance: insurance,
                tax: tax,
                resaleValue: year === this.inputs.analysisYears ? this.inputs.resaleValue : 0,
                totalCashFlow: cashFlow,
                presentValue: pv
            });
        }

        // Adjust total nominal cost for resale value
        totalNominalCost -= this.inputs.resaleValue;

        return {
            npv: npv,
            totalNominalCost: totalNominalCost,
            yearlyDetails: yearlyDetails
        };
    }

    // Calculate renting option with DCF
    calculateRentingOption(monthlyRent, kmLimit, penaltyPerKm) {
        let totalNominalCost = 0;
        let npv = 0;
        let totalPenalty = 0;
        const yearlyDetails = [];

        for (let year = 1; year <= this.inputs.analysisYears; year++) {
            // Base rent with inflation
            const adjustedRent = this.applyInflation(monthlyRent, year - 1, this.inputs.inflationRate);
            const annualRent = adjustedRent * 12;

            // Calculate penalty for exceeding km limit
            const kmExcess = Math.max(0, this.inputs.annualKm - kmLimit);
            const adjustedPenalty = this.applyInflation(penaltyPerKm, year - 1, this.inputs.inflationRate);
            const annualPenalty = kmExcess * adjustedPenalty;

            const cashFlow = annualRent + annualPenalty;
            totalNominalCost += cashFlow;
            totalPenalty += annualPenalty;

            const pv = this.calculatePV(cashFlow, year, this.inputs.discountRate);
            npv += pv;

            yearlyDetails.push({
                year: year,
                monthlyRent: adjustedRent,
                annualRent: annualRent,
                kmExcess: kmExcess,
                penalty: annualPenalty,
                totalCashFlow: cashFlow,
                presentValue: pv
            });
        }

        return {
            npv: npv,
            totalNominalCost: totalNominalCost,
            totalPenalty: totalPenalty,
            yearlyDetails: yearlyDetails
        };
    }

    // Calculate all options and compare
    calculate() {
        this.collectInputs();

        // Calculate purchase option
        this.results.purchase = this.calculatePurchaseOption();

        // Calculate renting 10k option
        this.results.renting10k = this.calculateRentingOption(
            this.inputs.renting10k,
            10000,
            this.inputs.penalty10k
        );

        // Calculate renting 15k option
        this.results.renting15k = this.calculateRentingOption(
            this.inputs.renting15k,
            15000,
            this.inputs.penalty15k
        );

        // Determine best option
        const options = [
            { name: 'purchase', npv: this.results.purchase.npv },
            { name: 'renting10k', npv: this.results.renting10k.npv },
            { name: 'renting15k', npv: this.results.renting15k.npv }
        ];

        options.sort((a, b) => a.npv - b.npv);
        this.results.bestOption = options[0].name;

        return this.results;
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Display results
    displayResults() {
        const resultsSection = document.getElementById('results');
        resultsSection.style.display = 'block';

        // Purchase results
        document.getElementById('npvPurchase').textContent = this.formatCurrency(this.results.purchase.npv);
        document.getElementById('totalPurchase').textContent = this.formatCurrency(this.results.purchase.totalNominalCost);

        // Renting 10k results
        document.getElementById('npvRenting10k').textContent = this.formatCurrency(this.results.renting10k.npv);
        document.getElementById('totalRenting10k').textContent = this.formatCurrency(this.results.renting10k.totalNominalCost);
        document.getElementById('penaltyRenting10k').textContent = this.formatCurrency(this.results.renting10k.totalPenalty);

        // Renting 15k results
        document.getElementById('npvRenting15k').textContent = this.formatCurrency(this.results.renting15k.npv);
        document.getElementById('totalRenting15k').textContent = this.formatCurrency(this.results.renting15k.totalNominalCost);
        document.getElementById('penaltyRenting15k').textContent = this.formatCurrency(this.results.renting15k.totalPenalty);

        // Recommendation
        this.displayRecommendation();

        // Yearly breakdown
        this.displayYearlyBreakdown();

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Display recommendation
    displayRecommendation() {
        const recommendationDiv = document.getElementById('recommendation');
        let message = '';
        let className = '';

        switch (this.results.bestOption) {
            case 'purchase':
                message = '💰 Recomendación: COMPRAR el vehículo. Esta opción tiene el menor Valor Presente Neto (VPN).';
                className = 'best-purchase';
                break;
            case 'renting10k':
                message = '🚗 Recomendación: RENTING 10,000 km/año. Esta opción tiene el menor Valor Presente Neto (VPN).';
                className = 'best-renting';
                break;
            case 'renting15k':
                message = '🚗 Recomendación: RENTING 15,000 km/año. Esta opción tiene el menor Valor Presente Neto (VPN).';
                className = 'best-renting';
                break;
        }

        recommendationDiv.textContent = message;
        recommendationDiv.className = 'recommendation ' + className;
    }

    // Display yearly breakdown table
    displayYearlyBreakdown() {
        const breakdownDiv = document.getElementById('yearlyBreakdown');
        
        let html = '<table class="yearly-table">';
        html += '<thead><tr>';
        html += '<th>Año</th>';
        html += '<th>Compra - Flujo de Caja</th>';
        html += '<th>Compra - Valor Presente</th>';
        html += '<th>Renting 10k - Flujo de Caja</th>';
        html += '<th>Renting 10k - Valor Presente</th>';
        html += '<th>Renting 15k - Flujo de Caja</th>';
        html += '<th>Renting 15k - Valor Presente</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        for (let i = 0; i < this.inputs.analysisYears; i++) {
            html += '<tr>';
            html += `<td>${i + 1}</td>`;
            html += `<td>${this.formatCurrency(this.results.purchase.yearlyDetails[i].totalCashFlow)}</td>`;
            html += `<td>${this.formatCurrency(this.results.purchase.yearlyDetails[i].presentValue)}</td>`;
            html += `<td>${this.formatCurrency(this.results.renting10k.yearlyDetails[i].totalCashFlow)}</td>`;
            html += `<td>${this.formatCurrency(this.results.renting10k.yearlyDetails[i].presentValue)}</td>`;
            html += `<td>${this.formatCurrency(this.results.renting15k.yearlyDetails[i].totalCashFlow)}</td>`;
            html += `<td>${this.formatCurrency(this.results.renting15k.yearlyDetails[i].presentValue)}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';
        breakdownDiv.innerHTML = html;
    }
}

// Initialize calculator
const calculator = new RentingCalculator();

// Add event listener to calculate button
document.getElementById('calculateBtn').addEventListener('click', () => {
    calculator.calculate();
    calculator.displayResults();
    drawChart(calculator.results);
});
