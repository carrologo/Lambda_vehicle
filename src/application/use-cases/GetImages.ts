import { IDownloadImagesFromFolder } from "../../domain/repositories/IDownloadImagesFromFolder";

export class GetImages {
  constructor(private downloadImagesFromFolder: IDownloadImagesFromFolder) {}

  async execute(folderUrl: string): Promise<{ name: string; buffer: Buffer;  mimeType?: string }> {
    return this.downloadImagesFromFolder.downloadImageFromUrl(folderUrl);
  }
}