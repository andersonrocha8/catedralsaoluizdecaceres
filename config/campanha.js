/* =====================================================================
 * CONFIGURAÇÃO DA CAMPANHA — edite só este arquivo para atualizar a página
 * (textos de doação, chave PIX, metas, eventos, benfeitores e tags/QR codes).
 * ===================================================================== */
window.CAMPANHA = {
  site: {
    // Domínio oficial (usado nos QR codes das tags e no aviso antifraude)
    url: '', // ← preencher com o domínio definitivo, ex.: 'https://doe.SEUDOMINIO.org.br' (vazio = endereço atual)
    nome: 'Restauração da Catedral São Luiz de Cáceres'
  },

  pix: {
    chave: 'catedralcaceres70@gmail.com',
    tipoChave: 'E-mail',
    // Nome que o doador deve ver no app do banco ANTES de confirmar
    recebedorExibido: 'DIOCESE DE SAO LUIZ DE CACERES – Restauração Catedral',
    // Campos do BR Code (sem acento; nome até 25, cidade até 15)
    nomeBrCode: 'DIOCESE SAO LUIZ CACERES',
    cidadeBrCode: 'CACERES',
    descricao: 'Restauracao Catedral',
    // Valores sugeridos (botões). O doador sempre pode digitar outro valor.
    valoresSugeridos: [20, 50, 100, 200, 500],
    txidPadrao: 'SITE' // aparece como identificador; algumas instituições mostram no extrato
  },

  banco: {
    ativo: true,
    nome: 'Banco Cooperativo Sicredi S.A. – Bansicredi',
    codigo: '748',
    agencia: '0804',
    conta: '50815-4',
    favorecido: 'Diocese São Luiz de Cáceres',
    cnpj: '03.192.499/0003-36'
  },

  contato: {
    secretariaHorario: 'Seg a Sex: 7h30 às 11h | 13h às 17h · Sáb: 7h30 às 11h',
    missas: 'Ter a Sáb 19h · Dom 7h e 19h',
    telefone: '(65) 3223-4443',
    telefoneLink: 'tel:+556532234443',
    whatsapp: '', // ex.: '5565999999999' — se preenchido, aparece botão "Falar com a secretaria"
    instagram: 'https://www.instagram.com/paroquiasaoluizcaceres/'
  },

  // Barra de progresso da arrecadação. Deixe "meta" como null para esconder.
  // Atualize "arrecadado" manualmente (v1) — na v2 virá da API.
  progresso: {
    meta: null,          // ex.: 1500000
    arrecadado: null,    // ex.: 235400
    atualizadoEm: null   // ex.: '2026-12-01'
  },

  eventos: [
    {
      titulo: 'Almoço da Catedral',
      data: '2026-12-13',
      horario: '11h às 13h',
      local: 'Centro Paroquial São Francisco — Av. 7 de Setembro, Centro',
      detalhe: 'Cartela: R$ 30,00',
      texto: 'Além de saborear um delicioso almoço, você contribui para preservar a história e a beleza da nossa Catedral.'
    },
    {
      titulo: 'Show de Prêmios',
      data: '2026-12-13',
      horario: 'a partir das 15h',
      local: 'Centro Paroquial São Francisco — Av. 7 de Setembro, Centro',
      detalhe: 'Cartela: R$ 30,00',
      texto: 'Concorra a 2 motos, 1 touro, 2 bicicletas e 1 celular.'
    }
  ],

  /* Benfeitores ("doadores master"): empresas/pessoas com contribuição expressiva.
   * Só publique com autorização expressa do benfeitor.
   * nivel: 'pedra-angular' | 'coluna' | 'vitral'  (ver docs/V2-ARQUITETURA.md)
   * Exemplo:
   * { nome: 'Empresa X', nivel: 'pedra-angular', logo: 'assets/img/benfeitores/empresa-x.webp', site: 'https://...' }
   */
  benfeitores: [],

  // Mural de doadores (v2 — depende do backend). Mantenha false na v1.
  mural: { ativo: false, endpoint: '/api/mural' },

  /* TAGS e QR CODES
   * Cada tag/QR impresso aponta para:  {site.url}/?t=CODIGO
   * Assim você muda o destino a qualquer momento sem reimprimir nada.
   *  - rotulo:   nome interno (para relatórios)
   *  - valor:    valor pré-selecionado (opcional)
   *  - txid:     identificador no PIX (até 25 letras/números) → ajuda a saber de onde veio a doação
   *  - secao:    âncora para rolar direto (ex.: '#doar', '#agenda')
   *  - redirect: URL para redirecionar direto (ex.: link de inscrição, vídeo, live). Deixe vazio para não usar.
   */
  tags: {
    'porta':      { rotulo: 'Porta principal da Catedral', txid: 'TAGPORTA', secao: '#doar' },
    'bancos':     { rotulo: 'Bancos (assentos) da Catedral', txid: 'TAGBANCOS', secao: '#doar' },
    'secretaria': { rotulo: 'Balcão da secretaria', txid: 'TAGSECRETARIA', secao: '#doar' },
    'santinho':   { rotulo: 'Santinho / folheto impresso', txid: 'FOLHETO', secao: '#doar' },
    'evento':     { rotulo: 'Almoço e Show de Prêmios 13/12', txid: 'EVENTO1312', secao: '#agenda' },
    'instagram':  { rotulo: 'Link da bio do Instagram', txid: 'INSTAGRAM', secao: '' }
  },

  // Estatística de acessos sem cookies (opcional). Ex.: 'https://catedral.goatcounter.com/count'
  analytics: { goatcounter: '' }
};
