import { validarEmpresas } from './dados.js';
export const CHAVE = 'marketsim.partida.v1';
const inteiro = (n) => Number.isSafeInteger(n) && n >= 0;
export function validarEstado(s, base) {
    if (
        !s ||
        s.versao !== 1 ||
        !inteiro(s.dia) ||
        s.dia < 1 ||
        s.dia > 100000 ||
        !inteiro(s.saldoCentavos) ||
        !Number.isSafeInteger(s.lucroRealizadoCentavos)
    )
        throw new Error('Partida inválida ou incompatível.');
    validarEmpresas(s.empresas);
    if (
        s.empresas.length !== base.length ||
        !s.empresas.every((e) => base.some((b) => b.id === e.id))
    )
        throw new Error('Empresas incompatíveis.');
    for (const e of s.empresas) {
        const b = base.find((b) => b.id === e.id);
        if (
            e.tendencia !== b.tendencia ||
            e.volatilidade !== b.volatilidade ||
            !Array.isArray(e.historico) ||
            e.historico.length !== s.dia ||
            !e.historico.every(
                (h, i) =>
                    h.dia === i + 1 &&
                    inteiro(h.precoCentavos) &&
                    h.precoCentavos >= 100,
            ) ||
            e.historico.at(-1).precoCentavos !== e.precoCentavos
        )
            throw new Error('Cotações inválidas.');
        e.nome = b.nome;
        e.setor = b.setor;
    }
    if (
        !s.carteira ||
        typeof s.carteira !== 'object' ||
        Array.isArray(s.carteira)
    )
        throw new Error('Carteira inválida.');
    for (const [id, p] of Object.entries(s.carteira))
        if (
            !base.some((b) => b.id === id) ||
            !p ||
            !inteiro(p.quantidade) ||
            p.quantidade < 1 ||
            !inteiro(p.custoAcumuladoCentavos)
        )
            throw new Error('Posição inválida.');
    if (
        !Array.isArray(s.transacoes) ||
        !s.transacoes.every(
            (t, i) =>
                t.id === i + 1 &&
                inteiro(t.dia) &&
                t.dia >= 1 &&
                t.dia <= s.dia &&
                ['compra', 'venda'].includes(t.tipo) &&
                base.some((b) => b.id === t.empresa) &&
                inteiro(t.quantidade) &&
                t.quantidade > 0 &&
                inteiro(t.precoCentavos) &&
                t.precoCentavos >= 100 &&
                t.totalCentavos === t.quantidade * t.precoCentavos &&
                Number.isSafeInteger(t.lucroCentavos),
        )
    )
        throw new Error('Histórico inválido.');
    if (
        !Array.isArray(s.historicoPatrimonio) ||
        s.historicoPatrimonio.length !== s.dia ||
        !s.historicoPatrimonio.every(
            (h, i) => h.dia === i + 1 && inteiro(h.valor),
        )
    )
        throw new Error('Patrimônio inválido.');
    // Reconstitui operações para impedir saldos e posições inconsistentes.
    let saldo = 1000000,
        lucro = 0;
    const pos = {};
    for (const t of s.transacoes) {
        if (
            s.empresas.find((e) => e.id === t.empresa).historico[t.dia - 1]
                .precoCentavos !== t.precoCentavos
        )
            throw new Error('Preço de operação inconsistente.');
        const p = pos[t.empresa] || {
            quantidade: 0,
            custoAcumuladoCentavos: 0,
        };
        if (t.tipo === 'compra') {
            saldo -= t.totalCentavos;
            p.quantidade += t.quantidade;
            p.custoAcumuladoCentavos += t.totalCentavos;
            pos[t.empresa] = p;
            if (t.lucroCentavos !== 0) throw new Error('Lucro inválido.');
        } else {
            if (t.quantidade > p.quantidade) throw new Error('Venda inválida.');
            const c =
                t.quantidade === p.quantidade
                    ? p.custoAcumuladoCentavos
                    : Math.round(
                          (p.custoAcumuladoCentavos * t.quantidade) /
                              p.quantidade,
                      );
            const l = t.totalCentavos - c;
            if (t.lucroCentavos !== l) throw new Error('Resultado inválido.');
            lucro += l;
            saldo += t.totalCentavos;
            p.quantidade -= t.quantidade;
            p.custoAcumuladoCentavos -= c;
            if (!p.quantidade) delete pos[t.empresa];
        }
        if (saldo < 0) throw new Error('Saldo inválido.');
    }
    if (
        saldo !== s.saldoCentavos ||
        lucro !== s.lucroRealizadoCentavos ||
        Object.keys(pos).length !== Object.keys(s.carteira).length ||
        Object.entries(pos).some(
            ([id, p]) =>
                p.quantidade !== s.carteira[id]?.quantidade ||
                p.custoAcumuladoCentavos !==
                    s.carteira[id]?.custoAcumuladoCentavos,
        )
    )
        throw new Error('Partida inconsistente.');
    return s;
}
export function carregar(base, storage = localStorage) {
    const raw = storage.getItem(CHAVE);
    return raw ? validarEstado(JSON.parse(raw), base) : null;
}
export function salvar(s, storage = localStorage) {
    storage.setItem(CHAVE, JSON.stringify(s));
}
