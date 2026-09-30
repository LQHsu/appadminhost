import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { ConceptoExtra, CreateConceptoExtraDto, UpdateConceptoExtraDto } from '../models/concepto-extra.model';

@Injectable({ providedIn: 'root' })
export class ConceptoExtraService {
  private http = inject(HttpClient);

  conceptos = signal<ConceptoExtra[]>([]);

  cargarConceptos() {
    this.http.get<ConceptoExtra[]>(`${API_URL}/conceptos-extra`).subscribe((data) => this.conceptos.set(data));
  }

  crearConcepto(dto: CreateConceptoExtraDto) {
    return this.http.post<ConceptoExtra>(`${API_URL}/conceptos-extra`, dto);
  }

  actualizarConcepto(id: number, dto: UpdateConceptoExtraDto) {
    return this.http.patch<ConceptoExtra>(`${API_URL}/conceptos-extra/${id}`, dto);
  }
}
