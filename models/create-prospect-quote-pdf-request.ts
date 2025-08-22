export type SourceConsumptionPeriod = string;

export type SavingsPeriodLabel = string;
export type SavingsYearPeriodLabel = string;

export interface SourceConsumption {
  period: SourceConsumptionPeriod;
  consumption_KWh: number;
}

export interface SystemProposed {
  system_power_w: number;
  system_energy_KWh: number;
  required_area_m2: number;
}

export interface CfeInfo {
  tariff_type_id: number;
  tariff_type: string;
  price_KWh: number;
  actual_bimontly_payment: number;
}

export interface TerraenergyInfo {
  price_KWh: number;
  bimontly_payment: number;
  montly_payment: number;  
}

export interface Savings {
  percentage: number;
  period: SavingsPeriodLabel;          // "Bimestral"
  year_period: SavingsYearPeriodLabel; // "3 años"
  period_saving: number;
  year_period_saving: number;
  eight_years_saving: number;
}

export interface QuoteDetails {
  source_consumption: SourceConsumption;
  system_proposed: SystemProposed;
  cfe_info: CfeInfo;
  terraenergy_info: TerraenergyInfo;
  savings: Savings;
}

// Request final para el CU
export interface CreateProspectQuotePdfRequest {
  name: string;
  last_name: string;
  prospect_id: string;
  terralink_id: string;
  quote_details: QuoteDetails;
}
