// ---- CONFIG ----
const BACKEND_BASE = "https://donate-frontend.onrender.com"; // <-- put your Render backend URL here
const MPESA_ENDPOINT = `${BACKEND_BASE}/api/payments/mpesa`; // must match your working route

// ---- helpers ----
const $ = (q) => document.querySelector(q);
const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

function normalizePhone(input) {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("07")) return "254" + digits.slice(1);
  if (digits.startsWith("254")) return digits;
  return digits; // fallback: let backend fail with clear error
}

function fmtKES(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
}

function downloadTxt(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- UI wiring ----
const form = $("#mpesa-form");
const statusBox = $("#status");
const receiptBox = $("#receipt");
const donateBtn = $("#donateBtn");
const rAmount = $("#r-amount");
const rPhone = $("#r-phone");
const rCrid = $("#r-crid");
const rMrid = $("#r-mrid");
const rStatus = $("#r-status");
const downloadBtn = $("#downloadReceipt");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusBox.classList.add("show");
  statusBox.textContent = "Processing… check your phone for the M-Pesa prompt.";
  receiptBox.classList.add("hidden");
  donateBtn.disabled = true;

  const rawPhone = $("#phone").value.trim();
  const phone = normalizePhone(rawPhone);
  const amount = $("#amount").value.trim();

  if (!/^(2547\d{8})$/.test(phone)) {
    statusBox.textContent = "❌ Enter a valid Safaricom number (2547XXXXXXXX).";
    donateBtn.disabled = false;
    return;
  }
  if (!amount || Number(amount) < 1) {
    statusBox.textContent = "❌ Enter a valid amount (>= 1).";
    donateBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(MPESA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, amount: Number(amount) })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      statusBox.textContent = "❌ " + (data.error || "M-Pesa request failed");
      donateBtn.disabled = false;
      return;
    }

    // Expect Safaricom payload fields
    const { MerchantRequestID, CheckoutRequestID, ResponseCode, CustomerMessage } = data;

    statusBox.textContent = (ResponseCode === "0")
      ? "✅ STK push sent. Enter your PIN to complete."
      : `⚠️ Response: ${CustomerMessage || "Check your phone"}`;

    rAmount.textContent = fmtKES(amount);
    rPhone.textContent = phone;
    rCrid.textContent = CheckoutRequestID || "—";
    rMrid.textContent = MerchantRequestID || "—";
    rStatus.textContent = "Awaiting PIN / Processing";

    receiptBox.classList.remove("hidden");

    downloadBtn.onclick = () => {
      const lines = [
        "Abura Donation (Provisional)",
        "--------------------------------",
        `Date: ${new Date().toISOString()}`,
        `Amount: ${amount} KES`,
        `Phone: ${phone}`,
        `MerchantRequestID: ${MerchantRequestID || "-"}`,
        `CheckoutRequestID: ${CheckoutRequestID || "-"}`,
        `Status: Awaiting M-Pesa confirmation`,
        "",
        "Note: You will receive an official M-Pesa SMS confirmation upon success."
      ];
      downloadTxt(`abura-donation-${Date.now()}.txt`, lines.join("\n"));
    };
  } catch (err) {
    statusBox.textContent = "❌ Network error. Please try again.";
  } finally {
    donateBtn.disabled = false;
  }
});

// simple tabs (PayPal disabled for now)
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("disabled")) return;
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
