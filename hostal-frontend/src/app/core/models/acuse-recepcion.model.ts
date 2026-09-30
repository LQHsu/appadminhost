export type TipoDocumento = 'PDF' | 'EXCEL' | 'ANEXOS';

export interface AcuseRecepcion {
  id: number;
  desde: string;
  hasta: string;
  documentosEntregados: TipoDocumento[];
  fechaRecepcion: string;
  firmaRecibio: string;
  comentarios: string | null;
  creadoEn: string;
}

export interface CreateAcuseRecepcionDto {
  desde: string;
  hasta: string;
  documentosEntregados: TipoDocumento[];
  fechaRecepcion: string;
  firmaRecibio: string;
  comentarios?: string;
}
