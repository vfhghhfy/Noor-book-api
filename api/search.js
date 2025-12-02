export default async function handler(req, res) {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({ error: "يرجى إدخال كلمة البحث" });
    }

    const fetch = (await import('node-fetch')).default;

    const response = await fetch(
      `https://www.noor-book.com/site/search?q=${encodeURIComponent(query)}`
    );

    const html = await response.text();

    // هنا ضع كود استخراج الكتب من HTML
    // (إذا ترغب أكتب لك المعالج كامل)

    res.status(200).json({
      query,
      raw: html.substring(0, 500)
    });

  } catch (e) {
    res.status(500).json({ error: "خطأ في الخادم", details: e.message });
  }
}
