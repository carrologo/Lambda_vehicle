export interface IDownloadImagesFromFolder {
/**
   * Descarga todas las imágenes de una carpeta de Google Drive y las retorna en binario.
   * @param folderUrl - URL pública de la carpeta en Google Drive.
   * @returns Array de objetos con nombre y buffer de cada imagen.
   */
  downloadImagesFromFolder(folderUrl: string): Promise<{ name: string; buffer: Buffer }[]>;
  }