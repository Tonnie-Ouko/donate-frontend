// app.js
document.addEventListener("DOMContentLoaded", () => {
  const mpesaForm = document.getElementById("mpesa-form");
  const paypalForm = document.getElementById("paypal-form");
  const cardForm = document.getElementById("card-form");

  const mpesaBtn = document.getElementById("mpesaBtn");
  const paypalBtn = document.getElementById("paypalBtn");
  const cardBtn = document.getElementById("cardBtn");

  const statusEl = document.getElementById("status");
  const confirmBtn = document.getElementById("confirmBtn");
  const receipt = document.getElementById("receipt");
  const donateBtn = document.getElementById("donateBtn");

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

  function switchForm(formId) {
    [mpesaForm, paypalForm, cardForm].forEach(f => f.classList.add("hidden"));
    document.getElementById(formId).classList.remove("hidden");
    resetUI();
  }

  /* ------------------ Switch Buttons ------------------ */
  mpesaBtn.addEventListener("click", () => switchForm("mpesa-form"));
  paypalBtn.addEventListener("click", () => switchForm("paypal-form"));
  cardBtn.addEventListener("click", () => switchForm("card-form"));

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
      const res = await fetch("https://donate-backend-0lu0.onrender.com/api/payments/mpesa", {
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
      // 1️⃣ First: Safaricom live status
      const liveRes = await fetch(
        `https://donate-backend-0lu0.onrender.com/api/payments/mpesa/status/live/${currentCheckoutId}`
      );
      const liveData = await liveRes.json();

      if (liveRes.ok && liveData.status) {
        if (liveData.status === "SUCCESS") {
          showStatus("Payment successful 🎉", "success");
          return showReceipt(liveData);
        } else if (liveData.status === "FAILED") {
          return showStatus("Payment failed ❌", "error");
        }
      }

      // 2️⃣ Fallback: DB check
      const dbRes = await fetch(
        `https://donate-backend-0lu0.onrender.com/api/payments/mpesa/status/${currentCheckoutId}`
      );
      const dbData = await dbRes.json();

      if (!dbRes.ok) throw new Error(dbData.error || "Status check failed");

      if (dbData.status === "SUCCESS") {
        showStatus("Payment successful 🎉 (from DB)", "success");
        showReceipt(dbData);
      } else if (dbData.status === "FAILED") {
        showStatus("Payment failed ❌ (from DB)", "error");
      } else {
        showStatus("Payment still pending...", "pending");
      }
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  /* ------------------ PayPal Flow ------------------ */
  if (document.getElementById("paypal-button-container")) {
    paypal.Buttons({
      createOrder: (data, actions) => {
        const amount = document.getElementById("paypalAmount").value.trim();
        if (!amount) {
          showStatus("Enter an amount for PayPal donation", "error");
          return;
        }
        return actions.order.create({
          purchase_units: [{ amount: { value: amount } }],
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          const donation = {
            amount: details.purchase_units[0].amount.value,
            email: details.payer.email_address,
            status: "SUCCESS",
            receiptId: details.id,
          };
          showStatus("PayPal payment successful 🎉", "success");
          showReceipt(donation);
        });
      },
      onError: (err) => {
        showStatus("PayPal error: " + err.message, "error");
      },
    }).render("#paypal-button-container");
  }

  /* ------------------ Card Flow (placeholder) ------------------ */
  cardBtn.addEventListener("click", () => {
    switchForm("card-form");
    showStatus("Card donations coming soon...", "pending");
  });

  /* ------------------ Receipt ------------------ */
  function showReceipt(d) {
    document.getElementById("r-amount").textContent = (d.amount || "—") + (d.currency || " KES");
    document.getElementById("r-phone").textContent = d.phone || d.email || "—";
    document.getElementById("r-status").textContent = d.status;
    document.getElementById("r-receipt").textContent =
      d.receiptId ||
      d.result?.Body?.stkCallback?.CallbackMetadata?.Item?.find(i => i.Name === "MpesaReceiptNumber")?.Value ||
      "—";

    if (d.status !== "SUCCESS") {
      document.querySelectorAll(".hide-if-fail").forEach(el => (el.style.display = "none"));
    }
    receipt.classList.remove("hidden");
  }

  document.getElementById("downloadReceipt").addEventListener("click", () => {
    const txt = `
Abura Foundation Donation Receipt
Amount: ${document.getElementById("r-amount").textContent}
Phone/Email: ${document.getElementById("r-phone").textContent}
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
