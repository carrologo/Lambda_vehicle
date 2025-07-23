import { google } from "googleapis";
import { getGoogleSecrets } from "./helperGoogleSecrets";

export interface DeletedFolder {
  id: string;
  name: string;
  deleted: boolean;
  error?: string;
}

export interface DeleteFoldersResult {
  totalFolders: number;
  deletedFolders: number;
  failedFolders: number;
  folders: DeletedFolder[];
}

export class DeleteFoldersRepository {
  private drive: any;
  private secrets: Record<string, string> | null = null;

  private async init() {
    if (!this.secrets) {
      this.secrets = await getGoogleSecrets();
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: this.secrets.GOOGLE_TYPE,
          project_id: this.secrets.GOOGLE_PROJECT_ID,
          private_key_id: this.secrets.GOOGLE_PRIVATE_KEY_ID,
          private_key: this.secrets.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          client_email: this.secrets.GOOGLE_CLIENT_EMAIL,
          client_id: this.secrets.GOOGLE_CLIENT_ID,
          universe_domain: this.secrets.GOOGLE_UNIVERSE_DOMAIN,
        },
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      this.drive = google.drive({ version: "v3", auth });
    }
  }

  /**
   * Elimina todas las carpetas creadas por la aplicación en Google Drive
   * @param dryRun - Si es true, solo lista las carpetas sin eliminarlas
   * @returns Resultado de la operación de eliminación
   */
  async deleteAllFolders(dryRun: boolean = false): Promise<DeleteFoldersResult> {
    await this.init();
    
    try {
      // Buscar todas las carpetas (excluyendo carpetas del sistema)
      const folders = await this.getAllFolders();
      
      if (folders.length === 0) {
        return {
          totalFolders: 0,
          deletedFolders: 0,
          failedFolders: 0,
          folders: []
        };
      }

      const results: DeletedFolder[] = [];
      let deletedCount = 0;
      let failedCount = 0;

      for (const folder of folders) {
        try {
          if (!dryRun) {
            // Eliminar la carpeta
            await this.drive.files.delete({
              fileId: folder.id
            });
            
            results.push({
              id: folder.id,
              name: folder.name,
              deleted: true
            });
            deletedCount++;
          } else {
            // Solo listar (dry run)
            results.push({
              id: folder.id,
              name: folder.name,
              deleted: false
            });
          }
        } catch (error) {
          results.push({
            id: folder.id,
            name: folder.name,
            deleted: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failedCount++;
        }
      }

      return {
        totalFolders: folders.length,
        deletedFolders: deletedCount,
        failedFolders: failedCount,
        folders: results
      };
    } catch (error) {
      console.error("Error deleting folders:", error);
      throw new Error("Error deleting folders from Google Drive");
    }
  }

  /**
   * Obtiene todas las carpetas de Google Drive (excluyendo carpetas del sistema)
   */
  private async getAllFolders(): Promise<{ id: string; name: string }[]> {
    await this.init();
    
    try {
      const folders: { id: string; name: string }[] = [];
      let pageToken: string | undefined;
      
      do {
        const response = await this.drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false and parents in 'root'",
          fields: "nextPageToken, files(id, name, parents)",
          pageSize: 100,
          pageToken: pageToken
        });

        if (response.data.files) {
          for (const file of response.data.files) {
            // Filtrar carpetas del sistema de Google (opcional)
            if (!this.isSystemFolder(file.name)) {
              folders.push({
                id: file.id!,
                name: file.name!
              });
            }
          }
        }
        
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      return folders;
    } catch (error) {
      console.error("Error listing folders:", error);
      throw new Error("Error listing folders from Google Drive");
    }
  }

  /**
   * Determina si una carpeta es una carpeta del sistema que no debe eliminarse
   */
  private isSystemFolder(folderName: string): boolean {
    const systemFolders = [
      'My Drive',
      'Shared drives',
      'Computers',
      'Shared with me'
    ];
    
    return systemFolders.includes(folderName);
  }

  /**
   * Elimina carpetas específicas por nombre o patrón
   * @param folderPattern - Patrón o nombre exacto de las carpetas a eliminar
   * @param exactMatch - Si es true, busca coincidencia exacta; si es false, busca patrones
   * @param dryRun - Si es true, solo lista las carpetas sin eliminarlas
   */
  async deleteFoldersByPattern(
    folderPattern: string, 
    exactMatch: boolean = false,
    dryRun: boolean = false
  ): Promise<DeleteFoldersResult> {
    await this.init();
    
    try {
      const query = exactMatch 
        ? `name='${folderPattern}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name contains '${folderPattern}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: "files(id, name)",
        pageSize: 100
      });

      const folders = response.data.files || [];
      const results: DeletedFolder[] = [];
      let deletedCount = 0;
      let failedCount = 0;

      for (const folder of folders) {
        try {
          if (!dryRun) {
            await this.drive.files.delete({
              fileId: folder.id
            });
            
            results.push({
              id: folder.id!,
              name: folder.name!,
              deleted: true
            });
            deletedCount++;
          } else {
            results.push({
              id: folder.id!,
              name: folder.name!,
              deleted: false
            });
          }
        } catch (error) {
          results.push({
            id: folder.id!,
            name: folder.name!,
            deleted: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failedCount++;
        }
      }

      return {
        totalFolders: folders.length,
        deletedFolders: deletedCount,
        failedFolders: failedCount,
        folders: results
      };
    } catch (error) {
      console.error("Error deleting folders by pattern:", error);
      throw new Error("Error deleting folders by pattern from Google Drive");
    }
  }
}
