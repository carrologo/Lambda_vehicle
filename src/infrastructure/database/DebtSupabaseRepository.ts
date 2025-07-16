import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Debt } from "../../domain/entities/Debt";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";

export class DebtSupabaseRepository implements IDebtRepository {
  private secrets: Record<string, string> | null = null;
  private supabase: SupabaseClient | null = null;

  private async init() {
    if (!this.secrets) {
      this.secrets = await getGoogleSecrets();
      this.supabase = createClient(
        this.secrets.SUPABASE_URL,
        this.secrets.SUPABASE_KEY
      );
    }
  }

  async save(debt: Debt): Promise<void> {
    await this.init();
    const { error } = await this.supabase!.from("vehicle_debt").insert({
      vehicle_id: debt.VehicleId,
      amount: debt.amount,
      type_debt_id: debt.TypeDebtId,
    });

    if (error) {
      console.error("Error inserting debt:", error);
      throw new Error(error.message);
    }
  }

  async getByVehicleId(vehicleId: number): Promise<Debt[]> {
    await this.init();
    const { data, error } = await this.supabase!.from("vehicle_debt")
      .select("*")
      .eq("vehicle_id", vehicleId);

    if (error) {
      console.error("Error fetching debts:", error);
      return [];
    }

    return (data || []).map(
      (item: any) =>
        new Debt(item.amount, item.type_debt_id, item.vehicle_id, item.id)
    );
  }

  async getByVehicleIds(vehicleIds: number[]): Promise<Debt[]> {
    await this.init();
    
    if (vehicleIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase!.from("vehicle_debt")
      .select("*")
      .in("vehicle_id", vehicleIds);

    if (error) {
      console.error("Error fetching debts:", error);
      return [];
    }

    return (data || []).map(
      (item: any) =>
        new Debt(item.amount, item.type_debt_id, item.vehicle_id, item.id)
    );
  }

  async update(debtId: number, data: Partial<Debt>): Promise<void> {
    await this.init();
    const updateData: any = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.TypeDebtId !== undefined)
      updateData.type_debt_id = data.TypeDebtId;

    const { error } = await this.supabase!.from("vehicle_debt")
      .update(updateData)
      .eq("id", debtId);

    if (error) {
      console.error("Error updating debt:", error);
      throw new Error(error.message);
    }
  }
}
