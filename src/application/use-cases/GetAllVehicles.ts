import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";

export class GetAllVehicles {
  constructor(
    private vehicleRepository: VehicleRepository,
    private documentRepository: IDocumentRepository,
    private debtRepository: IDebtRepository
  ) {}

  async execute(queryParams: {
    findBy?: string;
    value?: any;
    orderBy?: string;
    isAsc: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Vehicle[];
    pagination: {
      page: number;
      total: number;
    };
  }> {
    const { data, pagination } = await this.vehicleRepository.getAll(
      queryParams
    );

    // Para cada vehículo, obtener sus documentos y deudas
    for (const vehicle of data) {
      if (vehicle.id) {
        try {
          vehicle.documents = await this.documentRepository.getByVehicleId(
            vehicle.id
          );
          vehicle.debts = await this.debtRepository.getByVehicleId(vehicle.id);
        } catch (error) {
          console.warn(
            `Error loading documents/debts for vehicle ${vehicle.id}:`,
            error
          );
          vehicle.documents = [];
          vehicle.debts = [];
        }
      }
    }

    return {
      data: data,
      pagination: pagination,
    };
  }
}
