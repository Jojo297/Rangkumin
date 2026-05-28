document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["provider", "apiKey", "citationStyle"], (res) => {
    if (res.provider) document.getElementById("provider").value = res.provider;
    if (res.apiKey) document.getElementById("apiKey").value = res.apiKey;
    if (res.citationStyle)
      document.getElementById("citationStyle").value = res.citationStyle;
  });
});

// 2. Simpan konfigurasi ke chrome.storage
document.getElementById("saveConfig").addEventListener("click", () => {
  const provider = document.getElementById("provider").value;
  const apiKey = document.getElementById("apiKey").value;

  // validation input
  if (!apiKey) {
    alert("Masukkan API Key terlebih dahulu.");
    return;
  }
  chrome.storage.local.set({ provider, apiKey }, () => {
    alert("Konfigurasi berhasil disimpan secara aman.");
  });
});

// 3. Proses Ringkas Halaman
document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const outputDiv = document.getElementById("output");
  const outputTitle = document.getElementById("title");
  const outputAuthor = document.getElementById("authors");
  const outputDate = document.getElementById("date");
  const outputPub = document.getElementById("publisher");
  const outputAbstract = document.getElementById("abstract");
  const outputContent = document.getElementById("content");
  outputDiv.innerText = "Mengekstrak teks halaman...";

  // Ambil tab yang sedang aktif
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    outputDiv.innerText = "Error: Tidak ada tab aktif ditemukan.";
    return;
  }

  // LANGSUNG kirim pesan ke content.js yang sudah standby di halaman web
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

      outputDiv.innerText = "Menghubungi AI untuk membuat ringkasan...";

      const provider = document.getElementById("provider").value;
      const citationStyle = document.getElementById("citationStyle").value;
      const { apiKey } = await chrome.storage.local.get(["apiKey"]);

      if (!apiKey) {
        outputDiv.innerText = "Error: API Key belum diisi/disimpan.";
        return;
      }

      try {
        //   const summary = await callAIProvider(provider, apiKey, journalData, citationStyle);
        ((outputTitle.innerText = journalData.title),
          (outputAuthor.innerText = journalData.authors),
          (outputDate.innerText = journalData.date),
          (outputPub.innerText = journalData.publisher),
          (outputAbstract.innerText = journalData.abstract),
          (outputContent.innerText = journalData.content));
        console.log(journalData);
      } catch (err) {
        outputDiv.innerText = `Error API: ${err.message}`;
      }
    },
  );
});

// 4. Integrasi Fetch ke API AI (Tanpa dependensi SDK eksternal)
async function callAIProvider(provider, apiKey, data, style) {
  const prompt = `Anda adalah asisten akademik. Ringkas teks jurnal berikut dengan fokus pada Masalah Utama, Metodologi, dan Hasil. Di bagian akhir, sediakan teks referensi/sitasi siap pakai dalam format ${style} berdasarkan metadata ini:\nJudul: ${data.title}\nPenulis: ${data.authors}\nTahun: ${data.date}\nPenerbit: ${data.publisher}\n\nTeks Jurnal:\n${data.content.substring(0, 12000)}`;

  if (provider === "gemini") {
    // Endpoint resmi Google Gemini Pro API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
  }

  if (provider === "openai") {
    // Endpoint resmi OpenAI Chat Completion
    const url = `https://api.openai.com/v1/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Model ringan dan cepat
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const result = await response.json();
    return result.choices[0].message.content;
  }

  throw new Error("Provider tidak didukung");
}
