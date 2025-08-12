export interface SystemProposed {
    system_power_w: number;
    panel_count: number;
    panel_power_w: number;
    required_area_m2: number;
}

export interface SourceConsumption {
    average_bimonthly_bill_mxn: number;
}

export interface CfeInfo {
    tariff_type_id: number;
    tariff_type: string;
}

export interface Savings {
    bimonthly_mxn: number;
    annual_mxn: number;
    percentage: number;
}

export interface NewBilling {
    monthly_lease_mxn: number;
    estimated_bimonthly_cfe_mxn: number;
    total_bimonthly_payment_mxn: number;
}

export interface Financials {
    savings: Savings;
    new_billing: NewBilling;
}

export interface QuoteDetails {
    source_consumption: SourceConsumption;
    cfe_info: CfeInfo;
    financials: Financials;
}

export class ProspectQuote {
    public name: string;
    public last_name: string;
    public prospect_id: string;
    public terralink_id: string;
    public system_proposed: SystemProposed;
    public quote_details: QuoteDetails;

    constructor(
        name: string,
        last_name: string,
        prospect_id: string,
        terralink_id: string,
        system_proposed: SystemProposed,
        quote_details: QuoteDetails
    ) {
        this.name = name;
        this.last_name = last_name;
        this.prospect_id = prospect_id;
        this.terralink_id = terralink_id;
        this.system_proposed = system_proposed;
        this.quote_details = quote_details;
    }

    // Static method to create instance from JSON data
    static fromJSON(data: any): ProspectQuote {
        return new ProspectQuote(
            data.name,
            data.last_name,
            data.prospect_id,
            data.terralink_id,
            data.system_proposed,
            data.quote_details
        );
    }

    // Method to convert instance to JSON
    toJSON(): object {
        return {
            name: this.name,
            last_name: this.last_name,
            prospect_id: this.prospect_id,
            terralink_id: this.terralink_id,
            system_proposed: this.system_proposed,
            quote_details: this.quote_details
        };
    }

    // Getter methods
    public getClientName(): string {
        return this.name;
    }
    public getClientLastName(): string {
        return this.last_name;
    }
    public getProspectId(): string {
        return this.prospect_id;
    }
    public getTerralinkId(): string {
        return this.terralink_id;
    }
    public getSystemProposed(): SystemProposed {
        return this.system_proposed;
    }
    public getQuoteDetails(): QuoteDetails {
        return this.quote_details;
    }
    public getTotalSystemPower(): number {
        return this.system_proposed.system_power_w;
    }
    public getMonthlySavings(): number {
        return this.quote_details.financials.savings.bimonthly_mxn / 2;
    }
    public getAnnualSavings(): number {
        return this.quote_details.financials.savings.annual_mxn;
    }
    public getCfeTariffType(): string {
        return this.quote_details.cfe_info.tariff_type;
    }
    public getAverageBimonthlyBill(): number {
        return this.quote_details.source_consumption.average_bimonthly_bill_mxn;
    }
    public getEstimatedBimonthlyCfe(): number {
        return this.quote_details.financials.new_billing.estimated_bimonthly_cfe_mxn;
    }
    public getTotalBimonthlyPayment(): number {
        return this.quote_details.financials.new_billing.total_bimonthly_payment_mxn;
    }
    public getMonthlyLease(): number {
        return this.quote_details.financials.new_billing.monthly_lease_mxn;
    }

}