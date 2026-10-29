import { resumo } from './carteira.js';
export function avancarDia(estado, random = Math.random) {
    estado.dia++;
    for (const e of estado.empresas) {
        const variacao = Math.max(
            -0.1,
            Math.min(0.1, e.tendencia + (random() * 2 - 1) * e.volatilidade),
        );
        e.precoCentavos = Math.max(
            100,
            Math.min(100000000, Math.round(e.precoCentavos * (1 + variacao))),
        );
        e.historico.push({ dia: estado.dia, precoCentavos: e.precoCentavos });
    }
    estado.historicoPatrimonio.push({
        dia: estado.dia,
        valor: resumo(estado).patrimonio,
    });
}
export function variacao(e) {
    const anterior = e.historico.at(-2)?.precoCentavos ?? e.precoCentavos;
    return (e.precoCentavos / anterior - 1) * 100;
}
