import { carregarEmpresas, criarEstado } from './dados.js';
import { negociar } from './carteira.js';
import { avancarDia } from './mercado.js';
import { carregar, salvar, validarEstado } from './armazenamento.js';
import {
    $,
    renderizar,
    mostrarEmpresas,
    mostrarHistorico,
    formatarReais,
    notificar,
} from './interface.js';
let estado,
    base,
    periodo = 0,
    trade,
    confirmAction;
const nomes = {
    dashboard: 'Visão geral',
    mercado: 'Mercado',
    carteira: 'Carteira',
    historico: 'Histórico',
};
function navegar(view) {
    if (!nomes[view]) view = 'dashboard';
    for (const [id, nome] of Object.entries(nomes)) {
        $('#tela-' + id).hidden = id !== view;
        document
            .querySelector(`nav [data-view="${id}"]`)
            .classList.toggle('active', id === view);
        document
            .querySelector(`nav [data-view="${id}"]`)
            .setAttribute('aria-current', id === view ? 'page' : 'false');
    }
    $('#breadcrumb-view').textContent = nomes[view];
    history.replaceState(null, '', '#' + view);
}
function atualizar() {
    renderizar(estado, periodo);
    $('#avancar-dia').disabled = false;
}
function persistir() {
    try {
        salvar(estado);
        $('#save-status').textContent = '✓ Progresso salvo neste navegador';
        $('#aviso-persistencia').hidden = true;
    } catch {
        $('#save-status').textContent = '⚠ Progresso não salvo';
        $('#aviso-persistencia').textContent =
            'O navegador não conseguiu salvar. Use Backup JSON antes de sair para não perder esta partida.';
        $('#aviso-persistencia').hidden = false;
    }
}
function confirmar(title, description, action) {
    $('#confirm-title').textContent = title;
    $('#confirm-description').textContent = description;
    confirmAction = action;
    $('#confirm-dialog').showModal();
}
function baixar(nome, texto, tipo) {
    const blob = new Blob([texto], { type: tipo }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function abrirTrade(id, tipo) {
    trade = { id, tipo };
    $('#quantidade').value = 1;
    $('#trade-error').textContent = '';
    atualizarTrade();
    $('#trade-dialog').showModal();
    $('#quantidade').focus();
}
function atualizarTrade() {
    const e = estado.empresas.find((e) => e.id === trade.id),
        compra = trade.tipo === 'compra';
    trade.max = compra
        ? Math.floor(estado.saldoCentavos / e.precoCentavos)
        : estado.carteira[e.id]?.quantidade || 0;
    $('#trade-title').textContent = compra ? 'Comprar ações' : 'Vender ações';
    $('#trade-company').textContent = e.nome + ' · ' + e.id;
    $('#trade-price').textContent = formatarReais(e.precoCentavos);
    $('#trade-available').replaceChildren();
    $('#trade-available').append(
        compra ? 'Saldo disponível' : 'Ações disponíveis',
    );
    const strong = document.createElement('strong');
    strong.textContent = compra
        ? formatarReais(estado.saldoCentavos)
        : String(trade.max);
    $('#trade-available').append(strong);
    const qtd = Number($('#quantidade').value);
    $('#trade-total').textContent =
        Number.isSafeInteger(qtd) &&
        qtd > 0 &&
        Number.isSafeInteger(qtd * e.precoCentavos)
            ? formatarReais(qtd * e.precoCentavos)
            : '—';
    $('#confirmar-operacao').textContent = compra
        ? 'Confirmar compra'
        : 'Confirmar venda';
    $('#confirmar-operacao').disabled = trade.max === 0;
    $('#quantidade').max = trade.max;
    document
        .querySelectorAll('[data-trade-type]')
        .forEach((b) =>
            b.classList.toggle('selected', b.dataset.tradeType === trade.tipo),
        );
}
document.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-view]');
    if (nav) navegar(nav.dataset.view);
    const close = event.target.closest('[data-close]');
    if (close) close.closest('dialog').close();
    if (!estado) return;
    const b = event.target.closest('[data-trade]');
    if (b) abrirTrade(b.dataset.trade, b.dataset.type);
    const type = event.target.closest('[data-trade-type]');
    if (type) {
        trade.tipo = type.dataset.tradeType;
        $('#trade-error').textContent = '';
        atualizarTrade();
    }
});
$('#como-funciona').onclick = () => $('#help-dialog').showModal();
$('#avancar-dia').onclick = () => {
    if (!estado) return;
    if (estado.dia >= 100000) {
        notificar('Limite de dias atingido. Exporte a partida e reinicie.');
        return;
    }
    avancarDia(estado);
    atualizar();
    persistir();
    notificar(`Dia ${estado.dia}: as cotações foram atualizadas.`);
};
$('#trade-form').onsubmit = (event) => {
    event.preventDefault();
    try {
        const qtd = Number($('#quantidade').value);
        const total = negociar(estado, trade.id, trade.tipo, qtd);
        $('#trade-dialog').close();
        atualizar();
        persistir();
        notificar(
            `${trade.tipo === 'compra' ? 'Compra' : 'Venda'} concluída: ${qtd} ${trade.id} por ${formatarReais(total)}.`,
        );
    } catch (e) {
        $('#trade-error').textContent = e.message;
    }
};
$('#quantidade').oninput = () => {
    atualizarTrade();
    $('#trade-error').textContent = '';
};
$('#maximo').onclick = () => {
    $('#quantidade').value = trade.max;
    atualizarTrade();
};
$('#periodos').onclick = (e) => {
    const b = e.target.closest('[data-period]');
    if (!b || !estado) return;
    periodo = Number(b.dataset.period);
    document
        .querySelectorAll('[data-period]')
        .forEach((x) => x.classList.toggle('selected', x === b));
    atualizar();
};
$('#busca-empresa').oninput = () => estado && mostrarEmpresas(estado);
$('#filtro-setor').onchange = () => estado && mostrarEmpresas(estado);
$('#filtro-tipo').onchange = () => estado && mostrarHistorico(estado);
$('#reiniciar-jogo').onclick = () => {
    if (estado)
        confirmar(
            'Começar uma nova simulação?',
            'Seu progresso atual será substituído. Faça um backup antes, se quiser preservá-lo. Você voltará ao Dia 1 com R$ 10.000 virtuais.',
            () => {
                estado = criarEstado(base);
                atualizar();
                persistir();
                navegar('dashboard');
                notificar('Nova simulação iniciada.');
            },
        );
};
$('#confirm-action').onclick = () => {
    const action = confirmAction;
    confirmAction = null;
    $('#confirm-dialog').close();
    action?.();
};
$('#exportar').onclick = () => {
    if (estado)
        baixar(
            `marketsim-dia-${estado.dia}.json`,
            JSON.stringify(estado, null, 2),
            'application/json',
        );
};
$('#importar').onclick = () => {
    if (estado) $('#arquivo-importacao').click();
};
$('#arquivo-importacao').onchange = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
        if (file.size > 10000000)
            throw new Error('O arquivo excede o limite de 10 MB.');
        const novo = validarEstado(JSON.parse(await file.text()), base);
        confirmar(
            'Restaurar esta partida?',
            `A partida atual será substituída pelo Dia ${novo.dia}, com ${novo.transacoes.length} operações.`,
            () => {
                estado = novo;
                atualizar();
                persistir();
                notificar('Backup restaurado.');
            },
        );
    } catch (e) {
        notificar('Não foi possível importar: ' + e.message);
    }
};
$('#exportar-csv').onclick = () => {
    if (!estado) return;
    const linhas = [
        'Dia;Tipo;Empresa;Quantidade;Preço unitário (R$);Total (R$);Resultado realizado (R$)',
        ...estado.transacoes.map((t) =>
            [
                t.dia,
                t.tipo,
                t.empresa,
                t.quantidade,
                (t.precoCentavos / 100).toFixed(2).replace('.', ','),
                (t.totalCentavos / 100).toFixed(2).replace('.', ','),
                t.tipo === 'venda'
                    ? (t.lucroCentavos / 100).toFixed(2).replace('.', ',')
                    : '',
            ].join(';'),
        ),
    ];
    baixar(
        'marketsim-operacoes.csv',
        '\uFEFF' + linhas.join('\r\n'),
        'text/csv;charset=utf-8',
    );
};
window.addEventListener('hashchange', () => navegar(location.hash.slice(1)));
async function iniciar() {
    try {
        base = await carregarEmpresas();
        let warning;
        try {
            estado = carregar(base);
        } catch {
            warning =
                'O progresso salvo não pôde ser recuperado. Uma nova sessão foi aberta sem sobrescrever os dados antigos. Você pode restaurar um backup JSON.';
        }
        estado ||= criarEstado(base);
        atualizar();
        navegar(location.hash.slice(1));
        if (warning) {
            $('#aviso-persistencia').textContent = warning;
            $('#aviso-persistencia').hidden = false;
            $('#save-status').textContent = '⚠ Sessão nova — ainda não salva';
        } else {
            $('#save-status').textContent =
                '✓ Salvamento automático neste navegador';
        }
    } catch (e) {
        $('#fatal').textContent =
            e.message + ' Para abrir o projeto localmente, use Live Server.';
        $('#fatal').hidden = false;
        $('#save-status').textContent = 'Falha ao iniciar';
    }
}
iniciar();
