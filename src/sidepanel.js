// get last summary user
document.addEventListener("DOMContentLoaded", () => {
  const outputDiv = document.getElementById("output");

  chrome.storage.local.get(["lastSummary"], (result) => {
    if (result.lastSummary) {
      outputDiv.innerHTML = marked.parse(result.lastSummary);
    }
  });
});

// logic style selection citation
document.querySelectorAll(".citation-chip").forEach((button) => {
  button.addEventListener("click", function () {
    document
      .querySelectorAll(".citation-chip")
      .forEach((c) => c.classList.remove("is-active"));
    // Tambahkan class is-active ke tombol yang diklik
    this.classList.add("is-active");
  });
});

//  logic style selection language
document.querySelectorAll(".lang-chip").forEach((button) => {
  button.addEventListener("click", function () {
    document
      .querySelectorAll(".lang-chip")
      .forEach((c) => c.classList.remove("is-active"));
    this.classList.add("is-active");
  });
});

// logic copy teks
const copyBtn = document.getElementById("copyBtn");
if (copyBtn) {
  copyBtn.addEventListener("click", function () {
    const text = document.getElementById("output").innerText || "";
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      // Opsional: Beri feedback visual (contoh ubah ikon sejenak)
      const icon = this.querySelector("i");
      icon.className = "ti ti-check text-green-500";
      setTimeout(() => {
        icon.className = "ti ti-copy";
      }, 2000);
    }
  });
}

// --- Getter Functions
window.getSelectedCitation = () => {
  const c = document.querySelector(".citation-chip.is-active");
  return c ? c.dataset.citation : "IEEE";
};

window.getSelectedLanguage = () => {
  const c = document.querySelector(".lang-chip.is-active");
  return c ? c.innerText.trim() : "Indonesia";
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["provider", "apiKey", "citationStyle"], (res) => {
    if (res.provider) document.getElementById("provider").value = res.provider;
    if (res.apiKey) document.getElementById("apiKey").value = res.apiKey;
    if (res.citationStyle)
      document.getElementById("citationStyle").value = res.citationStyle;
  });
});

// save configuration to chrome.storage
document.getElementById("saveConfig").addEventListener("click", () => {
  const provider = document.getElementById("provider").value;
  const apiKey = document.getElementById("apiKey").value;
  const ind = document.getElementById("savedIndicator");

  // validation input
  if (!apiKey) {
    alert("Masukkan API Key terlebih dahulu.");
    return;
  }
  chrome.storage.local.set({ provider, apiKey }, () => {
    alert("Konfigurasi berhasil disimpan secara aman.");
  });
  ind.classList.remove("hidden");
  ind.classList.add("flex");
  setTimeout(() => {
    ind.classList.add("hidden");
    ind.classList.remove("flex");
  }, 2500);
});

// process summarize
document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const outputDiv = document.getElementById("output");
  const outputTitle = document.getElementById("title");
  const outputAuthor = document.getElementById("authors");
  const outputDate = document.getElementById("date");
  const outputPub = document.getElementById("publisher");
  const outputAbstract = document.getElementById("abstract");
  const outputContent = document.getElementById("content");
  outputDiv.innerText = "Mengekstrak teks halaman...";
  const buttonSum = document.getElementById("summarizeBtn");

  // get tab active
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    outputDiv.innerText = "Error: Tidak ada tab aktif ditemukan.";
    return;
  }

  // send message to content.js
  chrome.tabs.sendMessage(
    tab.id,
    { action: "EXTRACT_TEXT" },
    async (journalData) => {
      if (chrome.runtime.lastError) {
        outputDiv.innerText =
          "Ekstensi belum siap di halaman ini. Silakan REFRESH (F5) halaman jurnal Anda terlebih dahulu.";
        console.log(chrome.runtime.lastError.message);
        return;
      }

      if (!journalData) {
        outputDiv.innerText = "Gagal mengambil teks dari halaman ini.";
        return;
      }

      // delete last summary user
      chrome.storage.local.remove(["lastSummary"]);

      outputDiv.innerText = "Menghubungi AI untuk membuat ringkasan...";

      const provider = document.getElementById("provider").value;
      const { apiKey } = await chrome.storage.local.get(["apiKey"]);
      const citationStyle = window.getSelectedCitation();
      const outputLanguage = window.getSelectedLanguage();

      if (!apiKey) {
        outputDiv.innerText = "Error: API Key belum diisi/disimpan.";
        return;
      }

      try {
        buttonSum.disabled = true;
        buttonSum.innerText = "Sedang memproses...";

        const summary = await callAIProvider(
          provider,
          apiKey,
          journalData,
          citationStyle,
          outputLanguage,
        );
        // response
        outputDiv.innerHTML = marked.parse(summary);

        // save response to local storage
        chrome.storage.local.set({ lastSummary: summary }, () => {
          console.log("Ringkasan terakhir berhasil disimpan!");
        });
      } catch (err) {
        buttonSum.disabled = false;
        buttonSum.innerText = "Ringkas Halaman Ini";
        outputDiv.innerText = `Error API: ${err.message}`;
        console.log(`error API: ${err.message}`);
      } finally {
        buttonSum.disabled = false;
        buttonSum.innerText = "Ringkas Halaman Ini";
      }
    },
  );
});

// fetch api AI
async function callAIProvider(provider, apiKey, data, style, language) {
  const prompt = `Anda adalah asisten akademik. Ringkas teks jurnal berikut dengan fokus pada Masalah Utama, Metodologi, dan Hasil. 

WAJIB tulis seluruh hasil ringkasan Anda menggunakan bahasa: ${language}. 

Di bagian akhir, sediakan teks referensi/sitasi siap pakai dalam format ${style} berdasarkan metadata ini:
- Judul: ${data.title}
- Penulis: ${data.authors}
- Tahun: ${data.date}
- Penerbit: ${data.publisher}

Teks Jurnal:
${data.content.substring(0, 12000)}`;

  if (provider === "gemini") {
    // Endpoint api Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
  }

  if (provider === "openai") {
    const url = `https://api.openai.com/v1/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const result = await response.json();
    return result.choices[0].message.content;
  }

  throw new Error("Provider tidak didukung");
}
