import { resumo } from './carteira.js';
import { variacao } from './mercado.js';
export const $ = (s) => document.querySelector(s);
export const formatarReais = (c) =>
    (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const percentual = (n) =>
    (n > 0 ? '+' : '') +
    n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) +
    '%';
const cor = (n) => (n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral');
export const esc = (s) =>
    String(s).replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c],
    );
const logo = (e) =>
    `<span class="company-logo logo-${esc(e.id)}">${e.id === 'TECH' ? 'T' : e.id === 'AGRO' ? 'A' : 'ϟ'}</span>`;
const company = (e) =>
    `<div class="company">${logo(e)}<div><b>${esc(e.nome)}</b><small>${esc(e.id)}</small></div></div>`;
export function grafico(
    valores,
    { mini = false, labels = [], capital = false } = {},
) {
    const w = mini ? 150 : 650,
        h = mini ? 65 : 200,
        left = mini ? 0 : 62,
        right = mini ? 150 : 640,
        top = mini ? 6 : 15,
        bottom = mini ? 60 : 170;
    const low = Math.min(...valores),
        high = Math.max(...valores),
        padding = Math.max((high - low) * 0.25, high * 0.003, 100);
    const min = low - padding,
        max = high + padding,
        y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top);
    const points = valores.map((v, i) => [
        left +
            (valores.length === 1 ? 0.5 : i / (valores.length - 1)) *
                (right - left),
        y(v),
    ]);
    const line = points.map((p) => p.join(',')).join(' '),
        up = valores.at(-1) >= valores[0],
        color = up ? '#b4ef67' : '#f68b98';
    let grid = '';
    if (!mini) {
        for (let i = 0; i < 4; i++) {
            const value = min + ((max - min) * i) / 3,
                yy = y(value);
            grid += `<line x1="${left}" x2="${right}" y1="${yy}" y2="${yy}" stroke="#28303a" stroke-dasharray="3 5"/><text x="0" y="${yy + 3}" fill="#7e8a9b" font-size="10">${(value / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</text>`;
        }
        grid += `<text x="${left}" y="195" fill="#7e8a9b" font-size="10">Dia ${labels[0] || 1}</text><text x="${right}" y="195" text-anchor="end" fill="#7e8a9b" font-size="10">${labels.length > 1 ? 'Dia ' + labels.at(-1) : ''}</text>`;
        if (capital && min <= 1000000 && max >= 1000000)
            grid += `<line x1="${left}" x2="${right}" y1="${y(1000000)}" y2="${y(1000000)}" stroke="#657386" stroke-dasharray="5 5"/>`;
    }
    const area =
        points.length > 1
            ? `<polygon points="${left},${bottom} ${line} ${right},${bottom}" fill="${color}" opacity=".055"/>`
            : '';
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${mini ? 'Cotação' : 'Patrimônio'}: ${formatarReais(valores[0])} até ${formatarReais(valores.at(-1))}">${grid}${area}<polyline points="${line}" fill="none" stroke="${color}" stroke-width="${mini ? 2 : 2.5}" stroke-linejoin="round"/>${points.length === 1 ? `<circle cx="${points[0][0]}" cy="${points[0][1]}" r="4" fill="${color}"/>` : ''}</svg>`;
}
const empty = (title, description, cta = true) =>
    `<div class="empty"><div class="empty-symbol">◇</div><h2>${title}</h2><p>${description}</p>${cta ? '<button class="primary" data-view="mercado">Explorar mercado →</button>' : ''}</div>`;
export function renderizar(s, periodo = 0) {
    const r = resumo(s);
    $('#dia-atual').textContent = s.dia;
    for (const [id, n] of Object.entries({
        'patrimonio-total': r.patrimonio,
        'saldo-disponivel': s.saldoCentavos,
        'valor-acoes': r.acoes,
        'resultado-total': r.resultado,
    }))
        $('#' + id).textContent = formatarReais(n);
    $('#resultado-total').className = cor(r.resultado);
    $('#patrimonio-retorno').textContent =
        percentual(r.resultado / 10000) + ' desde o início';
    $('#patrimonio-retorno').className = cor(r.resultado);
    const count = Object.keys(s.carteira).length;
    $('#posicoes-count').textContent = count
        ? `${count} ${count === 1 ? 'posição aberta' : 'posições abertas'}`
        : 'Nenhuma posição aberta';
    const hist = periodo
        ? s.historicoPatrimonio.slice(-periodo)
        : s.historicoPatrimonio;
    $('#grafico-patrimonio').innerHTML = grafico(
        hist.map((h) => h.valor),
        { labels: hist.map((h) => h.dia), capital: true },
    );
    $('#chart-note').textContent =
        s.dia === 1
            ? 'O primeiro ponto da sua jornada. Avance o dia para acompanhar a evolução.'
            : `Fechamentos diários · ${hist.length} dias exibidos · valores em reais`;
    const colors = ['#b4ef67', '#ada0ed', '#e0c584', '#82bddc'];
    let start = 0;
    const parts = [
        { nome: 'Saldo disponível', value: s.saldoCentavos },
        ...s.empresas
            .filter((e) => s.carteira[e.id])
            .map((e) => ({
                nome: e.nome,
                value: s.carteira[e.id].quantidade * e.precoCentavos,
            })),
    ];
    const stops = parts.map((p, i) => {
        const a = start;
        start += (p.value / r.patrimonio) * 100;
        return `${colors[i]} ${a}% ${start}%`;
    });
    $('#allocation').innerHTML =
        `<div class="ring" style="background:conic-gradient(${stops.join(',')})"><div><b>${count}</b>${count === 1 ? 'empresa' : 'empresas'} na carteira</div></div>${parts.map((p, i) => `<div class="legend-row"><span><i style="background:${colors[i]}"></i>${esc(p.nome)}</span><b>${((p.value / r.patrimonio) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</b></div>`).join('')}`;
    $('#mercado-resumo').innerHTML =
        `<table><thead><tr><th>Empresa</th><th>Setor</th><th>Preço atual</th><th>Variação do dia</th><th>Últimos dias</th><th></th></tr></thead><tbody>${s.empresas
            .map(
                (e) =>
                    `<tr><td>${company(e)}</td><td class="muted">${esc(e.setor)}</td><td>${formatarReais(e.precoCentavos)}</td><td class="${cor(variacao(e))}">${percentual(variacao(e))}</td><td><div class="mini-chart">${grafico(
                        e.historico.slice(-30).map((h) => h.precoCentavos),
                        { mini: true },
                    )}</div></td><td><button class="row-trade" data-trade="${e.id}" data-type="compra">Negociar ↗</button></td></tr>`,
            )
            .join('')}</tbody></table>`;
    mostrarEmpresas(s);
    mostrarCarteira(s);
    mostrarHistorico(s);
}
export function mostrarEmpresas(s) {
    const busca = $('#busca-empresa').value.trim().toLocaleLowerCase('pt-BR'),
        setor = $('#filtro-setor').value;
    const empresas = s.empresas.filter(
        (e) =>
            (e.nome + ' ' + e.id).toLocaleLowerCase('pt-BR').includes(busca) &&
            (!setor || e.setor === setor),
    );
    $('#mensagem-mercado').textContent =
        `${empresas.length} ${empresas.length === 1 ? 'empresa disponível' : 'empresas disponíveis'}`;
    $('#lista-empresas').innerHTML = empresas.length
        ? empresas
              .map(
                  (e) =>
                      `<article class="panel cartao-empresa"><div class="cabecalho-empresa">${company(e)}<span class="tag">${esc(e.id)}</span></div><div class="setor-empresa">${esc(e.setor)}</div><div class="muted">Preço por ação</div><div class="quote-line"><strong class="preco-empresa">${formatarReais(e.precoCentavos)}</strong><span class="${cor(variacao(e))}">${percentual(variacao(e))}</span></div><div class="stock-chart">${grafico(
                          e.historico.slice(-30).map((h) => h.precoCentavos),
                          { mini: true },
                      )}</div><div class="stock-details"><span>Na sua carteira</span><b>${s.carteira[e.id]?.quantidade || 0} ações</b></div><div class="stock-details"><span>Volatilidade diária</span><b>${(e.volatilidade * 100).toLocaleString('pt-BR')}%</b></div><div class="acoes-empresa"><button class="primary" data-trade="${e.id}" data-type="compra">Comprar</button><button class="secondary" data-trade="${e.id}" data-type="venda" ${s.carteira[e.id] ? '' : 'disabled'}>Vender</button></div></article>`,
              )
              .join('')
        : empty(
              'Nenhuma empresa encontrada',
              'Tente outro nome, código ou setor.',
              false,
          );
}
function mostrarCarteira(s) {
    const r = resumo(s);
    $('#resumo-carteira').innerHTML = [
        ['Valor em ações', r.acoes, 'Valor atual das posições'],
        [
            'Resultado não realizado',
            r.naoRealizado,
            'Variação das ações que você ainda possui',
        ],
        [
            'Lucro / prejuízo realizado',
            s.lucroRealizadoCentavos,
            'Resultado das vendas concluídas',
        ],
    ]
        .map(
            ([a, b, c], i) =>
                `<article class="metric"><div>${a}</div><strong class="${i ? cor(b) : ''}">${formatarReais(b)}</strong><small>${c}</small></article>`,
        )
        .join('');
    const empresas = s.empresas.filter((e) => s.carteira[e.id]);
    $('#corpo-carteira').innerHTML = empresas.length
        ? `<table><thead><tr><th>Empresa</th><th>Quantidade</th><th>Preço médio</th><th>Preço atual</th><th>Valor de mercado</th><th>Resultado</th><th></th></tr></thead><tbody>${empresas
              .map((e) => {
                  const p = s.carteira[e.id],
                      valor = p.quantidade * e.precoCentavos,
                      ganho = valor - p.custoAcumuladoCentavos;
                  return `<tr><td>${company(e)}</td><td>${p.quantidade}</td><td>${formatarReais(p.custoAcumuladoCentavos / p.quantidade)}</td><td>${formatarReais(e.precoCentavos)}</td><td>${formatarReais(valor)}</td><td class="${cor(ganho)}">${formatarReais(ganho)}<br><small>${percentual((ganho / p.custoAcumuladoCentavos) * 100)}</small></td><td><button class="row-trade" data-trade="${e.id}" data-type="venda">Vender ↗</button></td></tr>`;
              })
              .join('')}</tbody></table>`
        : empty(
              'Sua carteira está esperando o primeiro investimento',
              'Explore as empresas e use seu saldo virtual para começar.',
          );
}
export function mostrarHistorico(s) {
    const tipo = $('#filtro-tipo').value,
        ts = s.transacoes.filter((t) => !tipo || t.tipo === tipo).toReversed();
    $('#total-operacoes').textContent = `${ts.length} operações`;
    $('#corpo-historico').innerHTML = ts.length
        ? `<table><thead><tr><th>Dia</th><th>Operação</th><th>Empresa</th><th>Quantidade</th><th>Preço unitário</th><th>Total</th><th>Resultado realizado</th></tr></thead><tbody>${ts.map((t) => `<tr><td>Dia ${t.dia}</td><td><span class="badge ${t.tipo === 'venda' ? 'sale' : ''}">${t.tipo === 'compra' ? 'Compra' : 'Venda'}</span></td><td>${esc(t.empresa)}</td><td>${t.quantidade}</td><td>${formatarReais(t.precoCentavos)}</td><td>${formatarReais(t.totalCentavos)}</td><td class="${t.tipo === 'venda' ? cor(t.lucroCentavos) : 'neutral'}">${t.tipo === 'venda' ? formatarReais(t.lucroCentavos) : '—'}</td></tr>`).join('')}</tbody></table>`
        : empty(
              s.transacoes.length
                  ? 'Nenhuma operação neste filtro'
                  : 'Sua história começa com uma decisão',
              s.transacoes.length
                  ? 'Escolha outro tipo de operação.'
                  : 'Suas compras e vendas aparecerão aqui.',
              !s.transacoes.length,
          );
}
let timer;
export function notificar(m) {
    $('#toast').textContent = m;
    $('#toast').hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => ($('#toast').hidden = true), 4500);
}
