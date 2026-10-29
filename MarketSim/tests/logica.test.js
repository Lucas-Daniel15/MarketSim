import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarEstado } from '../dist/js/dados.js';
import { negociar, resumo } from '../dist/js/carteira.js';
import { avancarDia } from '../dist/js/mercado.js';
import { validarEstado, salvar, carregar } from '../dist/js/armazenamento.js';
const base = JSON.parse(
    readFileSync(new URL('../dist/data/empresas.json', import.meta.url)),
);
test('compra, avanço, venda parcial e fechamento preservam patrimônio e custo', () => {
    const s = criarEstado(base);
    negociar(s, 'TECH', 'compra', 5);
    assert.equal(s.saldoCentavos, 940000);
    avancarDia(s, () => 1);
    assert.equal(s.empresas[0].precoCentavos, 12564);
    assert.equal(resumo(s).resultado, 2820);
    negociar(s, 'TECH', 'venda', 2);
    assert.equal(s.carteira.TECH.custoAcumuladoCentavos, 36000);
    assert.equal(s.lucroRealizadoCentavos, 1128);
    negociar(s, 'TECH', 'venda', 3);
    assert.equal(s.carteira.TECH, undefined);
    assert.equal(s.lucroRealizadoCentavos, 2820);
    validarEstado(s, base);
});
test('operações inválidas não alteram estado', () => {
    const s = criarEstado(base),
        before = JSON.stringify(s);
    for (const q of [0, -1, 1.5, NaN, Infinity, 100000])
        assert.throws(() => negociar(s, 'TECH', 'compra', q));
    assert.throws(() => negociar(s, 'TECH', 'venda', 1));
    assert.throws(() => negociar(s, 'NOPE', 'compra', 1));
    assert.equal(JSON.stringify(s), before);
});
test('custo médio ponderado e arredondamento na liquidação', () => {
    const s = criarEstado(base);
    negociar(s, 'TECH', 'compra', 3);
    avancarDia(s, () => 0.8);
    negociar(s, 'TECH', 'compra', 2);
    const custo = s.carteira.TECH.custoAcumuladoCentavos;
    for (let i = 0; i < 5; i++) negociar(s, 'TECH', 'venda', 1);
    assert.equal(s.carteira.TECH, undefined);
    assert.equal(
        s.lucroRealizadoCentavos,
        5 * s.empresas[0].precoCentavos - custo,
    );
    validarEstado(s, base);
});
test('1000 dias mantêm preços positivos, históricos e limites', () => {
    const s = criarEstado(base);
    for (let i = 0; i < 1000; i++) avancarDia(s, () => 0);
    assert.equal(s.dia, 1001);
    for (const e of s.empresas) {
        assert.ok(e.precoCentavos >= 100);
        assert.equal(e.historico.length, 1001);
    }
    validarEstado(s, base);
});
test('persistência e rejeição de backups adulterados', () => {
    const s = criarEstado(base);
    negociar(s, 'AGRO', 'compra', 12);
    const storage = {
        raw: null,
        setItem(k, v) {
            this.raw = v;
        },
        getItem() {
            return this.raw;
        },
    };
    salvar(s, storage);
    assert.deepEqual(carregar(base, storage), s);
    const corrupt = structuredClone(s);
    corrupt.saldoCentavos++;
    assert.throws(() => validarEstado(corrupt, base));
    storage.raw = '{bad';
    assert.throws(() => carregar(base, storage));
});
test('sequência de operações mantém identidade financeira', () => {
    const s = criarEstado(base);
    for (let i = 0; i < 60; i++) {
        negociar(s, 'ENER', 'compra', 1);
        if (i % 3 === 0) negociar(s, 'ENER', 'venda', 1);
        avancarDia(s, () => (i % 2 ? 0.1 : 0.9));
        assert.equal(
            resumo(s).resultado,
            resumo(s).naoRealizado + s.lucroRealizadoCentavos,
        );
    }
    validarEstado(s, base);
});
