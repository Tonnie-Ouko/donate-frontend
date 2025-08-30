// app.js
document.addEventListener("DOMContentLoaded", () => {
  const mpesaForm = document.getElementById("mpesa-form");
  const statusEl = document.getElementById("status");
  const confirmBtn = document.getElementById("confirmBtn");
  const receipt = document.getElementById("receipt");
  const donateBtn = document.getElementById("donateBtn");
  const paypalBtn = document.getElementById("paypalBtn");
  const cardBtn = document.getElementById("cardBtn");

  let currentCheckoutId = null;

  /* ------------------ Helpers ------------------ */
  function showStatus(msg, type = "pending") {
    statusEl.textContent = msg;
    statusEl.className = "status " + type;
  }

  function resetUI() {
    statusEl.textContent = "";
    statusEl.className = "status";
    receipt.classList.add("hidden");
    confirmBtn.classList.add("hidden");
    currentCheckoutId = null;
  }

  /* ------------------ M-Pesa Flow ------------------ */
  mpesaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetUI();

    const phone = document.getElementById("phone").value.trim();
    const amount = document.getElementById("amount").value.trim();

    if (!phone || !amount) return showStatus("Please enter phone and amount", "error");

    donateBtn.disabled = true;
    showStatus("Sending STK push to your phone...", "pending");

    try {
      const res = await fetch("/api/payments/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to start payment");

      currentCheckoutId = data.checkoutId;
      confirmBtn.classList.remove("hidden");
      showStatus("STK push sent. Please check your phone.", "pending");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      donateBtn.disabled = false;
    }
  });

  confirmBtn.addEventListener("click", async () => {
    if (!currentCheckoutId) return;
    showStatus("Checking payment status...", "pending");

    try {
      const res = await fetch(`/api/payments/mpesa/status/${currentCheckoutId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Status check failed");

      if (data.status === "SUCCESS") {
        showStatus("Payment successful 🎉", "success");
        showReceipt(data);
      } else if (data.status === "FAILED") {
        showStatus("Payment failed ❌", "error");
      } else {
        showStatus("Payment still pending...", "pending");
      }
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  function showReceipt(d) {
    document.getElementById("r-amount").textContent = d.amount + " KES";
    document.getElementById("r-phone").textContent = d.phone || "—";
    document.getElementById("r-status").textContent = d.status;
    document.getElementById("r-receipt").textContent = d.result?.Body?.stkCallback?.CallbackMetadata?.Item?.find(i => i.Name === "MpesaReceiptNumber")?.Value || "—";

    if (d.status !== "SUCCESS") {
      document.querySelectorAll(".hide-if-fail").forEach(el => el.style.display = "none");
    }

    receipt.classList.remove("hidden");
  }

  /* ------------------ PayPal Flow (placeholder) ------------------ */
  paypalBtn.addEventListener("click", async () => {
    resetUI();
    showStatus("PayPal donations coming soon...", "pending");

    try {
      const res = await fetch("/api/payments/paypal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PayPal unavailable");
      showStatus(data.message || "PayPal placeholder", "success");
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  /* ------------------ Card Flow (placeholder) ------------------ */
  cardBtn.addEventListener("click", async () => {
    resetUI();
    showStatus("Card donations coming soon...", "pending");

    try {
      const res = await fetch("/api/payments/card", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Card unavailable");
      showStatus(data.message || "Card placeholder", "success");
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  /* ------------------ Receipt Actions ------------------ */
  document.getElementById("downloadReceipt").addEventListener("click", () => {
    const txt = `
Abura Foundation Donation Receipt
Amount: ${document.getElementById("r-amount").textContent}
Phone: ${document.getElementById("r-phone").textContent}
Status: ${document.getElementById("r-status").textContent}
Receipt No: ${document.getElementById("r-receipt").textContent}
    `.trim();
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "receipt.txt";
    a.click();
  });

  document.getElementById("printReceipt").addEventListener("click", () => {
    window.print();
  });
});
