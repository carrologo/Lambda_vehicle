export interface IDownloadImagesFromFolder {
  /**
   * Descarga una imagen de Google Drive a partir de su URL y la retorna en binario.
   * @param fileUrl - URL pública del archivo en Google Drive.
   * @returns Objeto con nombre y buffer de la imagen.
   */
  downloadImageFromUrl(fileUrl: string): Promise<{ name: string; buffer: Buffer;  mimeType?: string }>;
}