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
            financing: {
                enabled: false,
                loanAmount: null, // defaults to purchasePrice - downPayment
                downPayment: 0,
                termMonths: 60,
                annualInterestRate: 0.07, // TAE 7%
                balloonPayment: 0
            },
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
                monday: [{ trips: 2, kmPerTrip: 20 }],
                tuesday: [{ trips: 2, kmPerTrip: 60 }, { trips: 2, kmPerTrip: 20 }],
                wednesday: [{ trips: 2, kmPerTrip: 15 }],
                thursday: [{ trips: 2, kmPerTrip: 15 }, { trips: 2, kmPerTrip: 20 }],
                friday: [],
                saturday: [{ trips: 2, kmPerTrip: 20 }],
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
    // @param {number} years - Number of years for interpolation
    // @param {Array<{year: number, fraction: number}>} anchors - Array of anchor points
    // @returns {number} Interpolated residual value fraction (0-1)
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

    /**
     * Calculate monthly loan payment using standard amortization formula.
     * 
     * @param {number} principal - The loan principal amount
     * @param {number} annualRate - Annual interest rate (TAE) as decimal (e.g., 0.07 for 7%)
     * @param {number} termMonths - Loan duration in months
     * @returns {number} Monthly payment amount
     * 
     * Formula:
     *   r = (1 + TAE)^(1/12) - 1  (monthly rate derived from TAE)
     *   payment = principal * r / (1 - (1 + r)^(-term))
     */
    calculateMonthlyLoanPayment(principal, annualRate, termMonths) {
        if (principal <= 0 || termMonths <= 0) return 0;
        if (annualRate <= 0) return principal / termMonths; // No interest case
        
        const monthlyRate = this.annualToMonthlyRate(annualRate);
        const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths));
        return payment;
    }

    /**
     * Generate loan amortization schedule with principal/interest split.
     * 
     * @param {number} loanAmount - Total loan amount
     * @param {number} annualRate - Annual interest rate (TAE) as decimal
     * @param {number} termMonths - Loan duration in months
     * @param {number} balloonPayment - Optional final lump sum payment (defaults to 0)
     * @returns {Array<{month: number, payment: number, principal: number, interest: number, remainingBalance: number}>}
     * 
     * For balloon loans: Monthly payments are calculated to fully amortize (loanAmount - balloonPayment),
     * with the balloon payment due as an additional lump sum in the final month.
     */
    generateLoanSchedule(loanAmount, annualRate, termMonths, balloonPayment = 0) {
        const schedule = [];
        
        if (loanAmount <= 0 || termMonths <= 0) {
            return schedule;
        }
        
        // Validate balloon payment
        const validBalloon = Math.min(balloonPayment, loanAmount);
        
        // For balloon loans: calculate monthly payment to amortize (loanAmount - balloon) over termMonths
        // The balloon payment is an additional lump sum due at the end
        const amortizedPrincipal = loanAmount - validBalloon;
        const monthlyPayment = amortizedPrincipal > 0 
            ? this.calculateMonthlyLoanPayment(amortizedPrincipal, annualRate, termMonths)
            : 0;
        const monthlyRate = annualRate <= 0 ? 0 : this.annualToMonthlyRate(annualRate);
        
        let remainingBalance = loanAmount;
        
        for (let month = 1; month <= termMonths; month++) {
            const interestPayment = remainingBalance * monthlyRate;
            let principalPayment = monthlyPayment - interestPayment;
            let totalPayment = monthlyPayment;
            
            // Last month: add balloon payment and adjust for any remaining balance
            if (month === termMonths) {
                // Pay off all remaining balance (includes balloon)
                principalPayment = remainingBalance;
                totalPayment = principalPayment + interestPayment;
            }
            
            schedule.push({
                month: month,
                payment: totalPayment,
                principal: principalPayment,
                interest: interestPayment,
                remainingBalance: Math.max(0, remainingBalance - principalPayment)
            });
            
            remainingBalance -= principalPayment;
        }
        
        return schedule;
    }

    /**
     * Calculate financing summary including total costs and monthly payment.
     * 
     * @param {Object} financing - Financing configuration object
     * @param {boolean} financing.enabled - Whether financing is enabled
     * @param {number|null} financing.loanAmount - Loan amount (null defaults to purchasePrice - downPayment)
     * @param {number} financing.downPayment - Down payment amount
     * @param {number} financing.termMonths - Loan term in months
     * @param {number} financing.annualInterestRate - TAE as decimal (e.g., 0.07 for 7%)
     * @param {number} financing.balloonPayment - Optional final balloon payment
     * @param {number} purchasePrice - Vehicle purchase price
     * @returns {Object} Financing summary with loanAmount, monthlyPayment, totalInterest, totalFinancedCost, etc.
     */
    calculateFinancingSummary(financing, purchasePrice) {
        const downPayment = financing.downPayment || 0;
        const loanAmount = financing.loanAmount !== null ? financing.loanAmount : (purchasePrice - downPayment);
        const termMonths = financing.termMonths || 60;
        const annualRate = financing.annualInterestRate || 0.07;
        const balloonPayment = financing.balloonPayment || 0;
        
        const schedule = this.generateLoanSchedule(loanAmount, annualRate, termMonths, balloonPayment);
        
        const totalPayments = schedule.reduce((sum, s) => sum + s.payment, 0);
        const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);
        const monthlyPayment = schedule.length > 0 ? schedule[0].payment : 0;
        
        return {
            loanAmount: loanAmount,
            downPayment: downPayment,
            termMonths: termMonths,
            annualInterestRate: annualRate,
            balloonPayment: balloonPayment,
            monthlyPayment: monthlyPayment,
            totalPayments: totalPayments,
            totalInterest: totalInterest,
            totalFinancedCost: downPayment + totalPayments,
            schedule: schedule
        };
    }

    // Build purchase cash flows (monthly)
    buildPurchaseCashFlows(months, kmPerYear, inputs) {
        const monthlyDiscountRate = this.annualToMonthlyRate(inputs.discountRate);
        const monthlyInflationRate = this.annualToMonthlyRate(inputs.inflationRate);
        
        const cashFlows = [];
        
        // Check if financing is enabled
        const financingEnabled = inputs.financing && inputs.financing.enabled;
        let financingSummary = null;
        
        if (financingEnabled) {
            financingSummary = this.calculateFinancingSummary(inputs.financing, inputs.purchasePrice);
            
            // Down payment at month 0 (if any)
            if (financingSummary.downPayment > 0) {
                cashFlows.push({
                    month: 0,
                    amount: -financingSummary.downPayment,
                    description: 'Entrada inicial',
                    downPayment: financingSummary.downPayment,
                    pv: -financingSummary.downPayment
                });
            } else {
                // Empty month 0 for consistency
                cashFlows.push({
                    month: 0,
                    amount: 0,
                    description: 'Inicio financiación',
                    pv: 0
                });
            }
        } else {
            // Initial purchase (month 0) - full payment upfront
            cashFlows.push({
                month: 0,
                amount: -inputs.purchasePrice,
                description: 'Compra inicial',
                pv: -inputs.purchasePrice
            });
        }
        
        // Monthly operating costs (and loan payments if financing)
        for (let m = 1; m <= months; m++) {
            const kmMonth = kmPerYear / 12;
            const fuelCost = inputs.fuelCost * kmMonth * Math.pow(1 + monthlyInflationRate, m - 1);
            const maintenanceCost = (inputs.ownershipCosts / 12) * Math.pow(1 + monthlyInflationRate, m - 1);
            
            let totalCost = fuelCost + maintenanceCost;
            let loanPayment = 0;
            let loanPrincipal = 0;
            let loanInterest = 0;
            
            // Add loan payment if within financing term
            if (financingEnabled && financingSummary && m <= financingSummary.termMonths) {
                const scheduleEntry = financingSummary.schedule[m - 1];
                if (scheduleEntry) {
                    loanPayment = scheduleEntry.payment;
                    loanPrincipal = scheduleEntry.principal;
                    loanInterest = scheduleEntry.interest;
                    totalCost += loanPayment;
                }
            }
            
            const pv = -totalCost / Math.pow(1 + monthlyDiscountRate, m);
            
            const cfEntry = {
                month: m,
                amount: -totalCost,
                fuel: fuelCost,
                maintenance: maintenanceCost,
                description: `Mes ${m}`,
                pv: pv
            };
            
            // Add financing details if present
            if (financingEnabled && loanPayment > 0) {
                cfEntry.loanPayment = loanPayment;
                cfEntry.loanPrincipal = loanPrincipal;
                cfEntry.loanInterest = loanInterest;
            }
            
            cashFlows.push(cfEntry);
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
        
        // Calculate financing summary if enabled
        let financingSummary = null;
        if (inputs.financing && inputs.financing.enabled) {
            financingSummary = this.calculateFinancingSummary(inputs.financing, inputs.purchasePrice);
        }
        
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
        
        // Find optimal renting option (minimum NPV - least negative, i.e., lowest cost)
        const optimalRenting = rentingResults.reduce((min, current) => 
            current.npv > min.npv ? current : min
        );
        
        // Calculate difference (both NPVs are negative, so positive difference means renting is better)
        const difference = optimalRenting.npv - purchaseNPV;
        
        // Determine best overall option
        // Since NPVs are negative (costs), positive difference means renting costs less (is better)
        const bestOption = difference > 0 ? 'renting' : 'purchase';
        
        this.results = {
            kmPerYear: kmPerYear,
            purchase: {
                cashFlows: purchaseCF,
                npv: purchaseNPV,
                totalNominal: purchaseTotal,
                financing: financingSummary
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
        
        // Check if financing is enabled
        const hasFinancing = this.results.purchase.financing !== null;
        
        let csv = 'Mes,Compra,Compra Combustible,Compra Mantenimiento,Compra Residual';
        if (hasFinancing) {
            csv += ',Cuota Préstamo,Principal,Intereses';
        }
        csv += ',Renting Optimo,Renting Cuota,Renting Combustible,Renting Penalizacion\n';
        
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
                csv += `${purchaseCF.residual || 0}`;
                if (hasFinancing) {
                    csv += `,${purchaseCF.loanPayment || 0}`;
                    csv += `,${purchaseCF.loanPrincipal || 0}`;
                    csv += `,${purchaseCF.loanInterest || 0}`;
                }
                csv += ',';
            } else {
                csv += hasFinancing ? ',,,,,,,,' : ',,,,';
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
        const purchaseData = {
            npv: this.results.purchase.npv,
            totalNominal: this.results.purchase.totalNominal
        };
        
        // Include financing summary if available
        if (this.results.purchase.financing) {
            purchaseData.financing = {
                loanAmount: this.results.purchase.financing.loanAmount,
                downPayment: this.results.purchase.financing.downPayment,
                termMonths: this.results.purchase.financing.termMonths,
                annualInterestRate: this.results.purchase.financing.annualInterestRate,
                balloonPayment: this.results.purchase.financing.balloonPayment,
                monthlyPayment: this.results.purchase.financing.monthlyPayment,
                totalPayments: this.results.purchase.financing.totalPayments,
                totalInterest: this.results.purchase.financing.totalInterest,
                totalFinancedCost: this.results.purchase.financing.totalFinancedCost
            };
        }
        
        return JSON.stringify({
            inputs: this.inputs,
            results: {
                kmPerYear: this.results.kmPerYear,
                purchase: purchaseData,
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
