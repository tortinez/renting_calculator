// Calculadora Renting vs Compra (DCF) v1.3.1
// Complete implementation with monthly DCF, weekly planning, and comprehensive analysis

class DCFCalculator {
    constructor() {
        this.defaults = {
            months: 72,
            discountRate: 0.03, // annual nominal
            inflationRate: 0.02, // annual
            vat: 0.21,
            purchasePrice: 33000,
            ownershipCosts: 1200,
            fuelCost: 0.104,
            residualAnchors: [
                { year: 0, fraction: 1.0 },
                { year: 5, fraction: 0.35 },
                { year: 8, fraction: 0.25 },
                { year: 10, fraction: 0.15 }
            ],
            contracts: [
                { id: 'rent10k', label: 'Renting 10k km/año', monthlyFeeNoVAT: 326, annualAllowance: 10000, penaltyPerKm: 0.035 },
                { id: 'rent15k', label: 'Renting 15k km/año', monthlyFeeNoVAT: 345, annualAllowance: 15000, penaltyPerKm: 0.035 }
            ],
            weeklyPlan: {
                monday: [{ trips: 1, kmPerTrip: 20 }],
                tuesday: [{ trips: 1, kmPerTrip: 60 }, { trips: 1, kmPerTrip: 20 }],
                wednesday: [{ trips: 1, kmPerTrip: 15 }],
                thursday: [{ trips: 1, kmPerTrip: 15 }, { trips: 1, kmPerTrip: 20 }],
                friday: [],
                saturday: [{ trips: 1, kmPerTrip: 20 }],
                sunday: []
            },
            oneOffTrips: [
                { label: 'Viaje verano', roundTripKm: 1200, inDestinationKm: 200, monthHint: 'jul-ago' }
            ],
            weeksOff: 0,
            customWeeks: [
                { label: 'Navidad baja uso', weeks: 2, multiplier: 0.5 },
                { label: 'Verano baja uso', weeks: 2, multiplier: 0.8 }
            ]
        };
        
        this.inputs = {};
        this.results = {};
    }

    // Convert annual rate to monthly rate
    annualToMonthlyRate(annualRate) {
        return Math.pow(1 + annualRate, 1/12) - 1;
    }

    // Piecewise linear interpolation for residual value
    interpolateResidual(years, anchors) {
        // Sort anchors by year
        const sorted = [...anchors].sort((a, b) => a.year - b.year);
        
        if (years <= sorted[0].year) return sorted[0].fraction;
        if (years >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].fraction;
        
        // Find the two anchors to interpolate between
        for (let i = 0; i < sorted.length - 1; i++) {
            if (years >= sorted[i].year && years <= sorted[i + 1].year) {
                const x0 = sorted[i].year;
                const x1 = sorted[i + 1].year;
                const y0 = sorted[i].fraction;
                const y1 = sorted[i + 1].fraction;
                
                // Linear interpolation
                return y0 + (y1 - y0) * (years - x0) / (x1 - x0);
            }
        }
        
        return sorted[0].fraction;
    }

    // Calculate weekly km from weekly plan
    calculateWeeklyKm(weeklyPlan) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let totalWeeklyKm = 0;
        
        days.forEach(day => {
            if (weeklyPlan[day]) {
                weeklyPlan[day].forEach(entry => {
                    totalWeeklyKm += (entry.trips || 0) * (entry.kmPerTrip || 0);
                });
            }
        });
        
        return totalWeeklyKm;
    }

    // Calculate annual km with all modifiers
    calculateAnnualKm(inputs) {
        const weeklyKm = this.calculateWeeklyKm(inputs.weeklyPlan);
        const weeksBase = 52;
        const weeksActive = weeksBase - inputs.weeksOff;
        
        let annualKm = weeklyKm * weeksActive;
        
        // Apply custom weeks adjustments
        if (inputs.customWeeks && inputs.customWeeks.length > 0) {
            inputs.customWeeks.forEach(cw => {
                annualKm += weeklyKm * (cw.multiplier - 1) * cw.weeks;
            });
        }
        
        // Add one-off trips
        if (inputs.oneOffTrips && inputs.oneOffTrips.length > 0) {
            inputs.oneOffTrips.forEach(trip => {
                annualKm += trip.roundTripKm + trip.inDestinationKm;
            });
        }
        
        return Math.max(0, annualKm);
    }

    // Build purchase cash flows (monthly)
    buildPurchaseCashFlows(months, kmPerYear, inputs) {
        const monthlyDiscountRate = this.annualToMonthlyRate(inputs.discountRate);
        const monthlyInflationRate = this.annualToMonthlyRate(inputs.inflationRate);
        
        const cashFlows = [];
        
        // Initial purchase (month 0)
        cashFlows.push({
            month: 0,
            amount: -inputs.purchasePrice,
            description: 'Compra inicial',
            pv: -inputs.purchasePrice
        });
        
        // Monthly operating costs
        for (let m = 1; m <= months; m++) {
            const kmMonth = kmPerYear / 12;
            const fuelCost = inputs.fuelCost * kmMonth * Math.pow(1 + monthlyInflationRate, m - 1);
            const maintenanceCost = (inputs.ownershipCosts / 12) * Math.pow(1 + monthlyInflationRate, m - 1);
            
            const totalCost = fuelCost + maintenanceCost;
            const pv = -totalCost / Math.pow(1 + monthlyDiscountRate, m);
            
            cashFlows.push({
                month: m,
                amount: -totalCost,
                fuel: fuelCost,
                maintenance: maintenanceCost,
                description: `Mes ${m}`,
                pv: pv
            });
        }
        
        // Residual value at end
        const years = months / 12;
        const residualFraction = this.interpolateResidual(years, inputs.residualAnchors);
        const residualValue = inputs.purchasePrice * residualFraction;
        
        // Add to last month's cash flow
        cashFlows[cashFlows.length - 1].amount += residualValue;
        cashFlows[cashFlows.length - 1].residual = residualValue;
        cashFlows[cashFlows.length - 1].pv += residualValue / Math.pow(1 + monthlyDiscountRate, months);
        
        return cashFlows;
    }

    // Build renting cash flows (monthly)
    buildRentingCashFlows(months, kmPerYear, contract, inputs) {
        const monthlyDiscountRate = this.annualToMonthlyRate(inputs.discountRate);
        const monthlyInflationRate = this.annualToMonthlyRate(inputs.inflationRate);
        
        const monthlyFee = contract.monthlyFeeNoVAT * (1 + inputs.vat); // Fixed nominal fee
        
        const cashFlows = [];
        
        // Monthly costs
        for (let m = 1; m <= months; m++) {
            const kmMonth = kmPerYear / 12;
            const fuelCost = inputs.fuelCost * kmMonth * Math.pow(1 + monthlyInflationRate, m - 1);
            
            const totalCost = monthlyFee + fuelCost;
            const pv = -totalCost / Math.pow(1 + monthlyDiscountRate, m);
            
            cashFlows.push({
                month: m,
                amount: -totalCost,
                rentFee: monthlyFee,
                fuel: fuelCost,
                description: `Mes ${m}`,
                pv: pv
            });
        }
        
        // Penalty at end if exceeds allowance
        const years = months / 12;
        const allowedKmTotal = contract.annualAllowance * years;
        const actualKmTotal = kmPerYear * years;
        const excessKm = Math.max(0, actualKmTotal - allowedKmTotal);
        const penalty = excessKm * contract.penaltyPerKm;
        
        if (penalty > 0) {
            const penaltyPV = -penalty / Math.pow(1 + monthlyDiscountRate, months);
            cashFlows[cashFlows.length - 1].amount -= penalty;
            cashFlows[cashFlows.length - 1].penalty = penalty;
            cashFlows[cashFlows.length - 1].excessKm = excessKm;
            cashFlows[cashFlows.length - 1].pv += penaltyPV;
        }
        
        return cashFlows;
    }

    // Calculate NPV from cash flows
    calculateNPV(cashFlows) {
        return cashFlows.reduce((sum, cf) => sum + cf.pv, 0);
    }

    // Calculate total nominal cost
    calculateTotalNominal(cashFlows) {
        return cashFlows.reduce((sum, cf) => sum + cf.amount, 0);
    }

    // Main calculation function
    calculate(inputs) {
        this.inputs = inputs;
        
        // Calculate annual km
        const kmPerYear = this.calculateAnnualKm(inputs);
        
        // Calculate purchase option
        const purchaseCF = this.buildPurchaseCashFlows(inputs.months, kmPerYear, inputs);
        const purchaseNPV = this.calculateNPV(purchaseCF);
        const purchaseTotal = this.calculateTotalNominal(purchaseCF);
        
        // Calculate renting options
        const rentingResults = inputs.contracts.map(contract => {
            const rentCF = this.buildRentingCashFlows(inputs.months, kmPerYear, contract, inputs);
            const npv = this.calculateNPV(rentCF);
            const total = this.calculateTotalNominal(rentCF);
            
            // Extract penalty info
            const lastCF = rentCF[rentCF.length - 1];
            const penalty = lastCF.penalty || 0;
            const excessKm = lastCF.excessKm || 0;
            
            return {
                contract: contract,
                cashFlows: rentCF,
                npv: npv,
                totalNominal: total,
                penalty: penalty,
                excessKm: excessKm
            };
        });
        
        // Find optimal renting option (minimum NPV)
        const optimalRenting = rentingResults.reduce((min, current) => 
            current.npv < min.npv ? current : min
        );
        
        // Calculate difference
        const difference = optimalRenting.npv - purchaseNPV;
        
        // Determine best overall option
        const bestOption = difference < 0 ? 'renting' : 'purchase';
        
        this.results = {
            kmPerYear: kmPerYear,
            purchase: {
                cashFlows: purchaseCF,
                npv: purchaseNPV,
                totalNominal: purchaseTotal
            },
            renting: rentingResults,
            optimal: optimalRenting,
            difference: difference,
            bestOption: bestOption
        };
        
        return this.results;
    }

    // Break-even analysis: find months where difference is closest to zero
    findBreakEven(inputs, searchRange = { min: 12, max: 120, step: 1 }) {
        const originalMonths = inputs.months;
        const results = [];
        
        for (let m = searchRange.min; m <= searchRange.max; m += searchRange.step) {
            inputs.months = m;
            const result = this.calculate(inputs);
            results.push({
                months: m,
                years: m / 12,
                difference: result.difference,
                purchaseNPV: result.purchase.npv,
                rentingNPV: result.optimal.npv
            });
        }
        
        // Find minimum absolute difference
        const breakEven = results.reduce((min, current) => 
            Math.abs(current.difference) < Math.abs(min.difference) ? current : min
        );
        
        // Restore original months
        inputs.months = originalMonths;
        
        return { breakEven, curve: results };
    }

    // Mesh analysis: NPV difference across months and km/year
    generateMesh(inputs, meshParams = {
        months: { min: 12, max: 120, step: 6 },
        kmPerYear: { min: 6000, max: 30000, step: 2000 }
    }) {
        const originalMonths = inputs.months;
        const originalWeeklyPlan = JSON.parse(JSON.stringify(inputs.weeklyPlan));
        const originalOneOffTrips = JSON.parse(JSON.stringify(inputs.oneOffTrips));
        const originalCustomWeeks = JSON.parse(JSON.stringify(inputs.customWeeks));
        const originalWeeksOff = inputs.weeksOff;
        
        const mesh = [];
        
        for (let m = meshParams.months.min; m <= meshParams.months.max; m += meshParams.months.step) {
            for (let km = meshParams.kmPerYear.min; km <= meshParams.kmPerYear.max; km += meshParams.kmPerYear.step) {
                inputs.months = m;
                
                // Set km by adjusting weekly plan
                // Simple approach: set a single monday trip to achieve target
                inputs.weeksOff = 0;
                inputs.customWeeks = [];
                inputs.oneOffTrips = [];
                inputs.weeklyPlan = {
                    monday: [{ trips: 1, kmPerTrip: km / 52 }],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: [],
                    saturday: [],
                    sunday: []
                };
                
                const result = this.calculate(inputs);
                
                mesh.push({
                    months: m,
                    years: m / 12,
                    kmPerYear: km,
                    difference: result.difference,
                    purchaseNPV: result.purchase.npv,
                    rentingNPV: result.optimal.npv,
                    optimalContract: result.optimal.contract.id
                });
            }
        }
        
        // Restore original inputs
        inputs.months = originalMonths;
        inputs.weeklyPlan = originalWeeklyPlan;
        inputs.oneOffTrips = originalOneOffTrips;
        inputs.customWeeks = originalCustomWeeks;
        inputs.weeksOff = originalWeeksOff;
        
        return mesh;
    }

    // Calculate x* threshold for contract upgrade
    calculateXStar(contractA, contractB, months, inputs) {
        const monthlyDiscountRate = this.annualToMonthlyRate(inputs.discountRate);
        
        // Delta fee (with VAT)
        const deltaFee = (contractB.monthlyFeeNoVAT - contractA.monthlyFeeNoVAT) * (1 + inputs.vat);
        
        // Delta allowance
        const deltaAllow = contractB.annualAllowance - contractA.annualAllowance;
        
        // Penalty per km
        const pen = contractA.penaltyPerKm;
        
        // PV annuity factor
        let pvAnnuity = 0;
        for (let m = 1; m <= months; m++) {
            pvAnnuity += 1 / Math.pow(1 + monthlyDiscountRate, m);
        }
        
        // PV at end
        const pvEnd = 1 / Math.pow(1 + monthlyDiscountRate, months);
        
        // Years
        const years = months / 12;
        
        // x* formula
        const xStar = (deltaFee * pvAnnuity) / (years * pen * pvEnd);
        
        return xStar;
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

    // Format number
    formatNumber(num, decimals = 0) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }

    // Export to CSV
    exportToCSV() {
        if (!this.results || !this.results.purchase) {
            return '';
        }
        
        let csv = 'Mes,Compra,Compra Combustible,Compra Mantenimiento,Compra Residual,';
        csv += 'Renting Optimo,Renting Cuota,Renting Combustible,Renting Penalizacion\n';
        
        const maxLength = Math.max(
            this.results.purchase.cashFlows.length,
            this.results.optimal.cashFlows.length
        );
        
        for (let i = 0; i < maxLength; i++) {
            const purchaseCF = this.results.purchase.cashFlows[i];
            const rentingCF = this.results.optimal.cashFlows[i];
            
            csv += `${i},`;
            
            if (purchaseCF) {
                csv += `${purchaseCF.amount},`;
                csv += `${purchaseCF.fuel || 0},`;
                csv += `${purchaseCF.maintenance || 0},`;
                csv += `${purchaseCF.residual || 0},`;
            } else {
                csv += ',,,,'
            }
            
            if (rentingCF) {
                csv += `${rentingCF.amount},`;
                csv += `${rentingCF.rentFee || 0},`;
                csv += `${rentingCF.fuel || 0},`;
                csv += `${rentingCF.penalty || 0}`;
            }
            
            csv += '\n';
        }
        
        return csv;
    }

    // Export to JSON
    exportToJSON() {
        return JSON.stringify({
            inputs: this.inputs,
            results: {
                kmPerYear: this.results.kmPerYear,
                purchase: {
                    npv: this.results.purchase.npv,
                    totalNominal: this.results.purchase.totalNominal
                },
                optimal: {
                    contract: this.results.optimal.contract,
                    npv: this.results.optimal.npv,
                    totalNominal: this.results.optimal.totalNominal,
                    penalty: this.results.optimal.penalty,
                    excessKm: this.results.optimal.excessKm
                },
                difference: this.results.difference,
                bestOption: this.results.bestOption
            }
        }, null, 2);
    }
}

// Global calculator instance
window.calculator = new DCFCalculator();
