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

    try {
      // Batch queries: obtener todos los documentos y deudas de una vez
      const [allDocuments, allDebts] = await Promise.all([
        this.documentRepository.getByVehicleIds(vehicleIds),
        this.debtRepository.getByVehicleIds(vehicleIds)
      ]);

      // Crear mapas para acceso rápido por vehicleId
      const documentsMap = new Map<number, any[]>();
      const debtsMap = new Map<number, any[]>();

      // Agrupar documentos por vehicleId
      allDocuments.forEach(doc => {
        if (doc.idVehicle) {
          if (!documentsMap.has(doc.idVehicle)) {
            documentsMap.set(doc.idVehicle, []);
          }
          documentsMap.get(doc.idVehicle)!.push(doc);
        }
      });

      // Agrupar deudas por vehicleId
      allDebts.forEach(debt => {
        if (debt.VehicleId) {
          if (!debtsMap.has(debt.VehicleId)) {
            debtsMap.set(debt.VehicleId, []);
          }
          debtsMap.get(debt.VehicleId)!.push(debt);
        }
      });

      // Asignar documentos y deudas a cada vehículo
      data.forEach(vehicle => {
        if (vehicle.id) {
          vehicle.documents = documentsMap.get(vehicle.id) || [];
          vehicle.debts = debtsMap.get(vehicle.id) || [];
        }
      });

    } catch (error) {
      console.warn('Error loading documents/debts for vehicles:', error);
      // En caso de error, asignar arrays vacíos a todos los vehículos
      data.forEach(vehicle => {
        vehicle.documents = [];
        vehicle.debts = [];
      });
    }

    return {
      data: data,
      pagination: pagination,
    };
  }
}
