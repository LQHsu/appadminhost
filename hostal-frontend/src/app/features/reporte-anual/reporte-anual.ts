import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';

const NOMBRES_MES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Paleta validada (dataviz skill): azul slot-1 para Efectivo, naranja
// slot-2 para Tarjeta. Es un par que pasa el chequeo de daltonismo
// (Delta-E adyacente >= 8) y de contraste normal.
const COLOR_EFECTIVO = '#2a78d6';
const COLOR_TARJETA = '#eb6834';

@Component({
  selector: 'app-reporte-anual',
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './reporte-anual.html',
})
export class ReporteAnual implements OnInit {
  historialService = inject(HistorialService);

  colorEfectivo = COLOR_EFECTIVO;
  colorTarjeta = COLOR_TARJETA;
  nombresMes = NOMBRES_MES;

  anio = signal(new Date().getFullYear());

  // Índice de la barra bajo el cursor, para resaltarla + tooltip.
  hoverIndex = signal<number | null>(null);

  ngOnInit() {
    this.consultar();
  }

  consultar() {
    this.historialService.cargarReporteAnual(this.anio());
  }

  // --- Geometría del gráfico de barras (SVG a mano, sin librerías) ---

  private readonly chartHeight = 200;
  private readonly chartWidth = 760;
  private readonly groupGap = 8;

  maxValor = computed(() => {
    const meses = this.historialService.reporteAnual()?.meses ?? [];
    const max = Math.max(1, ...meses.flatMap((m) => [m.efectivo, m.tarjeta]));
    return max;
  });

  // Cada mes es un "grupo" de 2 barras (efectivo, tarjeta). Precalculamos
  // las coordenadas de cada rect para dibujarlas en el template sin
  // hacer matemática ahí.
  barras = computed(() => {
    const meses = this.historialService.reporteAnual()?.meses ?? [];
    const groupWidth = this.chartWidth / 12;
    const barWidth = (groupWidth - this.groupGap) / 2;
    const max = this.maxValor();

    return meses.map((m, i) => {
      const x = i * groupWidth;
      const alturaEfectivo = (m.efectivo / max) * this.chartHeight;
      const alturaTarjeta = (m.tarjeta / max) * this.chartHeight;
      return {
        mes: m.mes,
        label: this.nombresMes[i],
        efectivo: m.efectivo,
        tarjeta: m.tarjeta,
        xEfectivo: x,
        xTarjeta: x + barWidth + 2, // +2: gap de superficie entre barras
        yEfectivo: this.chartHeight - alturaEfectivo,
        yTarjeta: this.chartHeight - alturaTarjeta,
        alturaEfectivo,
        alturaTarjeta,
        barWidth,
        xLabel: x + groupWidth / 2,
      };
    });
  });

  chartViewBox = `0 0 ${this.chartWidth} ${this.chartHeight + 24}`;
  chartHeightPublic = this.chartHeight;

  // --- Geometría del gráfico de pie (2 rebanadas: efectivo / tarjeta) ---

  pieSlices = computed(() => {
    const total = this.historialService.reporteAnual()?.totalAnual;
    if (!total || total.totalIngresos === 0) return [];

    const radio = 80;
    const cx = 90;
    const cy = 90;
    const datos = [
      { label: 'Efectivo', valor: total.efectivo, color: this.colorEfectivo },
      { label: 'Tarjeta', valor: total.tarjeta, color: this.colorTarjeta },
    ];

    let anguloInicial = -90; // empieza arriba (12 en punto)
    return datos.map((d) => {
      const porcentaje = d.valor / total.totalIngresos;
      const anguloFinal = anguloInicial + porcentaje * 360;
      const path = this.arcoSvg(cx, cy, radio, anguloInicial, anguloFinal);
      const slice = { ...d, porcentaje, path };
      anguloInicial = anguloFinal;
      return slice;
    });
  });

  private arcoSvg(cx: number, cy: number, r: number, anguloInicio: number, anguloFin: number): string {
    // Convierte grados -> radianes y calcula el punto en el círculo.
    const punto = (angulo: number) => {
      const rad = (angulo * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const inicio = punto(anguloInicio);
    const fin = punto(anguloFin);
    const arcoGrande = anguloFin - anguloInicio > 180 ? 1 : 0;
    // Si es una sola rebanada de 100%, dibuja el círculo completo aparte
    // (un arco de 360° degenera a un punto en SVG).
    if (anguloFin - anguloInicio >= 359.9) {
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }
    return `M ${cx} ${cy} L ${inicio.x} ${inicio.y} A ${r} ${r} 0 ${arcoGrande} 1 ${fin.x} ${fin.y} Z`;
  }
}
