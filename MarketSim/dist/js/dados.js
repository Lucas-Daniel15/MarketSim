export function validarEmpresas(empresas) {
    const ids = new Set();
    if (!Array.isArray(empresas) || !empresas.length)
        throw new Error('Lista de empresas inválida.');
    for (const e of empresas) {
        if (
            !/^[A-Z]{2,8}$/.test(e.id) ||
            ids.has(e.id) ||
            !e.nome ||
            !e.setor ||
            !Number.isSafeInteger(e.precoCentavos) ||
            e.precoCentavos < 100 ||
            !Number.isFinite(e.tendencia) ||
            !Number.isFinite(e.volatilidade) ||
            e.volatilidade < 0
        )
            throw new Error('Dados de empresa inválidos.');
        ids.add(e.id);
    }
    return empresas;
}
export async function carregarEmpresas() {
    const resposta = await fetch('./data/empresas.json');
    if (!resposta.ok)
        throw new Error(
            'Não foi possível carregar as empresas. Recarregue a página.',
        );
    return validarEmpresas(await resposta.json());
}
export function criarEstado(empresas) {
    return {
        versao: 1,
        dia: 1,
        saldoCentavos: 1000000,
        lucroRealizadoCentavos: 0,
        empresas: structuredClone(empresas).map((e) => ({
            ...e,
            historico: [{ dia: 1, precoCentavos: e.precoCentavos }],
        })),
        carteira: {},
        transacoes: [],
        historicoPatrimonio: [{ dia: 1, valor: 1000000 }],
    };
}
