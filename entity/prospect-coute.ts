export type SourceConsumptionPeriod = string; // ej: "6 bimestres"
export type SavingsPeriod = string;           // ej: "Bimestral"
export type SavingsYearPeriod = string;       // ej: "3 años"

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
  actual_bimontly_payment: number; // nombre exacto del JSON
}

export interface TerraenergyInfo {
  price_KWh: number;
  bimontly_payment: number; // nombre exacto del JSON
  montly_payment: number;   // nombre exacto del JSON
}

export interface Savings {
  percentage: number;
  period: SavingsPeriod;               // "Bimestral"
  year_period: SavingsYearPeriod;      // "3 años"
  period_saving: number;               // 1900
  year_period_saving: number;          // 1900
  eight_years_saving: number;          // 52800
}

export interface QuoteDetails {
  source_consumption: SourceConsumption;
  system_proposed: SystemProposed;
  cfe_info: CfeInfo;
  terraenergy_info: TerraenergyInfo;
  savings: Savings;
}

export class ProspectQuote {
  public name: string;
  public last_name: string;
  public prospect_id: string;
  public terralink_id: string;
  public quote_details: QuoteDetails;

  constructor(
    name: string,
    last_name: string,
    prospect_id: string,
    terralink_id: string,
    quote_details: QuoteDetails
  ) {
    this.name = name;
    this.last_name = last_name;
    this.prospect_id = prospect_id;
    this.terralink_id = terralink_id;
    this.quote_details = quote_details;
  }

  // =====================
  // Helpers / Factory
  // =====================

  private static toNumber(val: unknown, fallback = 0): number {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    return fallback;
  }

  static fromJSON(data: any): ProspectQuote {
    const source_consumption: SourceConsumption = {
      period: data?.quote_details?.source_consumption?.period ?? "",
      consumption_KWh: ProspectQuote.toNumber(data?.quote_details?.source_consumption?.consumption_KWh),
    };

    const system_proposed: SystemProposed = {
      system_power_w: ProspectQuote.toNumber(data?.quote_details?.system_proposed?.system_power_w),
      system_energy_KWh: ProspectQuote.toNumber(data?.quote_details?.system_proposed?.system_energy_KWh),
      required_area_m2: ProspectQuote.toNumber(data?.quote_details?.system_proposed?.required_area_m2),
    };

    const cfe_info: CfeInfo = {
      tariff_type_id: ProspectQuote.toNumber(data?.quote_details?.cfe_info?.tariff_type_id),
      tariff_type: data?.quote_details?.cfe_info?.tariff_type ?? "",
      price_KWh: ProspectQuote.toNumber(data?.quote_details?.cfe_info?.price_KWh),
      actual_bimontly_payment: ProspectQuote.toNumber(data?.quote_details?.cfe_info?.actual_bimontly_payment),
    };

    const terraenergy_info: TerraenergyInfo = {
      price_KWh: ProspectQuote.toNumber(data?.quote_details?.terraenergy_info?.price_KWh),
      bimontly_payment: ProspectQuote.toNumber(data?.quote_details?.terraenergy_info?.bimontly_payment),
      montly_payment: ProspectQuote.toNumber(data?.quote_details?.terraenergy_info?.montly_payment),
    };

    const savings: Savings = {
      percentage: ProspectQuote.toNumber(data?.quote_details?.savings?.percentage),
      period: data?.quote_details?.savings?.period ?? "",
      year_period: data?.quote_details?.savings?.year_period ?? "",
      period_saving: ProspectQuote.toNumber(data?.quote_details?.savings?.period_saving),
      year_period_saving: ProspectQuote.toNumber(data?.quote_details?.savings?.year_period_saving),
      eight_years_saving: ProspectQuote.toNumber(data?.quote_details?.savings?.eight_years_saving),
    };

    const quote_details: QuoteDetails = {
      source_consumption,
      system_proposed,
      cfe_info,
      terraenergy_info,
      savings,
    };

    return new ProspectQuote(
      data?.name ?? "",
      data?.last_name ?? "",
      data?.prospect_id ?? "",
      data?.terralink_id ?? "",
      quote_details
    );
  }

  toJSON(): object {
    return {
      name: this.name,
      last_name: this.last_name,
      prospect_id: this.prospect_id,
      terralink_id: this.terralink_id,
      quote_details: this.quote_details,
    };
  }

  // =====================
  // Getters
  // =====================

  public getClientName(): string { return this.name; }
  public getClientLastName(): string { return this.last_name; }
  public getProspectId(): string { return this.prospect_id; }
  public getTerralinkId(): string { return this.terralink_id; }

  // Atajos a quote_details
  public getQuoteDetails(): QuoteDetails { return this.quote_details; }
  public getSystemProposed(): SystemProposed { return this.quote_details.system_proposed; }

  // System proposed
  public getTotalSystemPowerW(): number { return this.quote_details.system_proposed.system_power_w; }
  public getSystemEnergyKWh(): number { return this.quote_details.system_proposed.system_energy_KWh; }
  public getRequiredAreaM2(): number { return this.quote_details.system_proposed.required_area_m2; }

  // Consumo
  public getSourceConsumptionPeriod(): string { return this.quote_details.source_consumption.period; }
  public getSourceConsumptionKWh(): number { return this.quote_details.source_consumption.consumption_KWh; }

  // CFE
  public getCfeTariffTypeId(): number { return this.quote_details.cfe_info.tariff_type_id; }
  public getCfeTariffType(): string { return this.quote_details.cfe_info.tariff_type; }
  public getCfePriceKWh(): number { return this.quote_details.cfe_info.price_KWh; }
  public getCfeActualBimontlyPayment(): number { return this.quote_details.cfe_info.actual_bimontly_payment; }

  // Terraenergy
  public getTerraPriceKWh(): number { return this.quote_details.terraenergy_info.price_KWh; }
  public getTerraBimontlyPayment(): number { return this.quote_details.terraenergy_info.bimontly_payment; }
  public getTerraMontlyPayment(): number { return this.quote_details.terraenergy_info.montly_payment; }

  // Savings
  public getSavingsPercentage(): number { return this.quote_details.savings.percentage; }
  public getSavingsPeriodLabel(): string { return this.quote_details.savings.period; }         // "Bimestral"
  public getSavingsYearPeriodLabel(): string { return this.quote_details.savings.year_period; } // "3 años"
  public getSavingsPeriodAmount(): number { return this.quote_details.savings.period_saving; }
  public getSavingsYearPeriodAmount(): number { return this.quote_details.savings.year_period_saving; }
  public getSavingsEightYearsAmount(): number { return this.quote_details.savings.eight_years_saving; }
}
