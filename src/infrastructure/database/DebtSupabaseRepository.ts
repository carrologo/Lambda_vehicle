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
    if (data.TypeDebtId !== undefined) updateData.type_debt_id = data.TypeDebtId;

    console.log("Updating debt with ID:", debtId, "Data:", updateData);
    
    const { error } = await this.supabase!.from("vehicle_debt")
      .update(updateData)
      .eq("id", debtId);

    if (error) {
      console.error("Error updating debt:", error);
      throw new Error(error.message);
    }
  }

  async delete(vehicleId: number): Promise<void> {
    await this.init();
    const { error } = await this.supabase!.from("vehicle_debt")
      .delete()
      .eq("vehicle_id", vehicleId);

    if (error) {
      console.error("Error deleting debt:", error);
      throw new Error(error.message);
    }
  }

  async updateAllDebts(vehicleId: number, debts: Debt[]): Promise<void> {
    await this.init();

    try {
      // 1. Obtener deudas actuales del vehículo con una consulta directa a Supabase
      const { data: currentData, error: fetchError } = await this.supabase!
        .from("vehicle_debt")
        .select("*")
        .eq("vehicle_id", vehicleId);

      if (fetchError) {
        console.error("Error fetching current debts:", fetchError);
        throw new Error(fetchError.message);
      }

      // Convertir a objetos Debt
      const currentDebts = (currentData || []).map((item: any) =>
        new Debt(item.amount, item.type_debt_id, item.vehicle_id, item.id)
      );

      // 2. Crear mapas para facilitar comparaciones
      const currentDebtsMap = new Map(
        currentDebts.map(debt => [debt.id!, debt])
      );
      const newDebtsMap = new Map(
        debts.filter(debt => debt.id).map(debt => [debt.id!, debt])
      );

      // 3. Identificar deudas a actualizar
      for (const newDebt of debts) {
        if (newDebt.id && currentDebtsMap.has(newDebt.id)) {
          // La deuda existe, actualizarla si hay cambios
          const currentDebt = currentDebtsMap.get(newDebt.id)!;
          
          // Verificar si hay cambios
          const hasChanges = 
            currentDebt.amount !== newDebt.amount ||
            currentDebt.TypeDebtId !== newDebt.TypeDebtId;

          if (hasChanges) {
            // Actualizar directamente en Supabase
            const updateData: any = {};
            if (newDebt.amount !== undefined) updateData.amount = newDebt.amount;
            if (newDebt.TypeDebtId !== undefined) updateData.type_debt_id = newDebt.TypeDebtId;

            const { error: updateError } = await this.supabase!
              .from("vehicle_debt")
              .update(updateData)
              .eq("id", newDebt.id);

            if (updateError) {
              console.error("Error updating debt:", updateError);
              throw new Error(updateError.message);
            }
          }
        }
      }

      // 4. Identificar deudas a eliminar
      for (const currentDebt of currentDebts) {
        if (currentDebt.id && !newDebtsMap.has(currentDebt.id)) {
          // La deuda ya no existe en la nueva lista, eliminarla
          const { error: deleteError } = await this.supabase!
            .from("vehicle_debt")
            .delete()
            .eq("id", currentDebt.id);

          if (deleteError) {
            console.error("Error deleting debt:", deleteError);
            throw new Error(deleteError.message);
          }
        }
      }

      // 5. Identificar deudas nuevas a crear
      for (const newDebt of debts) {
        if (!newDebt.id || newDebt.id === null) {
          // Es una deuda nueva, crearla
          const { error: insertError } = await this.supabase!
            .from("vehicle_debt")
            .insert({
              vehicle_id: vehicleId,
              amount: newDebt.amount,
              type_debt_id: newDebt.TypeDebtId,
            });

          if (insertError) {
            console.error("Error inserting debt:", insertError);
            throw new Error(insertError.message);
          }
        }
      }

    } catch (error) {
      console.error("Error updating all debts:", error);
      throw new Error(
        `Failed to update all debts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
