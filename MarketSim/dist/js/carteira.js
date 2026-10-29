export function resumo(estado) {
    let acoes = 0,
        custo = 0;
    for (const e of estado.empresas) {
        const p = estado.carteira[e.id];
        if (p) {
            acoes += p.quantidade * e.precoCentavos;
            custo += p.custoAcumuladoCentavos;
        }
    }
    const patrimonio = estado.saldoCentavos + acoes;
    return {
        acoes,
        custo,
        patrimonio,
        resultado: patrimonio - 1000000,
        naoRealizado: acoes - custo,
    };
}
export function negociar(estado, id, tipo, quantidade) {
    const e = estado.empresas.find((e) => e.id === id);
    if (!e || !['compra', 'venda'].includes(tipo))
        throw new Error('Operação inválida.');
    if (!Number.isSafeInteger(quantidade) || quantidade <= 0)
        throw new Error('Informe uma quantidade inteira maior que zero.');
    const total = quantidade * e.precoCentavos;
    if (!Number.isSafeInteger(total))
        throw new Error('Quantidade acima do limite.');
    const p = estado.carteira[id] || {
        quantidade: 0,
        custoAcumuladoCentavos: 0,
    };
    let lucro = 0;
    if (tipo === 'compra') {
        if (total > estado.saldoCentavos)
            throw new Error('Saldo insuficiente para esta compra.');
        p.quantidade += quantidade;
        p.custoAcumuladoCentavos += total;
        estado.saldoCentavos -= total;
        estado.carteira[id] = p;
    } else {
        if (quantidade > p.quantidade)
            throw new Error('Você não possui essa quantidade de ações.');
        // A venda parcial retira o custo proporcional, arredondado em centavos.
        const custo =
            quantidade === p.quantidade
                ? p.custoAcumuladoCentavos
                : Math.round(
                      (p.custoAcumuladoCentavos * quantidade) / p.quantidade,
                  );
        lucro = total - custo;
        p.quantidade -= quantidade;
        p.custoAcumuladoCentavos -= custo;
        estado.saldoCentavos += total;
        estado.lucroRealizadoCentavos += lucro;
        if (!p.quantidade) delete estado.carteira[id];
    }
    estado.transacoes.push({
        id: estado.transacoes.length + 1,
        dia: estado.dia,
        tipo,
        empresa: id,
        quantidade,
        precoCentavos: e.precoCentavos,
        totalCentavos: total,
        lucroCentavos: lucro,
    });
    return total;
}
