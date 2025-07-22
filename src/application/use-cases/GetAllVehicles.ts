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
    const { data, pagination } = await this.vehicleRepository.getAll(queryParams);

    if (data.length === 0) {
      return { data, pagination };
    }

    // Obtener todos los IDs de vehículos
    const vehicleIds = data
      .filter(vehicle => vehicle.id)
      .map(vehicle => vehicle.id!);

    if (vehicleIds.length === 0) {
      return { data, pagination };
    }

    return {
      data: data,
      pagination: pagination,
    };
  }
}
