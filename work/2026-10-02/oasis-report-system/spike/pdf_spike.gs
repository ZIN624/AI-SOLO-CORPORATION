/**
 * OASIS 報告管理システム — HTML→PDF 変換の事前検証スクリプト
 *
 * 目的:
 *   Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF) の旧世代コンバータで
 *   「何が効いて何が効かないか」を本実装の前に確認する。
 *
 * 安全性:
 *   - 新しいフォルダ「OASIS_PDF検証_YYYYMMDD-HHmm」をマイドライブ直下に作り、そこにPDFを書くだけ。
 *   - 既存のファイル・フォーム・トリガー・シートには一切触れない。共有設定も変更しない。
 *
 * 使い方:
 *   1. https://script.google.com で「新しいプロジェクト」を作り、このファイルの中身を貼る
 *      （既存の OASISデータベース プロジェクトには貼らないこと）
 *   2. SAMPLE_IMAGE_FILE_ID に、検証に使ってよい画像（Drive上のJPEG/HEIC）のファイルIDを入れる
 *   3. spike_runAll を実行 → 権限を許可
 *   4. 実行ログ（表示 > ログ）の結果と、作られたフォルダのPDFを確認する
 */

/** 検証用の画像ファイルID（モデル写真ではなく、出しても困らない画像が望ましい） */
const SAMPLE_IMAGE_FILE_ID = 'ここに画像のファイルIDを入れる';

function spike_runAll() {
  const folder = DriveApp.createFolder(
    'OASIS_PDF検証_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd-HHmm')
  );
  const results = [];

  results.push(spike_render_(folder, 'T1_table基本', spike_htmlTable_()));
  results.push(spike_render_(folder, 'T2_flexとgrid', spike_htmlFlexGrid_()));
  results.push(spike_render_(folder, 'T3_用紙サイズと改ページ', spike_htmlPaging_()));
  results.push(spike_render_(folder, 'T4_フォント', spike_htmlFonts_()));

  if (SAMPLE_IMAGE_FILE_ID && SAMPLE_IMAGE_FILE_ID.indexOf('ここに') !== 0) {
    const variants = spike_imageVariants_(SAMPLE_IMAGE_FILE_ID);
    results.push(spike_render_(folder, 'T5_画像解像度比較', spike_htmlImages_(variants)));
    results.push(spike_render_(folder, 'T6_外部URL画像', spike_htmlExternalImage_(SAMPLE_IMAGE_FILE_ID)));
  } else {
    Logger.log('SAMPLE_IMAGE_FILE_ID が未設定のため画像テスト(T5,T6)はスキップしました');
  }

  results.push(spike_render_(folder, 'T7_モデル報告書の試作', spike_htmlModelReport_()));

  Logger.log('==== 結果 ====');
  results.forEach((r) => Logger.log(JSON.stringify(r)));
  Logger.log('出力フォルダ: ' + folder.getUrl());
}

// ------------------------------------------------------------
// 共通: HTML → PDF
// ------------------------------------------------------------
function spike_render_(folder, name, html) {
  const t0 = Date.now();
  try {
    const pdf = Utilities.newBlob(html, MimeType.HTML, name + '.html').getAs(MimeType.PDF);
    pdf.setName(name + '.pdf');
    const file = folder.createFile(pdf);
    return { test: name, ok: true, ms: Date.now() - t0, bytes: file.getSize(), url: file.getUrl() };
  } catch (e) {
    return { test: name, ok: false, ms: Date.now() - t0, error: String(e) };
  }
}

function spike_page_(title, body) {
  return (
    '<html><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<style>@page { size: A4; margin: 12mm; }</style>' +
    '</head><body style="font-family: sans-serif; font-size: 10.5pt; color:#222;">' +
    '<div style="font-size:9pt;color:#888;">' + title + '</div>' +
    body +
    '</body></html>'
  );
}

// ------------------------------------------------------------
// T1: table + インラインCSS（本命の書き方）
// ------------------------------------------------------------
function spike_htmlTable_() {
  const th = 'style="width:30%;background:#f0ece4;border:1px solid #999;padding:6px 8px;text-align:left;font-weight:bold;"';
  const td = 'style="border:1px solid #999;padding:6px 8px;"';
  const rows = [
    ['モデル名', '検証 花子 様'],
    ['担当者', '検証 太郎'],
    ['施術日', '2026-10-02'],
    ['メニュー', 'カット, カラー'],
    ['所要時間', '2時間30分'],
  ]
    .map((r) => '<tr><th ' + th + '>' + r[0] + '</th><td ' + td + '>' + r[1] + '</td></tr>')
    .join('');
  return spike_page_(
    'T1: table + inline CSS / border-collapse / 背景色 / 角丸 / 影',
    '<h1 style="font-size:18pt;border-bottom:3px solid #333;padding-bottom:4px;">OASIS モデル施術報告書</h1>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:8px;">' + rows + '</table>' +
      '<p style="margin-top:12px;padding:8px;border-radius:8px;box-shadow:0 2px 4px #999;background:#fff7e0;">' +
      '角丸（border-radius）と影（box-shadow）が効くかの確認用</p>'
  );
}

// ------------------------------------------------------------
// T2: flex / grid（効かない想定。崩れ方を確認する）
// ------------------------------------------------------------
function spike_htmlFlexGrid_() {
  const box = (t) => '<div style="border:1px solid #c00;padding:8px;">' + t + '</div>';
  return spike_page_(
    'T2: flex / grid — 横並びになれば有効、縦積みなら無効',
    '<h3>display:flex</h3>' +
      '<div style="display:flex;gap:8px;">' + box('A') + box('B') + box('C') + '</div>' +
      '<h3>display:grid</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' + box('A') + box('B') + box('C') + '</div>' +
      '<h3>display:inline-block（代替候補）</h3>' +
      '<div>' +
      ['A', 'B', 'C'].map((t) => '<div style="display:inline-block;width:30%;border:1px solid #c00;padding:8px;">' + t + '</div>').join('') +
      '</div>' +
      '<h3>float（代替候補）</h3>' +
      '<div>' +
      ['A', 'B', 'C'].map((t) => '<div style="float:left;width:30%;border:1px solid #c00;padding:8px;">' + t + '</div>').join('') +
      '<div style="clear:both;"></div></div>'
  );
}

// ------------------------------------------------------------
// T3: @page size / 改ページ
// ------------------------------------------------------------
function spike_htmlPaging_() {
  let body = '<p>1ページ目。@page { size: A4 } が効いていれば A4 (210×297mm) になる。PDFのページサイズを確認。</p>';
  body += '<div style="page-break-before:always;">2ページ目（page-break-before:always）</div>';
  body += '<table style="width:100%;border-collapse:collapse;page-break-inside:avoid;">';
  for (let i = 1; i <= 80; i++) {
    body += '<tr><td style="border:1px solid #ccc;padding:4px;">行 ' + i + '</td><td style="border:1px solid #ccc;padding:4px;">長い表がページをまたぐときの挙動確認</td></tr>';
  }
  body += '</table>';
  return spike_page_('T3: 用紙サイズ / 改ページ / 長い表', body);
}

// ------------------------------------------------------------
// T4: フォント
// ------------------------------------------------------------
function spike_htmlFonts_() {
  const fams = ['sans-serif', 'serif', 'monospace', "'Noto Sans JP'", "'Noto Serif JP'", "'MS Gothic'", 'Arial'];
  const body = fams
    .map((f) => '<p style="font-family:' + f + ';font-size:12pt;">[' + f + '] 美容室オアシス ABC abc 123 ①② 髙﨑 <b>太字</b></p>')
    .join('');
  return spike_page_('T4: font-family / 機種依存文字 / 異体字', body);
}

// ------------------------------------------------------------
// T5: 画像の取得方法と解像度の比較
// ------------------------------------------------------------
function spike_imageVariants_(fileId) {
  const out = [];
  const file = DriveApp.getFileById(fileId);
  const mime = file.getMimeType();

  // (a) 原寸の blob（現行方式と同じ取り方）。HEIC は Docs と同様に PDF でも表示できない可能性あり
  const orig = file.getBlob();
  out.push({ label: '(a) 原寸 blob mime=' + mime + ' bytes=' + orig.getBytes().length, blob: orig });

  // (b) Drive のサムネイルAPIで長辺を指定（HEIC→JPEG 変換と、解像度指定ができるかの確認）
  [800, 1600].forEach((size) => {
    try {
      const res = UrlFetchApp.fetch('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + size, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
      });
      const ct = String(res.getHeaders()['Content-Type'] || '');
      if (res.getResponseCode() === 200 && ct.indexOf('image/') === 0) {
        const b = res.getBlob();
        out.push({ label: '(b) thumbnail sz=w' + size + ' ' + ct + ' bytes=' + b.getBytes().length, blob: b });
      } else {
        out.push({ label: '(b) thumbnail sz=w' + size + ' 失敗 code=' + res.getResponseCode() + ' ct=' + ct, blob: null });
      }
    } catch (e) {
      out.push({ label: '(b) thumbnail sz=w' + size + ' 例外 ' + e, blob: null });
    }
  });
  return out;
}

function spike_htmlImages_(variants) {
  let body = '';
  variants.forEach((v) => {
    body += '<h4 style="margin:10px 0 4px;">' + v.label + '</h4>';
    if (!v.blob) {
      body += '<p>（画像なし）</p>';
      return;
    }
    const src = 'data:' + v.blob.getContentType() + ';base64,' + Utilities.base64Encode(v.blob.getBytes());
    // 同じ画像を「width属性」「CSS幅」「高さのみ指定」の3通りで置き、縦横比が崩れないか確認
    body +=
      '<table style="border-collapse:collapse;"><tr>' +
      '<td style="padding:4px;vertical-align:top;"><img src="' + src + '" width="180"><br>width属性=180</td>' +
      '<td style="padding:4px;vertical-align:top;"><img src="' + src + '" style="width:60mm;"><br>CSS width:60mm</td>' +
      '<td style="padding:4px;vertical-align:top;"><img src="' + src + '" style="height:50mm;"><br>CSS height:50mm</td>' +
      '</tr></table>';
  });
  return spike_page_('T5: 画像の取得方法・解像度・サイズ指定の比較（拡大して画質を確認）', body);
}

// ------------------------------------------------------------
// T6: 外部URLの <img>（コンバータが取りに行くか）
// ------------------------------------------------------------
function spike_htmlExternalImage_(fileId) {
  return spike_page_(
    'T6: 外部URLの img — 表示されれば外部取得あり（通常は表示されない想定）',
    '<img src="https://drive.google.com/uc?export=view&id=' + fileId + '" width="200">' +
      '<img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" width="200">'
  );
}

// ------------------------------------------------------------
// T7: 現行モデル報告書の構成を table で組んだ試作（画像なし）
// ------------------------------------------------------------
function spike_htmlModelReport_() {
  const H = (t) =>
    '<tr><td colspan="2" style="background:#3b3b3b;color:#fff;font-weight:bold;padding:5px 8px;font-size:11pt;">' + t + '</td></tr>';
  const R = (k, v) =>
    '<tr><th style="width:28%;background:#f4f1ea;border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top;">' + k +
    '</th><td style="border:1px solid #bbb;padding:5px 8px;vertical-align:top;">' + v + '</td></tr>';
  const photoRow = (label) =>
    '<tr><td colspan="2" style="border:1px solid #bbb;padding:6px;">' +
    '<table style="width:100%;border-collapse:collapse;"><tr>' +
    ['左サイド', '右サイド', 'バック']
      .map((p) => '<td style="width:33%;height:55mm;border:1px dashed #aaa;text-align:center;color:#999;">' + label + '<br>' + p + '</td>')
      .join('') +
    '</tr></table></td></tr>';

  const body =
    '<table style="width:100%;border-collapse:collapse;">' +
    '<tr><td colspan="2" style="font-size:18pt;font-weight:bold;padding:4px 0 8px;border-bottom:3px solid #333;">OASIS モデル施術報告書</td></tr>' +
    H('基本情報') + R('モデル名', '検証 花子 様') + R('担当者', '検証 太郎') + R('施術日', '2026-10-02') + R('メニュー', 'ストレート') + R('所要時間', '2時間30分') +
    H('ビフォー写真') + photoRow('ビフォー') +
    H('髪の状態') + R('ダメージレベル', '3') + R('クセの強さ', '強') + R('履歴・特徴', 'ブリーチ1回／縮毛歴あり') + R('希望スタイル・悩み', '広がりを抑えたい') +
    H('使用薬剤') + R('薬剤名', 'サンプル薬剤 T-280') + R('配合比', '1:1') + R('放置時間', '15分＋10分') + R('備考', '') +
    H('アフター写真') + photoRow('アフター') +
    H('振り返り') + R('感想', '仕上がりは良好') + R('質問・疑問点', '放置時間の目安について') + R('チェック担当者', '検証 次郎') +
    '</table>';
  return spike_page_('T7: モデル報告書 table 試作（ファイル名例: 2026-10-02_検証太郎_ストレート_検証花子様.pdf）', body);
}
