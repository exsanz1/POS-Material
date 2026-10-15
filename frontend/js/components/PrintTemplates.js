/**
 * PrintTemplates Module — POS Document Printing & Preview
 * 1. Struk Thermal 80mm (Nota Kasir)
 * 2. Faktur Penjualan Continuous Form (Dot Matrix Landscape / Setengah A4)
 * 3. Surat Jalan Gudang/Supir Continuous Form (Tanpa Kolom Harga / Total Uang)
 * Pure White Minimalist, high contrast monospace, zero gray backgrounds for dot matrix carbon imprinting.
 */

export function terbilang(n) {
  n = Math.round(Number(n) || 0);
  if (n === 0) return "Nol Rupiah";

  const satuan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima",
    "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
  ];

  function bilang(x) {
    if (x < 12) return satuan[x];
    if (x < 20) return bilang(x - 10) + " Belas";
    if (x < 100) return bilang(Math.floor(x / 10)) + " Puluh " + bilang(x % 10);
    if (x < 200) return "Seratus " + bilang(x - 100);
    if (x < 1000) return bilang(Math.floor(x / 100)) + " Ratus " + bilang(x % 100);
    if (x < 2000) return "Seribu " + bilang(x - 1000);
    if (x < 1000000) return bilang(Math.floor(x / 1000)) + " Ribu " + bilang(x % 1000);
    if (x < 1000000000) return bilang(Math.floor(x / 1000000)) + " Juta " + bilang(x % 1000000);
    if (x < 1000000000000) return bilang(Math.floor(x / 1000000000)) + " Miliar " + bilang(x % 1000000000);
    return bilang(Math.floor(x / 1000000000000)) + " Triliun " + bilang(x % 1000000000000);
  }

  const result = bilang(n).replace(/\s+/g, " ").trim();
  return `${result} Rupiah`;
}

export class PrintTemplates {
  /**
   * 1. Struk Thermal 80mm Layout (Standard Cashier Receipt)
   */
  static renderThermalReceipt(detail) {
    const cust = detail.customer || { name: "Umum / Walk-in", phone: "-", address: "-" };
    const items = detail.items || [];
    const change = detail.change_amount || Math.max(0, detail.paid_amount - detail.total_amount);
    const sisa = Math.max(0, detail.total_amount - detail.paid_amount);

    return `
      <div class="thermal-receipt font-mono text-[11px] leading-tight text-black bg-white p-2 w-[76mm] mx-auto select-none">
        <!-- Store Header -->
        <div class="text-center pb-2 border-b border-dashed border-black">
          <div class="text-xs font-bold uppercase tracking-wider">TOKO BANGUNAN & MATERIAL</div>
          <div class="text-sm font-bold uppercase tracking-tight">SUMBER REJEKI ABADI</div>
          <div class="text-[10px]">Jl. Gatot Subroto No. 88, Denpasar</div>
          <div class="text-[10px]">Telp: (0361) 234567 • WA: 0812-3456-7890</div>
        </div>

        <!-- Invoice Meta -->
        <div class="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
          <div class="flex justify-between">
            <span>No. Nota:</span>
            <span class="font-bold">${detail.invoice_number}</span>
          </div>
          <div class="flex justify-between">
            <span>Tanggal:</span>
            <span>${detail.created_at}</span>
          </div>
          <div class="flex justify-between">
            <span>Kasir:</span>
            <span>Kasir 01</span>
          </div>
          <div class="flex justify-between">
            <span>Pelanggan:</span>
            <span class="font-semibold">${cust.name}</span>
          </div>
          <div class="flex justify-between">
            <span>Status Bayar:</span>
            <span class="font-bold uppercase">${detail.payment_status}</span>
          </div>
          ${
            detail.due_date
              ? `
            <div class="flex justify-between text-rose-800 font-semibold">
              <span>Jatuh Tempo:</span>
              <span>${detail.due_date}</span>
            </div>
          `
              : ""
          }
          <div class="flex justify-between">
            <span>Pengiriman:</span>
            <span class="uppercase">${detail.delivery_status === "taken" ? "Bawa Langsung" : detail.delivery_status === "partial" ? "Kirim Sebagian" : "Kirim Armada"}</span>
          </div>
        </div>

        <!-- Itemized List -->
        <div class="py-2 border-b border-dashed border-black space-y-1.5">
          ${items
            .map((item) => {
              const unitPrice = item.unit_price.toLocaleString("id-ID");
              const subtotal = item.subtotal.toLocaleString("id-ID");
              const discountText = item.discount > 0 ? ` (Disc: Rp ${item.discount.toLocaleString("id-ID")})` : "";
              return `
              <div>
                <div class="font-semibold text-black">${item.product_name}</div>
                <div class="flex justify-between text-[10px] text-black">
                  <span>${item.quantity} ${item.unit_name} x Rp ${unitPrice}${discountText}</span>
                  <span class="font-semibold">Rp ${subtotal}</span>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>

        <!-- Financial Totals -->
        <div class="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
          <div class="flex justify-between text-xs font-bold">
            <span>TOTAL BELANJA:</span>
            <span>Rp ${detail.total_amount.toLocaleString("id-ID")}</span>
          </div>
          <div class="flex justify-between">
            <span>Total Bayar:</span>
            <span>Rp ${detail.paid_amount.toLocaleString("id-ID")}</span>
          </div>
          ${
            change > 0
              ? `
            <div class="flex justify-between font-semibold">
              <span>Kembalian:</span>
              <span>Rp ${change.toLocaleString("id-ID")}</span>
            </div>
          `
              : ""
          }
          ${
            sisa > 0
              ? `
            <div class="flex justify-between font-bold text-rose-800">
              <span>SISA PIUTANG / TEMPO:</span>
              <span>Rp ${sisa.toLocaleString("id-ID")}</span>
            </div>
          `
              : ""
          }
        </div>

        <!-- Footer / Policy -->
        <div class="text-center pt-2 text-[9px] leading-tight space-y-1">
          <div>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian sebelumnya.</div>
          <div class="font-bold pt-1">*** TERIMA KASIH ATAS KUNJUNGAN ANDA ***</div>
        </div>
      </div>
    `;
  }

  /**
   * 2. Faktur Penjualan Continuous Form Layout (Dot Matrix Half-A4 / 9.5" x 5.5" Landscape)
   * High-contrast monospace, strictly zero gray background fills, crisp black borders.
   */
  static renderDotMatrixInvoice(detail) {
    const cust = detail.customer || { name: "Umum / Walk-in", phone: "-", address: "-" };
    const items = detail.items || [];
    const terbilangText = detail.terbilang || terbilang(detail.total_amount);
    const sisa = Math.max(0, detail.total_amount - detail.paid_amount);

    return `
      <div class="dotmatrix-page font-mono text-[11px] text-black bg-white p-4 w-[230mm] min-h-[135mm] mx-auto border border-black select-none leading-tight">
        <!-- Top Header: Store & Document Info -->
        <div class="flex justify-between items-start pb-2 border-b-2 border-black">
          <div>
            <div class="font-bold text-sm tracking-wider uppercase">TOKO BANGUNAN & MATERIAL SUMBER REJEKI</div>
            <div class="text-[10px]">Jl. Gatot Subroto No. 88, Denpasar - Bali | Telp: (0361) 234567, 234568</div>
            <div class="text-[10px]">NPWP: 01.234.567.8-901.000 | Email: sumberrejeki.bali@gmail.com</div>
          </div>
          <div class="text-right">
            <div class="text-base font-bold tracking-widest uppercase border-b border-black pb-0.5">FAKTUR PENJUALAN</div>
            <div class="text-[10px] mt-1 space-y-0.5">
              <div>No. Faktur : <strong>${detail.invoice_number}</strong></div>
              <div>Tanggal    : ${detail.created_at}</div>
              <div>Kasir      : Kasir 01</div>
            </div>
          </div>
        </div>

        <!-- Customer & Payment Term Row -->
        <div class="grid grid-cols-2 gap-4 py-2 border-b border-black text-[10px]">
          <div>
            <div class="font-bold">KEPADA YTH:</div>
            <div class="font-bold text-xs uppercase">${cust.name}</div>
            <div>Alamat : ${cust.address || "-"}</div>
            <div>Telp   : ${cust.phone || "-"}</div>
          </div>
          <div class="text-right space-y-0.5">
            <div>Syarat Bayar : <strong class="uppercase">${detail.payment_status === "paid" ? "LUNAS (TUNAI/TRANSFER)" : detail.payment_status.toUpperCase()}</strong></div>
            ${detail.due_date ? `<div>Jatuh Tempo  : <strong>${detail.due_date}</strong></div>` : `<div>Jatuh Tempo  : -</div>`}
            <div>Pengiriman   : <strong class="uppercase">${detail.delivery_status === "taken" ? "Bawa Langsung" : detail.delivery_status === "partial" ? "Kirim Sebagian" : "Kirim Armada"}</strong></div>
          </div>
        </div>

        <!-- Main Items Table -->
        <div class="mt-2">
          <table class="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr class="border-b border-black text-black">
                <th class="border-r border-black p-1 w-8 text-center">NO</th>
                <th class="border-r border-black p-1 w-28 text-left">KODE SKU</th>
                <th class="border-r border-black p-1 text-left">NAMA BARANG / DESKRIPSI</th>
                <th class="border-r border-black p-1 w-14 text-right">QTY</th>
                <th class="border-r border-black p-1 w-16 text-center">SATUAN</th>
                <th class="border-r border-black p-1 w-24 text-right">HARGA (RP)</th>
                <th class="border-r border-black p-1 w-16 text-right">POT.</th>
                <th class="p-1 w-28 text-right">SUBTOTAL (RP)</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((item, idx) => {
                  return `
                  <tr class="border-b border-black">
                    <td class="border-r border-black p-1 text-center font-mono">${idx + 1}</td>
                    <td class="border-r border-black p-1 font-mono">${item.sku}</td>
                    <td class="border-r border-black p-1 font-semibold uppercase">${item.product_name}</td>
                    <td class="border-r border-black p-1 text-right font-mono">${item.quantity.toLocaleString("id-ID")}</td>
                    <td class="border-r border-black p-1 text-center font-mono">${item.unit_name}</td>
                    <td class="border-r border-black p-1 text-right font-mono">${item.unit_price.toLocaleString("id-ID")}</td>
                    <td class="border-r border-black p-1 text-right font-mono">${item.discount > 0 ? item.discount.toLocaleString("id-ID") : "-"}</td>
                    <td class="p-1 text-right font-mono font-semibold">${item.subtotal.toLocaleString("id-ID")}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Summary & Signatures -->
        <div class="grid grid-cols-12 gap-2 mt-2 pt-1 text-[10px]">
          <!-- Left: Terbilang & Signatures -->
          <div class="col-span-7 space-y-3">
            <div class="border border-black p-1.5 italic font-semibold">
              Terbilang: ${terbilangText}
            </div>

            <!-- Signatures Box -->
            <div class="grid grid-cols-2 gap-4 text-center pt-1">
              <div>
                <div>Tanda Terima / Pelanggan,</div>
                <div class="h-12"></div>
                <div class="border-t border-black pt-0.5 font-bold uppercase">( ${cust.name.substring(0, 20)} )</div>
              </div>
              <div>
                <div>Hormat Kami / Kasir,</div>
                <div class="h-12"></div>
                <div class="border-t border-black pt-0.5 font-bold uppercase">( KASIR TOKO )</div>
              </div>
            </div>
          </div>

          <!-- Right: Total Amounts Box -->
          <div class="col-span-5 space-y-1 border border-black p-2 font-mono text-[11px]">
            <div class="flex justify-between">
              <span>TOTAL HARGA:</span>
              <span class="font-bold">Rp ${detail.total_amount.toLocaleString("id-ID")}</span>
            </div>
            <div class="flex justify-between">
              <span>UANG MUKA / BAYAR:</span>
              <span>Rp ${detail.paid_amount.toLocaleString("id-ID")}</span>
            </div>
            <div class="border-t border-black pt-1 flex justify-between font-bold text-xs">
              <span>SISA PIUTANG:</span>
              <span>Rp ${sisa.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 3. Surat Jalan Gudang/Supir Continuous Form (Dot Matrix Half-A4 / 9.5" x 5.5" Landscape)
   * MANDATORY: STRICTLY HIDES ALL PRICES, DISCOUNT, AND MONETARY TOTALS!
   * Only displays SKU, Description, Qty to Deliver, Delivery Address, Driver, and 4 Signatures.
   */
  static renderDotMatrixDeliveryOrder(detail, doIndex = 0) {
    const cust = detail.customer || { name: "Umum / Walk-in", phone: "-", address: "-" };
    const deliveryOrders = detail.delivery_orders || [];
    const activeDO = deliveryOrders[doIndex] || deliveryOrders[0] || {
      do_number: `DO-${detail.invoice_number.replace("INV-", "")}`,
      delivery_address: cust.address,
      driver_name: "Armada Toko",
      vehicle_info: "-",
      items: detail.items || [],
      notes: detail.notes,
    };

    const doItems = activeDO.items && activeDO.items.length > 0 ? activeDO.items : detail.items || [];
    const destinationAddress = activeDO.delivery_address && activeDO.delivery_address !== "-" ? activeDO.delivery_address : (cust.address || "Diambil Sendiri di Gudang");

    return `
      <div class="dotmatrix-page font-mono text-[11px] text-black bg-white p-4 w-[230mm] min-h-[135mm] mx-auto border border-black select-none leading-tight">
        <!-- Top Header: Store & Document Info -->
        <div class="flex justify-between items-start pb-2 border-b-2 border-black">
          <div>
            <div class="font-bold text-sm tracking-wider uppercase">TOKO BANGUNAN & MATERIAL SUMBER REJEKI</div>
            <div class="text-[10px]">BAGIAN LOGISTIK, GUDANG & PENGIRIMAN ARMADA</div>
            <div class="text-[10px]">Jl. Gatot Subroto No. 88, Denpasar - Bali | Telp Dispatch: (0361) 234567</div>
          </div>
          <div class="text-right">
            <div class="text-base font-bold tracking-widest uppercase border-b border-black pb-0.5">SURAT JALAN PENGIRIMAN</div>
            <div class="text-[10px] mt-1 space-y-0.5">
              <div>No. Surat Jalan : <strong>${activeDO.do_number}</strong></div>
              <div>Ref. No. Faktur : <strong>${detail.invoice_number}</strong></div>
              <div>Tanggal Kirim   : ${detail.created_at}</div>
            </div>
          </div>
        </div>

        <!-- Delivery Destination & Driver Meta -->
        <div class="grid grid-cols-2 gap-4 py-2 border-b border-black text-[10px]">
          <div>
            <div class="font-bold text-slate-900">ALAMAT TUJUAN PENGIRIMAN:</div>
            <div class="font-bold text-xs uppercase">${cust.name}</div>
            <div class="font-semibold text-black">${destinationAddress}</div>
            <div>Kontak / Telp : ${cust.phone || "-"}</div>
          </div>
          <div class="text-right space-y-0.5">
            <div>Sopir / Pengantar  : <strong class="uppercase font-bold">${activeDO.driver_name || "Sopir Gudang"}</strong></div>
            <div>Kendaraan / Plat No : <strong class="font-mono uppercase">${activeDO.vehicle_info || "-"}</strong></div>
            <div>Catatan Lapangan   : ${activeDO.notes || detail.notes || "-"}</div>
          </div>
        </div>

        <!-- Strict Non-Price Items Table -->
        <div class="mt-2">
          <table class="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr class="border-b border-black text-black">
                <th class="border-r border-black p-1 w-8 text-center">NO</th>
                <th class="border-r border-black p-1 w-28 text-left">KODE SKU</th>
                <th class="border-r border-black p-1 text-left">NAMA BARANG & SPESIFIKASI</th>
                <th class="border-r border-black p-1 w-24 text-center font-bold">QTY KIRIM</th>
                <th class="border-r border-black p-1 w-20 text-center">SATUAN</th>
                <th class="border-r border-black p-1 w-28 text-center">CEK FISIK GUDANG</th>
                <th class="p-1 w-36 text-left">KETERANGAN / LOKASI</th>
              </tr>
            </thead>
            <tbody>
              ${doItems
                .map((item, idx) => {
                  return `
                  <tr class="border-b border-black">
                    <td class="border-r border-black p-1.5 text-center font-mono">${idx + 1}</td>
                    <td class="border-r border-black p-1.5 font-mono">${item.sku}</td>
                    <td class="border-r border-black p-1.5 font-semibold uppercase">${item.product_name}</td>
                    <td class="border-r border-black p-1.5 text-center font-mono font-bold text-xs">${item.quantity.toLocaleString("id-ID")}</td>
                    <td class="border-r border-black p-1.5 text-center font-mono">${item.unit_name}</td>
                    <td class="border-r border-black p-1.5 text-center font-mono">[  ] SESUAI</td>
                    <td class="p-1.5 font-mono text-[9px] text-black">Rak: ${item.rack_location || "Gudang Utama"}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Accountability Signatures (4 Columns) -->
        <div class="mt-4 pt-1">
          <div class="text-[9px] italic mb-2 text-black">
            * Periksa kuantitas dan kondisi fisik barang bersama pengantar saat serah terima. Komplain kerusakan/kekurangan barang setelah surat jalan ditandatangani tidak dapat dilayani.
          </div>
          <div class="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div>
              <div>Petugas Gudang,</div>
              <div class="h-12"></div>
              <div class="border-t border-black pt-0.5 font-bold uppercase">( GUDANG )</div>
            </div>
            <div>
              <div>Sopir / Ekspedisi,</div>
              <div class="h-12"></div>
              <div class="border-t border-black pt-0.5 font-bold uppercase">( ${activeDO.driver_name || "SOPIR"} )</div>
            </div>
            <div>
              <div>Satpam / Checker,</div>
              <div class="h-12"></div>
              <div class="border-t border-black pt-0.5 font-bold uppercase">( SATPAM )</div>
            </div>
            <div>
              <div>Penerima Barang,</div>
              <div class="h-12"></div>
              <div class="border-t border-black pt-0.5 font-bold uppercase">( ${cust.name.substring(0, 15)} )</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Directly print any HTML string via a sandboxed invisible iframe
   */
  static printHtml(htmlContent, docType = "thermal") {
    let iframe = document.getElementById("print-sandbox-iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-sandbox-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    const pageCss =
      docType === "thermal"
        ? `@page { size: 80mm auto; margin: 2mm; }`
        : `@page { size: 241mm 140mm landscape; margin: 5mm; }`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Dokumen POS</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${pageCss}
            body {
              background: #FFFFFF !important;
              color: #000000 !important;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              background-color: transparent !important;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  }

  /**
   * Interactive Print Preview Modal with Document Switcher
   */
  static showPrintPreviewModal(detail, initialDoc = "thermal") {
    let currentDoc = initialDoc; // 'thermal', 'invoice', 'surat_jalan'

    const modalId = "print-preview-modal-container";
    let modalContainer = document.getElementById(modalId);
    if (!modalContainer) {
      modalContainer = document.createElement("div");
      modalContainer.id = modalId;
      document.body.appendChild(modalContainer);
    }

    const renderDocContent = (type) => {
      if (type === "invoice") {
        return PrintTemplates.renderDotMatrixInvoice(detail);
      }
      if (type === "surat_jalan") {
        return PrintTemplates.renderDotMatrixDeliveryOrder(detail, 0);
      }
      return PrintTemplates.renderThermalReceipt(detail);
    };

    const updateView = () => {
      modalContainer.innerHTML = `
        <div id="print-modal-backdrop" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 select-none">
          <div class="w-full max-w-4xl bg-white rounded-md border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden max-h-[92vh]">
            <!-- Header with Document Switcher Tabs -->
            <div class="px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Preview Cetak Dokumen:</span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-switch-print-doc="thermal"
                    class="h-7 px-3 text-xs rounded border transition-colors ${
                      currentDoc === "thermal"
                        ? "bg-slate-900 text-white font-semibold border-slate-900"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-[#E2E8F0]"
                    }"
                  >
                    Struk Thermal (80mm)
                  </button>
                  <button
                    type="button"
                    data-switch-print-doc="invoice"
                    class="h-7 px-3 text-xs rounded border transition-colors ${
                      currentDoc === "invoice"
                        ? "bg-slate-900 text-white font-semibold border-slate-900"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-[#E2E8F0]"
                    }"
                  >
                    Faktur Penjualan (Dot Matrix)
                  </button>
                  <button
                    type="button"
                    data-switch-print-doc="surat_jalan"
                    class="h-7 px-3 text-xs rounded border transition-colors ${
                      currentDoc === "surat_jalan"
                        ? "bg-slate-900 text-white font-semibold border-slate-900"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-[#E2E8F0]"
                    }"
                  >
                    Surat Jalan Gudang/Supir (Tanpa Harga)
                  </button>
                </div>
              </div>

              <button type="button" id="btn-close-print-modal" class="text-slate-400 hover:text-slate-700 text-base font-bold">
                ✕
              </button>
            </div>

            <!-- Preview Body (Scrollable canvas) -->
            <div class="p-6 bg-slate-100/70 overflow-y-auto flex-1 flex justify-center">
              <div class="bg-white border border-[#CBD5E1] shadow-sm p-4">
                ${renderDocContent(currentDoc)}
              </div>
            </div>

            <!-- Footer Action Bar -->
            <div class="px-5 py-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between">
              <div class="text-xs text-slate-500 font-mono">
                ${
                  currentDoc === "thermal"
                    ? "Format: Lebar 80mm roll thermal nota"
                    : currentDoc === "invoice"
                    ? "Format: Continuous form 9.5\" x 5.5\" landscape (Dot Matrix Epson LX/LQ)"
                    : "Format: Continuous form surat jalan (Semua kolom harga otomatis disembunyikan)"
                }
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-dismiss-print-modal"
                  class="h-8 px-4 border border-[#E2E8F0] rounded-[5px] bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  id="btn-execute-print"
                  class="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 shadow-sm"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>CETAK DOKUMEN INI [Enter]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Attach switcher clicks
      modalContainer.querySelectorAll("[data-switch-print-doc]").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentDoc = btn.getAttribute("data-switch-print-doc");
          updateView();
        });
      });

      // Close handlers
      modalContainer.querySelector("#btn-close-print-modal")?.addEventListener("click", () => {
        modalContainer.innerHTML = "";
      });
      modalContainer.querySelector("#btn-dismiss-print-modal")?.addEventListener("click", () => {
        modalContainer.innerHTML = "";
      });

      // Execute print
      modalContainer.querySelector("#btn-execute-print")?.addEventListener("click", () => {
        const rendered = renderDocContent(currentDoc);
        PrintTemplates.printHtml(rendered, currentDoc === "thermal" ? "thermal" : "dotmatrix");
      });
    };

    updateView();
  }
}
