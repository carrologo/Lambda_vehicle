import axios from "axios";
import { Debt } from "../../domain/entities/Debt";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";
import { DebtMapper } from "../../application/mapper/DebtMapper";

export class DebtHttpRepository implements IDebtRepository {
  private apiUrl: string | null = null;

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
}
