export class DocumentMapper {
  static toDatabase(data: any): any {
    return {
      expiration_date: data.expiration_date ? new Date(data.expiration_date) : null,
      document_type_id: data.document_type_id
    };
  }
}