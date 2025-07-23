import axios from "axios";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Debt } from "../../domain/entities/Debt";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";
import { DebtMapper } from "../../application/mapper/DebtMapper";

export class DebtHttpRepository implements IDebtRepository {
  private apiUrl: string | null = null;
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

  private async getApiUrl(): Promise<string> {
    if (!this.apiUrl) {
      const secrets = await getGoogleSecrets();
      this.apiUrl = secrets.DEBTS_API_URL;
      console.log("Debt API URL:", this.apiUrl);
    }
    return this.apiUrl!;
  }

  async save(debt: Debt): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      const debtApiFormat = DebtMapper.toApiFormat(debt);
      console.log("Saving debt to API:", apiUrl, debtApiFormat);
      await axios.post(`${apiUrl}/vehicle-debts`, debtApiFormat, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error saving debt to API:", error);
      throw new Error(
        `Failed to save debt: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async update(debtId: number, data: Partial<Debt>): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      const mappedData = data.amount ? { amount: data.amount } : data;
      await axios.patch(`${apiUrl}/vehicle-debts/${debtId}`, mappedData, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating debt:", error);
      throw new Error(
        `Failed to update debt: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getByVehicleId(vehicleId: number): Promise<Debt[]> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await axios.get(
        `${apiUrl}/vehicle-debts/vehicle/${vehicleId}`
      );
      return response.data.map(
        (debt: any) =>
          new Debt(debt.amount, debt.type_debt_id, debt.vehicle_id, debt.id)
      );
    } catch (error) {
      console.error("Error getting debts from API:", error);
      return []; // Retorna array vacío si no hay deudas o hay error
    }
  }

  async getByVehicleIds(vehicleIds: number[]): Promise<Debt[]> {
    if (vehicleIds.length === 0) {
      return [];
    }

    // Para la implementación HTTP, podemos hacer llamadas en paralelo
    const promises = vehicleIds.map((id) => this.getByVehicleId(id));
    const results = await Promise.all(promises);

    // Aplanar el array de arrays
    return results.flat();
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