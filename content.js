console.log("🟢 BINGO! content.js berhasil disuntikkan ke halaman ini!");
function getTitleAdvanced() {
  // search id from json
  const jsonLdScripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (let script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.innerText);
      // Terkadang bentuknya array, terkadang objek tunggal
      const articleData = Array.isArray(data)
        ? data.find(
            (item) =>
              item["@type"] === "ScholarlyArticle" ||
              item["@type"] === "Article",
          )
        : data;

      if (articleData && articleData.headline) {
        return articleData.headline;
      }
    } catch (e) {
      // Abaikan jika JSON tidak valid
    }
  }

  const titleSelectors = [
    'meta[name="citation_title"]',
    'meta[property="og:title"]',
    'meta[name="DC.Title"]',
    'meta[name="twitter:title"]',
    "h1",
  ];

  for (let selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.content || element.innerText.trim();
    }
  }

  return document.title;
}

function getAuthors() {
  /**
   * - type "meta" : get value from atribute 'content'
   * - type "ui"   : get teks from inner teks tag html (innerText)
   */
  const authorSelectors = [
    // Standart Metadata Global
    {
      platform: "Standar Academic",
      type: "meta",
      query: 'meta[name="citation_author"]',
    },
    { platform: "Dublin Core", type: "meta", query: 'meta[name="DC.Creator"]' },
    {
      platform: "Open Graph",
      type: "meta",
      query: 'meta[property="article:author"]',
    },

    { platform: "IEEE Xplore", type: "ui", query: ".authors-info a" },
    {
      platform: "ScienceDirect",
      type: "ui",
      query: ".author-name, .author-group",
    },
    { platform: "ResearchGate", type: "ui", query: 'div[itemprop="author"] a' },

    { platform: "Umum (Itemprop)", type: "ui", query: '[itemprop="author"]' },
    {
      platform: "Umum (Class)",
      type: "ui",
      query: ".author, .authors, .author-name",
    },
  ];

  for (const selector of authorSelectors) {
    const nodes = document.querySelectorAll(selector.query);

    if (nodes.length > 0) {
      let extractedAuthors = [];

      if (selector.type === "meta") {
        extractedAuthors = Array.from(nodes).map((node) => node.content);
      } else if (selector.type === "ui") {
        extractedAuthors = Array.from(nodes).map((node) => node.innerText);
      }

      // (Sanitization)
      const cleanedAuthors = extractedAuthors
        .map((name) => name.trim())
        .map((name) => name.replace(/^[;,]+|[;,]+$/g, ""))
        .filter((name) => name.length > 2);

      const uniqueAuthors = [...new Set(cleanedAuthors)];

      if (uniqueAuthors.length > 0) {
        return uniqueAuthors.join(", ");
      }
    }
  }

  return "Penulis Tidak Diketahui";
}

function getPublisher() {
  /**
   * - type "meta" : get atribute from 'content'
   * - type "ui"   : get from teks innerText
   */
  const publisherSelectors = [
    {
      platform: "Standar Akademik",
      type: "meta",
      query: 'meta[name="citation_publisher"]',
    },
    {
      platform: "Dublin Core",
      type: "meta",
      query: 'meta[name="DC.Publisher"]',
    },
    {
      platform: "Open Graph",
      type: "meta",
      query: 'meta[property="og:site_name"]',
    },

    {
      platform: "IEEE Xplore",
      type: "ui",
      query: ".publisher-info-container button, xpl-publisher button",
    },
    { platform: "ScienceDirect", type: "ui", query: ".publication-title-link" },
    {
      platform: "Umum (Itemprop)",
      type: "ui",
      query: '[itemprop="publisher"] [itemprop="name"], [itemprop="publisher"]',
    },
    {
      platform: "Umum (Class)",
      type: "ui",
      query: ".publisher, .publisher-name",
    },
  ];

  for (const selector of publisherSelectors) {
    const nodes = document.querySelectorAll(selector.query);

    if (nodes.length > 0) {
      let publisherText = "";

      if (selector.type === "meta") {
        publisherText = nodes[0].content;
      } else if (selector.type === "ui") {
        publisherText = nodes[0].innerText;
      }

      if (publisherText) {
        // Sanitization
        const cleanedPublisher = publisherText
          .trim()
          .replace(/^(Publisher|Published by)[\s:]*/i, "")
          .replace(/\n/g, " ");

        if (cleanedPublisher.length > 1) {
          return cleanedPublisher;
        }
      }
    }
  }

  return "Penerbit Tidak Diketahui";
}

function getPublicationDate() {
  /**
   * - type "meta" : get atribute 'content' (or 'datetime' if tag <time>)
   * - type "ui"   : get from teks innerText
   */
  const dateSelectors = [
    {
      platform: "Standar Akademik",
      type: "meta",
      query:
        'meta[name="citation_publication_date"], meta[name="citation_date"]',
    },
    {
      platform: "Dublin Core",
      type: "meta",
      query: 'meta[name="DC.Date"], meta[name="DC.Issued"]',
    },
    {
      platform: "Open Graph",
      type: "meta",
      query: 'meta[property="article:published_time"]',
    },
    {
      platform: "Schema.org",
      type: "meta",
      query: 'meta[itemprop="datePublished"]',
    },

    { platform: "IEEE Xplore", type: "ui", query: ".doc-abstract-pubdate" },
    {
      platform: "ScienceDirect",
      type: "ui",
      query: ".publication-date, .available-online",
    },

    { platform: "Umum (Tag Time)", type: "meta", query: "time[datetime]" }, // Mencari tag <time> yang memiliki atribut datetime
    {
      platform: "Umum (Class)",
      type: "ui",
      query: ".date, .pub-date, .published-date, .publication-date",
    },
  ];

  for (const selector of dateSelectors) {
    const nodes = document.querySelectorAll(selector.query);

    if (nodes.length > 0) {
      let dateText = "";

      // Ekstraksi berdasarkan tipe
      if (selector.type === "meta") {
        dateText = nodes[0].content || nodes[0].getAttribute("datetime") || "";
      } else if (selector.type === "ui") {
        dateText = nodes[0].innerText;
      }

      if (dateText) {
        // Sanitization
        const cleanedDate = dateText
          .trim()
          .replace(
            /^(Date of Publication|Published|Available online|Publication date)[\s\:\-]*/i,
            "",
          )
          .replace(/\n/g, " ")
          .trim();

        if (cleanedDate.length >= 4) {
          return cleanedDate;
        }
      }
    }
  }

  return "Tanggal Tidak Diketahui";
}

function getAbstract() {
  /**
   * - type "meta" : get atribute from 'content'
   * - type "ui"   : get from teks innerText
   */
  const abstractSelectors = [
    {
      platform: "Standar Akademik",
      type: "meta",
      query: 'meta[name="citation_abstract"]',
    },
    {
      platform: "Dublin Core",
      type: "meta",
      query: 'meta[name="DC.Description"], meta[name="dc.description"]',
    },
    {
      platform: "Open Graph",
      type: "meta",
      query: 'meta[property="og:description"], meta[name="description"]',
    },
    {
      platform: "IEEE Xplore",
      type: "ui",
      query: ".abstract-text-content, .abstract-text, .document-abstract",
    },
    {
      platform: "ScienceDirect",
      type: "ui",
      query: ".abstract.author, #abstracts",
    },
    {
      platform: "ResearchGate",
      type: "ui",
      query: 'div[itemprop="description"]',
    },
    { platform: "Umum (Role)", type: "ui", query: '[role="doc-abstract"]' },
    {
      platform: "Umum (Class/ID)",
      type: "ui",
      query: "#abstract, .abstract, .Abstract",
    },
  ];

  for (const selector of abstractSelectors) {
    const nodes = document.querySelectorAll(selector.query);

    if (nodes.length > 0) {
      let abstractText = "";

      if (selector.type === "meta") {
        abstractText = nodes[0].content;
      } else if (selector.type === "ui") {
        abstractText = nodes[0].innerText;
      }

      if (abstractText) {
        // Sanitization
        const cleanedAbstract = abstractText
          .trim()
          .replace(/^(Abstract|Abstrak)[\s\:\.\-]*/i, "")
          .replace(/\n/g, " ");

        if (cleanedAbstract.length > 20) {
          return cleanedAbstract;
        }
      }
    }
  }

  return "";
}

function getArticleContent() {
  /**
   * KAMUS SELEKTOR ARTIKEL / TEKS UTAMA
   */
  const articleSelectors = [
    { platform: "IEEE Xplore", type: "ui", query: "#article, .ArticlePage" },
    {
      platform: "ScienceDirect",
      type: "ui",
      query: "article, #body, .article-content",
    },
    {
      platform: "ResearchGate",
      type: "ui",
      query: "div[itemprop='articleBody']",
    },

    { platform: "Umum (Tag Semantic)", type: "ui", query: "article, main" },

    {
      platform: "Umum (Class/ID)",
      type: "ui",
      query:
        ".main-content, #main-content, .article-body, #article-body, .content",
    },
  ];

  for (const selector of articleSelectors) {
    const nodes = document.querySelectorAll(selector.query);

    if (nodes.length > 0) {
      // Ambil teks dari elemen pembungkus utama
      let contentText = nodes[0].innerText;

      if (contentText) {
        // Sanitization
        const cleanedContent = contentText.replace(/\\s+/g, " ").trim();

        if (cleanedContent.length > 500) {
          return cleanedContent;
        }
      }
    }
  }

  return document.body.innerText.replace(/\\s+/g, " ").trim();
}

function getJournalMetadata() {
  const title = getTitleAdvanced();
  const authors = getAuthors();
  const publisher = getPublisher();
  const abstract = getAbstract();
  const date = getPublicationDate();
  const mainText = getArticleContent();

  return { title, authors, date, publisher, abstract, content: mainText };
}

// Menjawab request dari sidepanel.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_TEXT") {
    sendResponse(getJournalMetadata());
  }
  return true;
});
