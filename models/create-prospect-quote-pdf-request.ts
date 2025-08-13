export type ConsumptionPeriod = "monthly" | "bimonthly";
export interface SystemProposed {
    system_power_w: number;
    required_area_m2: number;
}

export interface SourceConsumption {
    period: ConsumptionPeriod;
    average_period_bill: number;
}

export interface CfeInfo {
    actual_payment: number;
}

export interface TerraenergyInfo {
    estimated_cfe_saving: number;
    suscription_bill: number;
}

export interface Savings {
    percentage: number;
    period_mxn: number;
    annual_mxn: number;
}

export interface QuoteDetails {
    source_consumption: SourceConsumption;
    cfe_info: CfeInfo;
    terraenergy_info: TerraenergyInfo;
    savings: Savings;
    total_period_payment: number;
}

export interface CreateProspectQuotePdfRequest {
    name: string;
    last_name: string;
    prospect_id: string;
    terralink_id: string;
    system_proposed: SystemProposed;
    quote_details: QuoteDetails;
}
