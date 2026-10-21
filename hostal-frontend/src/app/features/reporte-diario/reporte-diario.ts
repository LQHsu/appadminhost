import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { HistorialService } from '../../core/services/historial.service';
import { CorteCajaService } from '../../core/services/corte-caja.service';
import { AcuseRecepcionService } from '../../core/services/acuse-recepcion.service';
import { Historial, TipoEvento } from '../../core/models/historial.model';
import { MetodoPago } from '../../core/models/registro.model';
import { Denominacion, TipoDenominacion } from '../../core/models/corte-caja.model';
import { TipoDocumento } from '../../core/models/acuse-recepcion.model';

function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Mismo criterio que common/zona-horaria.ts del backend: el hostal usa
// hora de Ciudad de México fija (UTC-6, sin horario de verano desde
// 2022), pero fechaEvento llega en UTC — hay que restar 6 horas antes
// de leer el día, o un movimiento cerca de la medianoche queda en el
// día del servidor, no en el del hostal.
function fechaYMDHostal(fecha: Date): string {
  const hostal = new Date(fecha.getTime() - 6 * 60 * 60 * 1000);
  const anio = hostal.getUTCFullYear();
  const mes = String(hostal.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(hostal.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Denominaciones vigentes de pesos mexicanos. Es una lista fija en
// código (no un catálogo editable como canal de venta/concepto extra)
// porque cambia por decisión de Banxico, no por el hostal.
const BILLETES = [1000, 500, 200, 100, 50, 20];
const MONEDAS = [20, 10, 5, 2, 1, 0.5];

function denominacionesVacias(): Denominacion[] {
  return [
    ...BILLETES.map((valor) => ({ tipo: 'BILLETE' as const, valor, cantidad: 0 })),
    ...MONEDAS.map((valor) => ({ tipo: 'MONEDA' as const, valor, cantidad: 0 })),
  ];
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

  // "Ingresos totales" = efectivo + lo que la tarjeta REALMENTE
  // depositó (neto), no el bruto cobrado al huésped — la comisión del
  // procesador nunca llega, así que contarla como ingreso infla el
  // total. Mientras nadie haya capturado el neto de ninguna línea
  // (tarjetaNeta === null), cae de regreso al bruto, para no mostrar
  // un total menor al real solo porque falta conciliar.
  ingresosTotalesReales = computed(() => {
    const r = this.historialService.reporteDiario();
    if (!r) return 0;
    return r.resumen.efectivo + (r.resumen.tarjetaNeta ?? r.resumen.tarjeta);
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

  // --- Filtros de la tabla de movimientos (mismo criterio que
  // "Historial de ingresos") — a diferencia de ahí, aquí ya se tienen
  // TODAS las filas del rango en memoria (reporteDiario no pagina), así
  // que el filtrado es en el navegador, sin pedirle nada al backend.
  // Solo afectan la tabla/PDF/Excel — los recuadros de resumen y la
  // conciliación del corte de caja siguen con el total REAL del rango,
  // filtrado o no, porque de eso depende que la conciliación de
  // efectivo tenga sentido.
  filtroMetodoPago = signal<MetodoPago | ''>('');
  filtroTipo = signal<TipoEvento | ''>('');
  clienteBusqueda = signal('');

  filasFiltradas = computed(() => {
    const r = this.historialService.reporteDiario();
    if (!r) return [];
    const metodo = this.filtroMetodoPago();
    const tipo = this.filtroTipo();
    const cliente = this.clienteBusqueda().trim().toLowerCase();

    return r.filas.filter((f) => {
      if (tipo && f.tipo !== tipo) return false;
      if (cliente && !f.nombreCliente.toLowerCase().includes(cliente)) return false;
      if (metodo) {
        // Igual que el filtro de método de pago del historial: se
        // busca en TODAS las líneas de pago de la fila, no solo en
        // `metodoPago` (que solo refleja la primera) — así un cobro
        // dividido mitad efectivo mitad tarjeta aparece en ambos
        // filtros.
        const metodos = f.pagos && f.pagos.length > 0 ? f.pagos.map((p) => p.metodoPago) : [f.metodoPago];
        if (!metodos.includes(metodo)) return false;
      }
      return true;
    });
  });

  // Total de lo que se ve actualmente en la tabla (ya filtrado) — el
  // pie de la tabla muestra este número, no el total real del rango
  // (ese sigue en los recuadros de resumen de arriba).
  totalFiltrado = computed(() => this.filasFiltradas().reduce((s, f) => s + Number(f.totalCobrado), 0));

  // tipo + valor identifica la línea — el $20 existe como billete y
  // como moneda, y filtrar solo por valor actualizaba/leía ambas como
  // si fueran la misma.
  actualizarCantidadDenominacion(tipo: TipoDenominacion, valor: number, cantidad: number) {
    this.denominaciones.set(
      this.denominaciones().map((d) => (d.tipo === tipo && d.valor === valor ? { ...d, cantidad } : d)),
    );
  }

  cantidadDe(tipo: TipoDenominacion, valor: number): number {
    return this.denominaciones().find((d) => d.tipo === tipo && d.valor === valor)?.cantidad ?? 0;
  }

  subtotalDe(tipo: TipoDenominacion, valor: number): number {
    return valor * this.cantidadDe(tipo, valor);
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

  // Misma lógica que historial.ts: suma el monto neto (ya con la
  // comisión descontada) de las líneas TARJETA de esta fila — null si
  // ninguna lo tiene capturado todavía.
  montoNetoTarjeta(f: Historial): number | null {
    if (!f.pagos) return null;
    const netos = f.pagos.filter((p) => p.metodoPago === 'TARJETA' && p.montoNeto !== null);
    if (netos.length === 0) return null;
    return netos.reduce((s, p) => s + (p.montoNeto ?? 0), 0);
  }

  // Misma lógica que historial.ts: arma texto legible a partir de las
  // líneas que tengan algo que mostrar — cobros extra/multa (con
  // concepto/unidades/nota) o una línea de hospedaje con nota (al
  // editarla se puede agregar una nota aunque sea un check-in/
  // renovación; antes se guardaba pero esta columna la descartaba).
  comentarioExtra(f: Historial): string[] {
    if (!f.pagos) return [];
    return f.pagos
      .filter((p) => p.concepto !== 'HOSPEDAJE' || p.nota)
      .map((p) => {
        if (p.concepto === 'HOSPEDAJE') return p.nota!;
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

  // Arma una fila consolidada a partir de los eventos de UNA reserva
  // dentro de UN mismo día (ver exportarExcel) — el mismo cálculo que
  // antes se hacía sobre toda la reserva, ahora acotado a ese día.
  private filaDeReserva(eventos: Historial[]) {
    // El id más chico es siempre el evento más viejo DE ESE DÍA — de
    // ahí salen los datos que no cambian entre eventos (cliente,
    // habitación, documento, canal, costo por cama).
    const base = [...eventos].sort((a, b) => a.id - b.id)[0];
    const checkoutEvento = eventos.find((f) => f.tipo === 'CHECKOUT');

    // Un checkout que no cobró nada (el caso normal) no debe aparecer
    // como su propia fila ni sumar al total — pero sí se recupera su
    // fecha de checkout más abajo, aunque no haya cobrado.
    const eventosConCobro = eventos.filter((f) => !(f.tipo === 'CHECKOUT' && Number(f.totalCobrado) === 0));

    const total = eventosConCobro.reduce((s, f) => s + Number(f.totalCobrado), 0);
    const otroCobro = eventosConCobro.reduce((s, f) => s + Number(f.otroCobro), 0);

    // Noches: solo CHECK_IN/RENOVACION representan noches NUEVAS: en
    // COBRO_EXTRA/CHECKOUT ese campo es una foto del acumulado de la
    // estadía en ese momento, no un incremento — sumarlo ahí
    // duplicaría las noches ya contadas en el check-in/renovaciones.
    const noches = eventos
      .filter((f) => f.tipo === 'CHECK_IN' || f.tipo === 'RENOVACION')
      .reduce((s, f) => s + f.noches, 0);

    // Monto por método sumado entre los eventos de esta reserva EN
    // ESTE día — así "EFECTIVO: $200 | TARJETA: $50" refleja lo que
    // entró ese día por esa reserva, no toda su estadía completa.
    const montosPorMetodo = new Map<string, number>();
    // Suma el monto neto (ya con la comisión descontada) de las líneas
    // TARJETA de ese día — null mientras nadie lo haya capturado al
    // editar, para no confundirlo con "neto = $0".
    let netoTarjeta: number | null = null;
    for (const f of eventosConCobro) {
      const pagos =
        f.pagos && f.pagos.length > 0
          ? f.pagos
          : [{ metodoPago: f.metodoPago, cantidad: Number(f.totalCobrado), montoNeto: null }];
      for (const p of pagos) {
        montosPorMetodo.set(p.metodoPago, (montosPorMetodo.get(p.metodoPago) ?? 0) + Number(p.cantidad));
        if (p.metodoPago === 'TARJETA' && p.montoNeto !== null && p.montoNeto !== undefined) {
          netoTarjeta = (netoTarjeta ?? 0) + Number(p.montoNeto);
        }
      }
    }
    const metodoPago = Array.from(montosPorMetodo.entries())
      .map(([metodo, monto]) => `${metodo}: $${monto}`)
      .join(' | ');

    const atendieron = [...new Set(eventos.map((f) => f.atendio))];
    // Se revisan TODOS los eventos (incluido un checkout en $0): si
    // alguien le agregó una nota al editarlo, no se pierde.
    const comentario = eventos.flatMap((f) => this.comentarioExtra(f));

    return {
      'N° reserva': base.registroOriginalId,
      Cliente: base.nombreCliente,
      Habitación: `P${base.piso} - ${base.habitacionNumero}`,
      Camas: base.camas,
      'Check-in': new Date(base.checkIn).toLocaleString('es-MX'),
      'Check-out': checkoutEvento?.checkOut ? new Date(checkoutEvento.checkOut).toLocaleString('es-MX') : '',
      Total: total,
      'Costo por cama': Number(base.costoPorCama),
      'Otro cobro': otroCobro,
      Noches: noches,
      'Documento de identidad': base.documentoIdentidad,
      'Método de pago': metodoPago,
      'Neto tarjeta': netoTarjeta !== null ? netoTarjeta : '',
      Atendió: atendieron.join(', '),
      'Canal de venta': base.canalVentaNombre ?? '',
      Comentario: comentario.join(' | '),
    };
  }

  // "Exportar a Excel" = las mismas filas/columnas que ya se ven en
  // pantalla, sin el filtrado cosmético que sí aplica el PDF (ej.
  // checkouts en $0) — aquí es exportar el dato tal cual, no un
  // documento para firmar. Todo client-side con SheetJS, sin backend.
  exportarExcel() {
    const r = this.historialService.reporteDiario();
    if (!r) return;

    // Las mismas filas que se ven en la tabla (ya con los filtros
    // aplicados) — el "Resumen" sigue saliendo de r.resumen, sin
    // filtrar, más abajo.
    const filasBase = this.filasFiltradas();

    // Un checkout sin cobro (el caso normal) casi siempre cae en un día
    // distinto al de su check-in/última renovación — si se le diera su
    // propia fila, se vería como una reserva nueva con $0, duplicando
    // visualmente al mismo huésped. En vez de eso, si esa reserva ya
    // tiene otro evento en el reporte, el checkout no genera fila
    // propia: su fecha de salida se concatena más abajo a la última
    // fila ya generada de esa reserva. Si el checkout es lo ÚNICO que
    // aparece de esa reserva en el rango (su check-in quedó fuera), se
    // omite: no aporta dinero, y su fila mostraría una fecha de entrada
    // fuera del rango consultado. La salida en sí sigue en el historial.
    const reservasConOtroEvento = new Set<number>();
    for (const f of filasBase) {
      if (!(f.tipo === 'CHECKOUT' && Number(f.totalCobrado) === 0)) {
        reservasConOtroEvento.add(f.registroOriginalId);
      }
    }
    const checkoutsSinCobroConcatenar = new Map<number, Historial>();

    // Primero se separa por DÍA (hora del hostal, no la fecha del
    // servidor) y dentro de cada día se consolida por reserva — así un
    // rango de varios días no mezcla en una sola fila cosas que
    // pasaron en días distintos de la misma estadía (ej. el check-in
    // del lunes y una renovación del miércoles quedan cada una bajo su
    // propio día), y dentro de un mismo día ya no hace falta la
    // columna "Evento" porque cada reserva es una sola fila.
    const porDia = new Map<string, Historial[]>();
    for (const f of filasBase) {
      if (f.tipo === 'CHECKOUT' && Number(f.totalCobrado) === 0) {
        if (reservasConOtroEvento.has(f.registroOriginalId)) {
          checkoutsSinCobroConcatenar.set(f.registroOriginalId, f);
        }
        continue;
      }
      const dia = fechaYMDHostal(new Date(f.fechaEvento));
      const lista = porDia.get(dia) ?? [];
      lista.push(f);
      porDia.set(dia, lista);
    }

    const filas: Record<string, string | number>[] = [];
    const ultimaFilaPorReserva = new Map<number, Record<string, string | number>>();
    for (const [dia, eventosDelDia] of porDia) {
      const [anio, mes, diaNum] = dia.split('-').map(Number);
      const etiquetaDia = new Date(anio, mes - 1, diaNum).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      // "Huéspedes" = check-ins nuevos ese día — mismo criterio que
      // numeroHuespedes() del backend (una renovación/cobro extra/
      // checkout no es un huésped nuevo, es la misma estadía siguiendo
      // su curso).
      const huespedesDelDia = eventosDelDia.filter((f) => f.tipo === 'CHECK_IN').length;
      const etiquetaHuespedes = `${huespedesDelDia} huésped${huespedesDelDia === 1 ? '' : 'es'}`;
      // Header separador: solo la primera columna tiene texto, el
      // resto queda en blanco — SheetJS (la versión libre que usamos)
      // no soporta negritas/color de celda, así que esto es lo más
      // que se puede resaltar sin una librería con estilos.
      filas.push({ 'N° reserva': `── ${etiquetaDia} — ${etiquetaHuespedes} ──` });

      const porReserva = new Map<number, Historial[]>();
      for (const f of eventosDelDia) {
        const lista = porReserva.get(f.registroOriginalId) ?? [];
        lista.push(f);
        porReserva.set(f.registroOriginalId, lista);
      }
      for (const eventos of porReserva.values()) {
        const fila = this.filaDeReserva(eventos);
        filas.push(fila);
        ultimaFilaPorReserva.set(eventos[0].registroOriginalId, fila);
      }
    }

    // Ahora sí se concatena cada checkout sin cobro a la última fila de
    // su reserva (por orden cronológico, ya que r.filas viene ordenado
    // por fechaEvento ascendente).
    for (const [registroOriginalId, checkoutEvento] of checkoutsSinCobroConcatenar) {
      const fila = ultimaFilaPorReserva.get(registroOriginalId);
      if (fila && checkoutEvento.checkOut) {
        fila['Check-out'] = new Date(checkoutEvento.checkOut).toLocaleString('es-MX');
      }
    }

    const resumen = [
      { Concepto: 'Ingresos totales', Monto: r.resumen.totalIngresos },
      { Concepto: 'Efectivo', Monto: r.resumen.efectivo },
      { Concepto: 'Tarjeta', Monto: r.resumen.tarjeta },
      { Concepto: 'N° huéspedes', Monto: r.resumen.numeroHuespedes },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Reservaciones');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), 'Resumen');
    XLSX.writeFile(libro, `corte-de-caja_${this.desde()}_a_${this.hasta()}.xlsx`);
  }
}
