// app.js
(() => {
  const apiBase = "https://donate-backend-0lu0.onrender.com"; // change if using custom domain

  const form = document.getElementById("mpesa-form");
  const statusDiv = document.getElementById("status");
  const confirmBtn = document.getElementById("confirmBtn");
  const donateBtn = document.getElementById("donateBtn");

  const receipt = document.getElementById("receipt");
  const receiptTitle = document.getElementById("receipt-title");
  const receiptMsg = document.getElementById("receipt-msg");
  const rAmount = document.getElementById("r-amount");
  const rPhone = document.getElementById("r-phone");
  const rStatus = document.getElementById("r-status");
  const rReceipt = document.getElementById("r-receipt");
  const downloadBtn = document.getElementById("downloadReceipt");
  const printBtn = document.getElementById("printReceipt");

  let currentCheckoutId = null;
  let currentPhone = null;
  let currentAmount = null;

  function setStatus(text, cls = "") {
    statusDiv.textContent = text;
    statusDiv.className = `status ${cls}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("phone").value.trim();
    const amount = document.getElementById("amount").value.trim();

    setStatus("⏳ Sending STK push, please check your phone…", "pending");
    donateBtn.disabled = true;

    try {
      const res = await fetch(`${apiBase}/api/payments/mpesa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount })
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (!data.CheckoutRequestID) throw new Error("No CheckoutRequestID");

      currentCheckoutId = data.CheckoutRequestID;
      currentPhone = phone;
      currentAmount = amount;

      setStatus("📲 STK push sent. Enter your M-Pesa PIN, then click ‘Confirm Donation’.", "success");
      confirmBtn.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      setStatus("❌ Could not initiate donation. Please try again.", "error");
      donateBtn.disabled = false;
    }
  });

  confirmBtn.addEventListener("click", async () => {
    if (!currentCheckoutId) return;
    setStatus("🔎 Checking payment status…", "pending");
    confirmBtn.disabled = true;

    try {
      const res = await fetch(`${apiBase}/api/payments/mpesa/status/${currentCheckoutId}`);
      const data = await res.json();

      // Fill common fields
      rAmount.textContent = currentAmount || (data.amount ?? "—");
      rPhone.textContent = currentPhone || (data.phone ?? "—");
      rStatus.textContent = data.status ?? "UNKNOWN";

      // Try pull receipt from callback metadata
      let receiptNo = "—";
      if (data.result?.CallbackMetadata?.Item) {
        const found = data.result.CallbackMetadata.Item.find(i => i.Name === "MpesaReceiptNumber");
        if (found) receiptNo = found.Value;
      }
      rReceipt.textContent = receiptNo;

      if (data.status === "SUCCESS") {
        receiptTitle.textContent = "✅ Thank you for your Donation";
        receiptMsg.textContent = "Your support helps us continue our mission.";
        setStatus("✅ Donation successful!", "success");
        showReceipt(true);
      } else if (data.status === "FAILED") {
        receiptTitle.textContent = "❌ Donation Failed";
        receiptMsg.textContent = "Thank you for trying to donate to our cause. Please try again.";
        setStatus("❌ Donation failed.", "error");
        showReceipt(false);
      } else if (data.status === "PENDING") {
        setStatus("⌛ Still processing. Try confirming again in a few seconds.", "pending");
        confirmBtn.disabled = false;
      } else {
        setStatus("🤔 Not found yet. If you just paid, wait a moment and try again.", "pending");
        confirmBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Could not confirm payment. Try again.", "error");
      confirmBtn.disabled = false;
    }
  });

  function showReceipt(success) {
    // hide receipt number line if failed
    [...document.querySelectorAll(".hide-if-fail")].forEach(el => {
      el.style.display = success ? "" : "none";
    });
    receipt.classList.remove("hidden");
    donateBtn.disabled = false;
    confirmBtn.disabled = false;
  }

  // Download receipt
  downloadBtn.addEventListener("click", () => {
    const lines = [
      "Abura Donation Receipt",
      "----------------------------------",
      `Phone: ${rPhone.textContent}`,
      `Amount: KES ${rAmount.textContent}`,
      `Status: ${rStatus.textContent}`,
      `Receipt No: ${rReceipt.textContent}`,
      "",
      "Thank you for your Donation.",
      "Abura.org | info@abura.org"
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "abura_receipt.txt";
    a.click();
  });

  const paypalBtn = document.getElementById("paypalBtn");
  paypalBtn.addEventListener("click", () => {
    alert("PayPal option is coming soon!");
  });

  const cardBtn = document.getElementById("cardBtn");
  cardBtn.addEventListener("click", () => {
  alert("Card option is coming soon!");
  });


  
  // Print receipt
  printBtn.addEventListener("click", () => window.print());
})();
