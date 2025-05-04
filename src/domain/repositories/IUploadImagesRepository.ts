export interface IUploadImagesRepository {
    /**
     * Sube múltiples archivos a Google Drive y devuelve las URLs públicas.
     * @param images - Array de objetos con base64, nombre y tipo MIME de cada imagen.
     * @param folderName - El nombre de la carpeta donde se guardarán las imágenes.
     * @returns Array de URLs públicas de los archivos subidos.
     */
    uploadImages(images: { base64: string; name: string; }[], folderName: string): Promise<string>;
  }