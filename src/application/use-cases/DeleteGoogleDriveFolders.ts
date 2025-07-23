import { DeleteFoldersRepository, DeleteFoldersResult } from "../../infrastructure/google/DeleteFoldersRepository";

export interface DeleteFoldersOptions {
  dryRun?: boolean;
  pattern?: string;
  exactMatch?: boolean;
}

export class DeleteGoogleDriveFolders {
  constructor(private deleteFoldersRepository: DeleteFoldersRepository) {}

  /**
   * Elimina todas las carpetas de Google Drive o carpetas que coincidan con un patrón
   * @param options - Opciones para la eliminación
   * @returns Resultado de la operación
   */
  async execute(options: DeleteFoldersOptions = {}): Promise<DeleteFoldersResult> {
    const { dryRun = false, pattern, exactMatch = false } = options;

    try {
      if (pattern) {
        // Eliminar carpetas por patrón
        return await this.deleteFoldersRepository.deleteFoldersByPattern(
          pattern,
          exactMatch,
          dryRun
        );
      } else {
        // Eliminar todas las carpetas
        return await this.deleteFoldersRepository.deleteAllFolders(dryRun);
      }
    } catch (error) {
      console.error("Error in DeleteGoogleDriveFolders use case:", error);
      throw new Error(
        `Failed to delete Google Drive folders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Lista todas las carpetas sin eliminarlas (dry run)
   * @param pattern - Patrón opcional para filtrar carpetas
   * @param exactMatch - Si debe ser coincidencia exacta
   * @returns Lista de carpetas que serían eliminadas
   */
  async listFolders(pattern?: string, exactMatch: boolean = false): Promise<DeleteFoldersResult> {
    return await this.execute({
      dryRun: true,
      pattern,
      exactMatch
    });
  }
}
