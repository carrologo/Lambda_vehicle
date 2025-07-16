export class DocumentMapper {
  static toDatabase(data: any): any {
    return {
      expiration_date: data.expirationDate ? new Date(data.expirationDate) : null,
      document_type_id: data.documentTypeId,
      category: data.category
    };
  }
}