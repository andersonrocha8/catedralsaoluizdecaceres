/*!
 * pix.js — gera o "PIX Copia e Cola" (BR Code estático, padrão EMV-MPM do Banco Central)
 * Sem dependências, roda 100% no navegador. Nenhum dado sai do aparelho do doador.
 *
 * Referência: Manual de Padrões para Iniciação do Pix (BCB) — BR Code / EMV QRCPS-MPM.
 */
(function (global) {
  'use strict';

  // Remove acentos e caracteres fora do conjunto aceito pelo BR Code
  function sanitize(text, max) {
    return String(text || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 .\-\/]/g, '')
      .trim()
      .slice(0, max);
  }

  // Campo EMV: ID (2) + tamanho (2) + valor
  function field(id, value) {
    var v = String(value);
    var len = new TextEncoder().encode(v).length; // tamanho em bytes
    if (len > 99) throw new Error('Campo ' + id + ' excede 99 bytes');
    return id + (len < 10 ? '0' : '') + len + v;
  }

  // CRC16-CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF)
  function crc16(str) {
    var bytes = new TextEncoder().encode(str);
    var crc = 0xFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes[i] << 8;
      for (var j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * @param {Object} o
   * @param {string} o.chave       Chave PIX (e-mail, CPF/CNPJ, telefone +55..., aleatória)
   * @param {string} o.nome        Nome do recebedor (até 25 caracteres, sem acento)
   * @param {string} o.cidade      Cidade do recebedor (até 15 caracteres)
   * @param {number} [o.valor]     Valor em reais. Omitido = o doador digita o valor no banco
   * @param {string} [o.txid]      Identificador (até 25, só letras/números). Útil para rastrear a origem (tag/QR)
   * @param {string} [o.descricao] Mensagem curta exibida ao pagador em alguns bancos
   */
  function brcode(o) {
    if (!o || !o.chave) throw new Error('Chave PIX obrigatória');
    var chave = String(o.chave).trim();
    var gui = field('00', 'br.gov.bcb.pix') + field('01', chave);
    if (o.descricao) {
      var desc = sanitize(o.descricao, 40);
      // o campo 26 inteiro não pode passar de 99 bytes
      var room = 99 - gui.length - 4;
      if (room > 0 && desc) gui += field('02', desc.slice(0, room));
    }
    var txid = String(o.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

    var payload =
      field('00', '01') +                       // Payload Format Indicator
      field('26', gui) +                        // Merchant Account Information (PIX)
      field('52', '0000') +                     // Merchant Category Code
      field('53', '986') +                      // Moeda: BRL
      (o.valor && Number(o.valor) > 0 ? field('54', Number(o.valor).toFixed(2)) : '') +
      field('58', 'BR') +
      field('59', sanitize(o.nome, 25) || 'RECEBEDOR') +
      field('60', sanitize(o.cidade, 15) || 'BRASIL') +
      field('62', field('05', txid)) +          // Additional Data: txid
      '6304';
    return payload + crc16(payload);
  }

  // Validação de um código copia-e-cola (confere o CRC)
  function valido(code) {
    if (!code || code.length < 8) return false;
    return crc16(code.slice(0, -4)) === code.slice(-4).toUpperCase();
  }

  global.Pix = { brcode: brcode, crc16: crc16, valido: valido, sanitize: sanitize };
})(typeof window !== 'undefined' ? window : globalThis);
