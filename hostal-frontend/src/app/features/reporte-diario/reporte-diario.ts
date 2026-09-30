import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { HistorialService } from '../../core/services/historial.service';
import { CorteCajaService } from '../../core/services/corte-caja.service';
import { AcuseRecepcionService } from '../../core/services/acuse-recepcion.service';
import { Historial, TipoEvento } from '../../core/models/historial.model';
import { Denominacion } from '../../core/models/corte-caja.model';
import { TipoDocumento } from '../../core/models/acuse-recepcion.model';

function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Denominaciones vigentes de pesos mexicanos. Es una lista fija en
// código (no un catálogo editable como canal de venta/concepto extra)
// porque cambia por decisión de Banxico, no por el hostal.
const BILLETES = [1000, 500, 200, 100, 50, 20];
const MONEDAS = [20, 10, 5, 2, 1, 0.5];

function denominacionesVacias(): Denominacion[] {
  return [...BILLETES, ...MONEDAS].map((valor) => ({ valor, cantidad: 0 }));
}

// Antes era "reporte por mes con una fila por día"; ahora es un
// reporte por RANGO de fechas (un solo día es un rango donde
// desde === hasta), con el detalle línea por línea del historial
// (para el corte de caja) en vez de un resumen agregado por día.
@Component({
  selector: 'app-reporte-diario',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './reporte-diario.html',
})
export class ReporteDiario implements OnInit {
  historialService = inject(HistorialService);
  corteCajaService = inject(CorteCajaService);
  acuseRecepcionService = inject(AcuseRecepcionService);

  desde = signal(hoyIso());
  hasta = signal(hoyIso());

  // Conteo físico por denominación — reemplaza el viejo campo libre
  // "cantidad entregada": el total contado ahora siempre sale de sumar
  // billetes/monedas reales, no de un número escrito a mano que podía
  // no corresponder a nada.
  billetes = BILLETES;
  monedas = MONEDAS;
  denominaciones = signal<Denominacion[]>(denominacionesVacias());
  totalContado = computed(() => this.denominaciones().reduce((s, d) => s + d.valor * d.cantidad, 0));

  // Lo que reportó la terminal bancaria — opcional, para conciliar
  // tarjeta igual que el efectivo.
  reporteTerminal = signal<number | null>(null);

  // Diferencia contra lo que el sistema calculó para este mismo rango
  // — se recalcula en vivo mientras se cuenta, antes incluso de
  // guardar, para que quien cuenta vea de inmediato si cuadra.
  diferenciaEfectivo = computed(() => {
    const r = this.historialService.reporteDiario();
    return r ? this.totalContado() - r.resumen.efectivo : null;
  });

  diferenciaTarjeta = computed(() => {
    const r = this.historialService.reporteDiario();
    const terminal = this.reporteTerminal();
    return r && terminal !== null ? terminal - r.resumen.tarjeta : null;
  });

  // Nombres de quien entrega (cajero) y quien recibe dentro del hostal
  // — texto simple, no firma dibujada.
  entregadoA = signal('');
  entregadoPor = signal('');
  comentarios = signal('');

  guardandoCorte = signal(false);
  errorCorte = signal('');

  // --- Acuse de recepción: el dueño recibe solo la documentación
  // (PDF/Excel/anexos), no el efectivo — es un comprobante aparte del
  // corte de caja (ver entregadoPor/entregadoA arriba, que es el
  // control interno del dinero). ---

  documentosDisponibles: TipoDocumento[] = ['PDF', 'EXCEL', 'ANEXOS'];
  documentosEntregados = signal<TipoDocumento[]>([]);
  fechaRecepcion = signal(hoyIso());
  firmaRecibio = signal('');
  comentariosAcuse = signal('');
  guardandoAcuse = signal(false);
  errorAcuse = signal('');

  ngOnInit() {
    this.consultar();
  }

  consultar() {
    this.historialService.cargarReporteDiario(this.desde(), this.hasta());
    this.corteCajaService.cargarCortes(this.desde(), this.hasta());
    this.acuseRecepcionService.cargarAcuses(this.desde(), this.hasta());
  }

  actualizarCantidadDenominacion(valor: number, cantidad: number) {
    this.denominaciones.set(this.denominaciones().map((d) => (d.valor === valor ? { ...d, cantidad } : d)));
  }

  cantidadDe(valor: number): number {
    return this.denominaciones().find((d) => d.valor === valor)?.cantidad ?? 0;
  }

  subtotalDe(valor: number): number {
    return valor * this.cantidadDe(valor);
  }

  guardarCorte() {
    if (!this.entregadoPor() || !this.entregadoA()) {
      this.errorCorte.set('Escribe quién entrega y quién recibe.');
      return;
    }
    this.errorCorte.set('');
    this.guardandoCorte.set(true);
    this.corteCajaService
      .crearCorte({
        desde: this.desde(),
        hasta: this.hasta(),
        denominaciones: this.denominaciones(),
        reporteTerminal: this.reporteTerminal() ?? undefined,
        entregadoPor: this.entregadoPor(),
        entregadoA: this.entregadoA(),
        comentarios: this.comentarios() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardandoCorte.set(false);
          // Se limpia el conteo (ya quedó guardado) pero se conservan
          // los nombres — lo normal es que sean las mismas personas la
          // próxima vez.
          this.denominaciones.set(denominacionesVacias());
          this.reporteTerminal.set(null);
          this.comentarios.set('');
          this.corteCajaService.cargarCortes(this.desde(), this.hasta());
        },
        error: (err) => {
          this.guardandoCorte.set(false);
          this.errorCorte.set(err.error?.message ?? 'No se pudo guardar el corte de caja');
        },
      });
  }

  alternarDocumento(doc: TipoDocumento) {
    const actuales = this.documentosEntregados();
    this.documentosEntregados.set(
      actuales.includes(doc) ? actuales.filter((d) => d !== doc) : [...actuales, doc],
    );
  }

  guardarAcuse() {
    if (this.documentosEntregados().length === 0) {
      this.errorAcuse.set('Marca al menos un documento entregado.');
      return;
    }
    if (!this.firmaRecibio()) {
      this.errorAcuse.set('Escribe el nombre de quien recibe.');
      return;
    }
    this.errorAcuse.set('');
    this.guardandoAcuse.set(true);
    this.acuseRecepcionService
      .crearAcuse({
        desde: this.desde(),
        hasta: this.hasta(),
        documentosEntregados: this.documentosEntregados(),
        fechaRecepcion: this.fechaRecepcion(),
        firmaRecibio: this.firmaRecibio(),
        comentarios: this.comentariosAcuse() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardandoAcuse.set(false);
          this.documentosEntregados.set([]);
          this.comentariosAcuse.set('');
          this.acuseRecepcionService.cargarAcuses(this.desde(), this.hasta());
        },
        error: (err) => {
          this.guardandoAcuse.set(false);
          this.errorAcuse.set(err.error?.message ?? 'No se pudo guardar el acuse de recepción');
        },
      });
  }

  rangoTexto = computed(() => {
    const d = this.desde();
    const h = this.hasta();
    return d === h
      ? this.formatearFecha(d)
      : `Del ${this.formatearFecha(d)} al ${this.formatearFecha(h)}`;
  });

  private formatearFecha(iso: string): string {
    const [anio, mes, dia] = iso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  etiquetaTipo(tipo: TipoEvento): string {
    switch (tipo) {
      case 'CHECK_IN':
        return 'Check-in';
      case 'RENOVACION':
        return 'Renovación';
      case 'COBRO_EXTRA':
        return 'Cobro extra';
      case 'CHECKOUT':
        return 'Checkout';
    }
  }

  // Number(...) porque el backend manda los decimales como string. Un
  // checkout sin ningún cargo (el caso normal) queda en $0 — esas
  // líneas se ocultan solo en la versión impresa/PDF (ver
  // .oculto-en-impresion), no en la vista de pantalla.
  montoCobradoEn(f: Historial): number {
    return Number(f.totalCobrado) || 0;
  }

  // Mismo desglose que en la vista de "Historial de ingresos": cuando
  // una fila se pagó con varios métodos (ej. mitad efectivo mitad
  // tarjeta), los muestra todos en vez de solo el primero. `pagos`
  // viene vacío en datos viejos, de antes de que existiera Ingreso —
  // ahí cae de regreso a `metodoPago`.
  // Solo el método (EFECTIVO/TARJETA), sin el monto de cada línea — el
  // total ya se ve en la columna "Total", repetirlo aquí era
  // redundante. Si se pagó con varios métodos, se listan todos, cada
  // uno sin su monto.
  desglosePagos(f: Historial): string[] {
    if (f.pagos && f.pagos.length > 0) {
      return [...new Set(f.pagos.map((p) => p.metodoPago))];
    }
    return [f.metodoPago];
  }

  // Para el Excel sí interesa el monto por método (permite sumar por
  // columna en la hoja de cálculo) — a diferencia de la tabla
  // impresa/pantalla, aquí no es redundante con nada.
  private desglosePagosConMonto(f: Historial): string[] {
    if (f.pagos && f.pagos.length > 0) {
      return f.pagos.map((p) => `${p.metodoPago}: $${p.cantidad}`);
    }
    return [f.metodoPago];
  }

  // Misma lógica que historial.ts: arma texto legible a partir de las
  // líneas de Ingreso que NO son el cobro normal de hospedaje (cobros
  // extra, multa), usando el concepto del catálogo si se usó, o la
  // nota libre si no.
  comentarioExtra(f: Historial): string[] {
    if (!f.pagos) return [];
    return f.pagos
      .filter((p) => p.concepto !== 'HOSPEDAJE')
      .map((p) => {
        const etiqueta = p.conceptoExtraNombre ?? (p.concepto === 'MULTA' ? 'Multa' : 'Cobro extra');
        const unidades = p.unidades ? ` x${p.unidades}` : '';
        const nota = p.nota ? `: ${p.nota}` : '';
        return `${etiqueta}${unidades}${nota} ($${p.cantidad})`;
      });
  }

  claseTipo(tipo: TipoEvento): string {
    switch (tipo) {
      case 'CHECK_IN':
        return 'bg-sky-100 text-sky-700';
      case 'RENOVACION':
        return 'bg-emerald-100 text-emerald-700';
      case 'COBRO_EXTRA':
        return 'bg-amber-100 text-amber-700';
      case 'CHECKOUT':
        return 'bg-slate-100 text-slate-600';
    }
  }

  // "Exportar a PDF" = imprimir solo esta sección (ver .reporte-diario-print
  // en styles.css) y dejar que el usuario elija "Guardar como PDF" en el
  // diálogo de impresión del navegador — sin depender de ninguna librería.
  imprimir() {
    const tituloOriginal = document.title;
    document.title = `Corte de caja ${this.desde()} a ${this.hasta()}`;
    window.print();
    document.title = tituloOriginal;
  }

  // "Exportar a Excel" = las mismas filas/columnas que ya se ven en
  // pantalla, sin el filtrado cosmético que sí aplica el PDF (ej.
  // checkouts en $0) — aquí es exportar el dato tal cual, no un
  // documento para firmar. Todo client-side con SheetJS, sin backend.
  exportarExcel() {
    const r = this.historialService.reporteDiario();
    if (!r) return;

    const filas = r.filas.map((f) => ({
      'N° reserva': f.registroOriginalId,
      Evento: this.etiquetaTipo(f.tipo),
      Cliente: f.nombreCliente,
      Habitación: `P${f.piso} - ${f.habitacionNumero}`,
      Camas: f.camas,
      Fecha: new Date(f.fechaEvento).toLocaleString('es-MX'),
      'Check-in': new Date(f.checkIn).toLocaleString('es-MX'),
      'Check-out': f.checkOut ? new Date(f.checkOut).toLocaleString('es-MX') : '',
      Total: Number(f.totalCobrado),
      'Costo por cama': Number(f.costoPorCama),
      'Otro cobro': Number(f.otroCobro),
      Noches: f.noches,
      'Documento de identidad': f.documentoIdentidad,
      'Método de pago': this.desglosePagosConMonto(f).join(' | '),
      Atendió: f.atendio,
      'Canal de venta': f.canalVentaNombre ?? '',
      Comentario: this.comentarioExtra(f).join(' | '),
    }));

    const resumen = [
      { Concepto: 'Ingresos totales', Monto: r.resumen.totalIngresos },
      { Concepto: 'Efectivo', Monto: r.resumen.efectivo },
      { Concepto: 'Tarjeta', Monto: r.resumen.tarjeta },
      { Concepto: 'N° huéspedes', Monto: r.resumen.numeroHuespedes },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Movimientos');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), 'Resumen');
    XLSX.writeFile(libro, `corte-de-caja_${this.desde()}_a_${this.hasta()}.xlsx`);
  }
}
