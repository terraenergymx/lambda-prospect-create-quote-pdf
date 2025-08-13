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
  estimated_cfe_saving: number; // porcentaje estimado de ahorro vs CFE (asumiendo %)
  suscription_bill: number;     // (sic) conservamos el nombre tal cual llega en el JSON
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

  // =====================
  // Factories & Helpers
  // =====================

  private static toNumber(val: unknown, fallback = 0): number {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    return fallback;
  }

  static fromJSON(data: any): ProspectQuote {
    // system_proposed
    const system_proposed: SystemProposed = {
      system_power_w: ProspectQuote.toNumber(data?.system_proposed?.system_power_w),
      required_area_m2: ProspectQuote.toNumber(data?.system_proposed?.required_area_m2),
    };

    // source_consumption
    const period = (data?.quote_details?.source_consumption?.period ?? "bimonthly") as ConsumptionPeriod;
    const source_consumption: SourceConsumption = {
      period,
      average_period_bill: ProspectQuote.toNumber(data?.quote_details?.source_consumption?.average_period_bill),
    };

    // cfe_info
    const cfe_info: CfeInfo = {
      actual_payment: ProspectQuote.toNumber(data?.quote_details?.cfe_info?.actual_payment),
    };

    // terraenergy_info
    const terraenergy_info: TerraenergyInfo = {
      estimated_cfe_saving: ProspectQuote.toNumber(data?.quote_details?.terraenergy_info?.estimated_cfe_saving),
      suscription_bill: ProspectQuote.toNumber(data?.quote_details?.terraenergy_info?.suscription_bill),
    };

    // savings
    const savings: Savings = {
      percentage: ProspectQuote.toNumber(data?.quote_details?.savings?.percentage),
      period_mxn: ProspectQuote.toNumber(data?.quote_details?.savings?.period_mxn),
      annual_mxn: ProspectQuote.toNumber(data?.quote_details?.savings?.annual_mxn),
    };

    const total_period_payment = ProspectQuote.toNumber(data?.quote_details?.total_period_payment);

    const quote_details: QuoteDetails = {
      source_consumption,
      cfe_info,
      terraenergy_info,
      savings,
      total_period_payment,
    };

    return new ProspectQuote(
      data?.name ?? "",
      data?.last_name ?? "",
      data?.prospect_id ?? "",
      data?.terralink_id ?? "",
      system_proposed,
      quote_details
    );
  }

  toJSON(): object {
    return {
      name: this.name,
      last_name: this.last_name,
      prospect_id: this.prospect_id,
      terralink_id: this.terralink_id,
      system_proposed: this.system_proposed,
      quote_details: this.quote_details,
    };
  }

  // =====================
  // Getters conservando nombres si aplica
  // =====================

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

  // ==== NUEVOS GETTERS ajustados al nuevo esquema ====

  public getConsumptionPeriod(): ConsumptionPeriod {
    return this.quote_details.source_consumption.period;
  }
  public getAveragePeriodBill(): number {
    return this.quote_details.source_consumption.average_period_bill;
  }
  public getActualCfePayment(): number {
    return this.quote_details.cfe_info.actual_payment;
  }
  public getTerraSubscriptionBill(): number {
    return this.quote_details.terraenergy_info.suscription_bill;
  }
  public getEstimatedCfeSavingPercentage(): number {
    return this.quote_details.terraenergy_info.estimated_cfe_saving;
  }
  public getSavingsPercentage(): number {
    return this.quote_details.savings.percentage;
  }
  public getSavingsPeriod(): number {
    return this.quote_details.savings.period_mxn;
  }
  public getSavingsAnnual(): number {
    return this.quote_details.savings.annual_mxn;
  }
  public getTotalPeriodPayment(): number {
    return this.quote_details.total_period_payment;
  }
}
