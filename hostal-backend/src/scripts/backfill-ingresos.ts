import 'reflect-metadata';
import AppDataSource from '../data-source';
import { Historial, TipoEvento } from '../historial/entities/historial.entity';
import { Ingreso, ConceptoIngreso } from '../historial/entities/ingreso.entity';
import { Registro } from '../registros/entities/registro.entity';

// Fase 2 del plan de "varios métodos de pago por huésped": recorre
// TODO el Historial que ya existe y le crea su(s) fila(s) de Ingreso
// correspondiente(s) — es decir, reconstruye en el nuevo formato lo
// que ya se cobró en el formato viejo.
//
// Reglas de conversión (como los datos viejos no distinguen métodos
// mezclados, se asume que cada evento se pagó completo con el único
// método que ya tenía guardado):
//   CHECK_IN / RENOVACION -> 1 fila: HOSPEDAJE, cantidad=totalCobrado
//   CHECKOUT -> hasta 2 filas: COBRO_EXTRA si otroCobro>0,
//               MULTA si multa>0 (nada si ambos son 0, que es lo normal)
//
// Uso:
//   npx ts-node -r tsconfig-paths/register src/scripts/backfill-ingresos.ts
//     -> solo IMPRIME el preview, no escribe nada (modo por defecto)
//   npx ts-node -r tsconfig-paths/register src/scripts/backfill-ingresos.ts --aplicar
//     -> además de imprimir, inserta todo en una sola transacción

async function main() {
  const aplicar = process.argv.includes('--aplicar');

  const ds = await AppDataSource.initialize();

  const historialRepo = ds.getRepository(Historial);
  const registroRepo = ds.getRepository(Registro);
  const ingresoRepo = ds.getRepository(Ingreso);

  const yaExisten = await ingresoRepo.count();
  if (yaExisten > 0 && aplicar) {
    console.error(
      `⛔ La tabla ingreso ya tiene ${yaExisten} fila(s). Este script asume que está vacía ` +
        `(para no duplicar); si necesitas volver a correrlo, vacíala primero.`,
    );
    await ds.destroy();
    process.exit(1);
  }

  const filas = await historialRepo.find({ order: { id: 'ASC' } });
  console.log(`Historial: ${filas.length} fila(s) encontradas.\n`);

  type Pendiente = {
    historialId: number;
    registroOriginalId: number;
    concepto: ConceptoIngreso;
    metodoPago: string;
    cantidad: number;
    fecha: Date;
  };
  const pendientes: Pendiente[] = [];
  const registrosFaltantes = new Set<number>();

  for (const h of filas) {
    const existeRegistro = await registroRepo.exists({ where: { id: h.registroOriginalId } });
    if (!existeRegistro) {
      registrosFaltantes.add(h.registroOriginalId);
      continue; // se reporta al final, no se crea nada para esta fila
    }

    if (h.tipo === TipoEvento.CHECK_IN || h.tipo === TipoEvento.RENOVACION) {
      const cantidad = Number(h.totalCobrado);
      if (cantidad > 0) {
        pendientes.push({
          historialId: h.id,
          registroOriginalId: h.registroOriginalId,
          concepto: ConceptoIngreso.HOSPEDAJE,
          metodoPago: h.metodoPago,
          cantidad,
          fecha: h.fechaEvento,
        });
      }
    } else if (h.tipo === TipoEvento.CHECKOUT) {
      const otroCobro = Number(h.otroCobro);
      const multa = Number(h.multa);
      if (otroCobro > 0) {
        pendientes.push({
          historialId: h.id,
          registroOriginalId: h.registroOriginalId,
          concepto: ConceptoIngreso.COBRO_EXTRA,
          metodoPago: h.metodoPago,
          cantidad: otroCobro,
          fecha: h.fechaEvento,
        });
      }
      if (multa > 0) {
        pendientes.push({
          historialId: h.id,
          registroOriginalId: h.registroOriginalId,
          concepto: ConceptoIngreso.MULTA,
          metodoPago: h.metodoPago,
          cantidad: multa,
          fecha: h.fechaEvento,
        });
      }
    }
  }

  // --- Preview ---
  const porConcepto = pendientes.reduce<Record<string, { n: number; total: number }>>((acc, p) => {
    acc[p.concepto] ??= { n: 0, total: 0 };
    acc[p.concepto].n += 1;
    acc[p.concepto].total += p.cantidad;
    return acc;
  }, {});

  console.log('Filas de Ingreso que se van a crear, por concepto:');
  for (const [concepto, info] of Object.entries(porConcepto)) {
    console.log(`  ${concepto}: ${info.n} fila(s), suma $${info.total.toFixed(2)}`);
  }
  console.log(`  TOTAL: ${pendientes.length} fila(s), suma $${pendientes.reduce((s, p) => s + p.cantidad, 0).toFixed(2)}\n`);

  if (registrosFaltantes.size > 0) {
    console.log(
      `⚠️  ${registrosFaltantes.size} fila(s) de Historial apuntan a un registroOriginalId que ya no existe ` +
        `en la tabla registro — se omiten (no se les crea Ingreso): [${[...registrosFaltantes].join(', ')}]`,
    );
  }

  console.log('\nPrimeras 10 filas de ejemplo:');
  for (const p of pendientes.slice(0, 10)) {
    console.log(
      `  historial#${p.historialId} · registro#${p.registroOriginalId} · ${p.concepto} · ${p.metodoPago} · $${p.cantidad} · ${p.fecha.toISOString().slice(0, 10)}`,
    );
  }

  if (!aplicar) {
    console.log('\n(Modo vista previa — no se escribió nada. Corre con --aplicar para insertarlas de verdad.)');
    await ds.destroy();
    return;
  }

  console.log('\nAplicando...');
  await ds.transaction(async (manager) => {
    for (const p of pendientes) {
      const ingreso = manager.create(Ingreso, {
        historial: { id: p.historialId } as Historial,
        registro: { id: p.registroOriginalId } as Registro,
        concepto: p.concepto,
        metodoPago: p.metodoPago as Ingreso['metodoPago'],
        cantidad: p.cantidad,
        fecha: p.fecha,
      });
      await manager.save(ingreso);
    }
  });
  console.log(`✅ ${pendientes.length} fila(s) de Ingreso creadas.`);

  await ds.destroy();
}

main().catch((err) => {
  console.error('Error corriendo el backfill:', err);
  process.exit(1);
});
