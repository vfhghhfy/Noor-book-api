const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// إعداد User-Agent عشوائي
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
];

// دالة لجلب الصفحة
const fetchPage = async (url, page = 1) => {
  try {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await axios.get(`${url}?page=${page}`, {
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching page:", error.message);
    return null;
  }
};

// دالة لاستخراج بيانات الكتب
const extractBooks = ($, selector) => {
  const books = [];

  $(selector).each((index, element) => {
    const bookElement = $(element);
    const book = {
      id: bookElement.find("a").attr("href")?.split("/").pop() || "",
      title: bookElement.find(".book-title").text().trim(),
      author: bookElement.find(".book-author").text().trim(),
      cover: bookElement.find("img").attr("src"),
      url: bookElement.find("a").attr("href"),
      description: bookElement.find(".book-description").text().trim(),
      rating: bookElement.find(".rating").text().trim(),
      pages: bookElement.find(".book-pages").text().trim(),
      size: bookElement.find(".book-size").text().trim(),
      format: bookElement.find(".book-format").text().trim(),
    };

    if (book.title) {
      books.push(book);
    }
  });

  return books;
};

// API Routes
app.get("/", (req, res) => {
  res.json({
    message: "Noor Book API",
    version: "1.0.0",
    endpoints: {
      search: "/api/search/:query",
      categories: "/api/categories",
      categoryBooks: "/api/category/:slug",
      tagBooks: "/api/tag/:slug",
      newReleases: "/api/new-releases",
      popular: "/api/popular",
      latest: "/api/latest",
    },
    note: "All list endpoints support ?page=N for pagination",
  });
});

// البحث
app.get("/api/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1 } = req.query;

    const html = await fetchPage(
      `https://www.noor-book.com/en/search?term=${encodeURIComponent(query)}`,
      page,
    );

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const books = extractBooks($, ".book-item");

    // استخراج العدد الإجمالي للصفحات
    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      query,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// الفئات
app.get("/api/categories", async (req, res) => {
  try {
    const html = await fetchPage("https://www.noor-book.com/en/categories");

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const categories = [];

    $(".category-item").each((index, element) => {
      const category = {
        id: $(element).find("a").attr("href")?.split("/").pop() || "",
        name: $(element).find(".category-name").text().trim(),
        url: $(element).find("a").attr("href"),
        count: $(element).find(".book-count").text().trim(),
        icon: $(element).find("img").attr("src"),
      };

      if (category.name) {
        categories.push(category);
      }
    });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// كتب الفئة
app.get("/api/category/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1 } = req.query;

    const html = await fetchPage(
      `https://www.noor-book.com/en/category/${slug}`,
      page,
    );

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);

    // معلومات الفئة
    const categoryInfo = {
      name: $(".category-title").text().trim(),
      description: $(".category-description").text().trim(),
    };

    // الكتب
    const books = extractBooks($, ".book-item");

    // العدد الإجمالي للصفحات
    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      category: categoryInfo,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// كتب الوسم
app.get("/api/tag/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1 } = req.query;

    const html = await fetchPage(
      `https://www.noor-book.com/en/tag/${slug}`,
      page,
    );

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const books = extractBooks($, ".book-item");

    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      tag: slug,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// الإصدارات الجديدة
app.get("/api/new-releases", async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const html = await fetchPage(
      "https://www.noor-book.com/en/new-releases",
      page,
    );

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const books = extractBooks($, ".book-item");

    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// الكتب الشائعة
app.get("/api/popular", async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const html = await fetchPage(
      "https://www.noor-book.com/en/most-popular",
      page,
    );

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const books = extractBooks($, ".book-item");

    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// أحدث الكتب
app.get("/api/latest", async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const html = await fetchPage("https://www.noor-book.com/en/latest", page);

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);
    const books = extractBooks($, ".book-item");

    const totalPages = $(".pagination .page-item:not(.next):not(.prev)").length;

    res.json({
      success: true,
      page: parseInt(page),
      totalPages: totalPages || 1,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// تفاصيل الكتاب
app.get("/api/book/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const html = await fetchPage(`https://www.noor-book.com/${id}`);

    if (!html) {
      return res.status(500).json({ error: "Failed to fetch data" });
    }

    const $ = cheerio.load(html);

    const book = {
      id,
      title: $("h1.book-title").text().trim(),
      author: {
        name: $(".book-author a").text().trim(),
        url: $(".book-author a").attr("href"),
      },
      cover: $(".book-cover img").attr("src"),
      description: $(".book-description").text().trim(),
      details: {},
      categories: [],
      tags: [],
      downloadLinks: [],
    };

    // التفاصيل
    $(".book-details li").each((index, element) => {
      const text = $(element).text().trim();
      const parts = text.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(":").trim();
        book.details[key] = value;
      }
    });

    // الفئات
    $(".book-categories a").each((index, element) => {
      book.categories.push({
        name: $(element).text().trim(),
        url: $(element).attr("href"),
      });
    });

    // الوسوم
    $(".book-tags a").each((index, element) => {
      book.tags.push({
        name: $(element).text().trim(),
        url: $(element).attr("href"),
      });
    });

    // روابط التحميل
    $(".download-links a").each((index, element) => {
      book.downloadLinks.push({
        format: $(element).text().trim(),
        url: $(element).attr("href"),
      });
    });

    // الكتب المقترحة
    book.relatedBooks = extractBooks($, ".related-book-item");

    res.json({
      success: true,
      book,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
});
