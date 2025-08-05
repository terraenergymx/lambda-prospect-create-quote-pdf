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

export interface CreateProspectQuotePdfRequest {
    name: string;
    last_name: string;
    prospect_id: string;
    terralink_id: string;
    system_proposed: SystemProposed;
    quote_details: QuoteDetails;
}