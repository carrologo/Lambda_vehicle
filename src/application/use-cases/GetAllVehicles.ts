import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";

export class GetAllVehicles {
  constructor(private vehicleRepository: VehicleRepository) {}

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
    return {
      data: data,
      pagination: pagination,
    };
  }
}
