const fs = require('fs-extra');
const { marked } = require('marked');
const path = require('path');

// ─── Load environment variables from .env ───────────────────
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

// ─── NocoDB Configuration ───────────────────────────────────
const NOCODB_URL = 'https://nocodb.saits.click';
const NOCODB_TOKEN = process.env.NOCODB_TOKEN;
const BLOGS_TABLE_ID = 'mbnr62lbwgujy1w';

if (!NOCODB_TOKEN) {
  console.error('ERROR: NOCODB_TOKEN is not set. Create a .env file with NOCODB_TOKEN=your_token');
  process.exit(1);
}

// ─── Fetch blogs from NocoDB ────────────────────────────────
async function fetchBlogs() {
  const url = `${NOCODB_URL}/api/v2/tables/${BLOGS_TABLE_ID}/records?limit=100&where=(Published,eq,true)&sort=-Date`;
  const res = await fetch(url, {
    headers: { 'xc-token': NOCODB_TOKEN }
  });
  if (!res.ok) throw new Error(`NocoDB API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.list || [];
}

// ─── Parse frontmatter from local markdown (legacy support) ─
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { attributes: {}, body: content };
  const attrs = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) attrs[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  });
  return { attributes: attrs, body: match[2] };
}

// ─── Build a single blog HTML page ──────────────────────────
function buildBlogPage(blog, template) {
  const bodyHtml = marked(blog.Body || '');
  const canonicalUrl = `https://saits.ai/blogs/${blog.Slug}`;
  // Use cover image if available, else default OG image
  const ogImage = blog.CoverImage ? blog.CoverImage : 'https://saits.ai/assets/og-image.png';

  const dateStr = blog.Date ? new Date(blog.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const isoDate = blog.Date ? new Date(blog.Date).toISOString() : '';

  // Generate Article Schema
  const articleSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": blog.Title || '',
    "description": blog.Description || '',
    "image": ogImage,
    "datePublished": isoDate,
    "dateModified": isoDate,
    "author": { "@type": "Organization", "name": "SAITS" },
    "publisher": {
      "@type": "Organization",
      "name": "SAITS",
      "logo": { "@type": "ImageObject", "url": "https://saits.ai/assets/saits-logo.svg" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl }
  }, null, 2);

  // Generate Breadcrumb Schema
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://saits.ai/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://saits.ai/blogs" },
      { "@type": "ListItem", "position": 3, "name": blog.Title || '', "item": canonicalUrl }
    ]
  }, null, 2);

  let html = template;
  html = html.replace(/{{title}}/g, blog.Title || '');
  html = html.replace(/{{tag}}/g, blog.Tag || '');
  html = html.replace(/{{description}}/g, blog.Description || '');
  html = html.replace(/{{readtime}}/g, blog.ReadTime || '');
  html = html.replace(/{{date}}/g, dateStr);
  html = html.replace(/{{body}}/g, bodyHtml);
  html = html.replace(/{{slug}}/g, blog.Slug || '');

  // New SEO variables
  html = html.replace(/{{canonical_url}}/g, canonicalUrl);
  html = html.replace(/{{og_image}}/g, ogImage);
  html = html.replace(/{{article_schema}}/g, `<script type="application/ld+json">\n${articleSchema}\n</script>`);
  html = html.replace(/{{breadcrumb_schema}}/g, `<script type="application/ld+json">\n${breadcrumbSchema}\n</script>`);

  return html;
}

// ─── Build blog listing page ────────────────────────────────
function buildBlogListingPage(blogs, template) {
  const cards = blogs.map(blog => `
        <article class="blog-card">
            <a href="/blogs/${blog.Slug}" class="blog-card-link">
                <div class="blog-card-content">
                    <span class="blog-card-tag">${blog.Tag || ''}</span>
                    <h3 class="blog-card-title">${blog.Title || ''}</h3>
                    <p class="blog-card-desc">${blog.Description || ''}</p>
                    <div class="blog-card-meta">
                        <span>${blog.ReadTime || ''}</span>
                        <span>${blog.Date ? new Date(blog.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : ''}</span>
                    </div>
                </div>
            </a>
        </article>
    `).join('\n');

  return template.replace('{{blog-cards}}', cards);
}

// ─── Build homepage insights section ────────────────────────
function buildHomepageInsights(blogs) {
  // Return the 3 latest blogs as card HTML for the homepage
  const latest = blogs.slice(0, 3);
  return latest.map(blog => `
        <a href="/blogs/${blog.Slug}" class="insight-card-link">
            <div class="insight-card">
                <span class="insight-tag">${blog.Tag || ''}</span>
                <h3>${blog.Title || ''}</h3>
                <p>${blog.Description || ''}</p>
                <span class="insight-read">${blog.ReadTime || ''}</span>
            </div>
        </a>
    `).join('\n');
}

// ─── Main build function ────────────────────────────────────
async function build() {
  console.log('Building site...');
  console.log('Fetching blogs from NocoDB...');

  const blogs = await fetchBlogs();
  console.log(`✓ Fetched ${blogs.length} published blog(s)`);

  // Ensure dist directories exist
  await fs.ensureDir('dist/blogs');
  await fs.ensureDir('dist/css');
  await fs.ensureDir('dist/js');
  await fs.ensureDir('dist/assets');

  // Read templates
  const blogPostTemplate = await fs.readFile('templates/blog-post.html', 'utf-8');
  const blogListTemplate = await fs.readFile('templates/blog-listing.html', 'utf-8');

  // Build individual blog pages
  for (const blog of blogs) {
    const html = buildBlogPage(blog, blogPostTemplate);
    const outputPath = `dist/blogs/${blog.Slug}.html`;
    await fs.writeFile(outputPath, html);
    console.log(`  ✓ Built blogs/${blog.Slug}.html`);
  }

  // Build blog listing page
  const listingHtml = buildBlogListingPage(blogs, blogListTemplate);
  await fs.writeFile('dist/blogs/index.html', listingHtml);
  console.log('  ✓ Built blogs/index.html (listing page)');

  // Copy static pages (non-blog HTML files)
  const staticPages = [
    'index.html', 'about.html', 'contact.html', 'services.html',
    'privacy.html', 'terms.html', 'datenschutz.html', 'agb.html', 'impressum.html',
    'solutions.html', 'work.html', 'industries.html'
  ];
  for (const page of staticPages) {
    if (await fs.pathExists(page)) {
      await fs.copy(page, `dist/${page}`);
    }
  }

  // Copy directories
  const dirs = ['css', 'js', 'assets', 'industries', 'case-studies', 'articles'];

  // Copy SEO files
  for (const seoFile of ['robots.txt', 'sitemap.xml']) {
    if (await fs.pathExists(seoFile)) {
      await fs.copy(seoFile, `dist/${seoFile}`);
    }
  }
  for (const dir of dirs) {
    if (await fs.pathExists(dir)) {
      await fs.copy(dir, `dist/${dir}`, { overwrite: true });
    }
  }

  console.log('\n✅ Build complete!');
  console.log(`   ${blogs.length} blog pages generated`);
  console.log('   Static pages copied to dist/');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
