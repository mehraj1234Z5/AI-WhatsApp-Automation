const db = require('../../database/db');

async function getCategories(req, res, next) {
  try {
    const categories = await db.all('SELECT * FROM content_categories ORDER BY name ASC');
    const topics = await db.all('SELECT * FROM content_topics ORDER BY name ASC');

    const result = categories.map(cat => ({
      ...cat,
      topics: topics.filter(t => t.category_id === cat.id)
    }));

    return res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
}

async function addCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const existing = await db.get('SELECT id FROM content_categories WHERE name = ?', [name.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Category already exists.' });
    }

    const result = await db.run(
      'INSERT INTO content_categories (name, description, is_default) VALUES (?, ?, 0)',
      [name.trim(), description || '']
    );

    const created = await db.get('SELECT * FROM content_categories WHERE id = ?', [result.lastID]);
    return res.status(201).json({ success: true, data: { ...created, topics: [] } });
  } catch (err) {
    next(err);
  }
}

async function addTopic(req, res, next) {
  try {
    const { categoryId, name, description } = req.body;
    if (!categoryId || !name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Category ID and topic name are required.' });
    }

    const category = await db.get('SELECT id FROM content_categories WHERE id = ?', [categoryId]);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    const result = await db.run(
      'INSERT INTO content_topics (category_id, name, description) VALUES (?, ?, ?)',
      [categoryId, name.trim(), description || '']
    );

    const created = await db.get('SELECT * FROM content_topics WHERE id = ?', [result.lastID]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  addCategory,
  addTopic
};
