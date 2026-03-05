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
const OUR_WORK_TABLE_ID = 'micjldt413abeuk';

if (!NOCODB_TOKEN) {
  console.error('ERROR: NOCODB_TOKEN is not set. Create a .env file with NOCODB_TOKEN=your_token');
  process.exit(1);
}

// ─── Secure Image Downloader ────────────────────────────────
async function downloadNocoDbAttachment(attachment, localPath) {
  if (!attachment || !attachment.length || !attachment[0].url) return '';

  const url = attachment[0].url;
  // If it's already a relative path, it's not a nocodb attachment
  if (!url.startsWith('http')) return url;

  // Check if we already downloaded this exact image in a previous build!
  // If we did, skip the download to save bandwidth and build time.
  const relativePublicPath = localPath.replace('dist', '');
  if (await fs.pathExists(localPath)) {
    console.log(`    Cached: ${relativePublicPath}`);
    return relativePublicPath;
  }

  const fullUrl = url.startsWith('/') ? `${NOCODB_URL}${url}` : url;

  try {
    const res = await fetch(fullUrl, {
      headers: { 'xc-token': NOCODB_TOKEN }
    });
    if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);

    const buffer = await res.arrayBuffer();
    await fs.ensureDir(path.dirname(localPath));
    await fs.writeFile(localPath, Buffer.from(buffer));

    // Return the relative public path for HTML injection
    return relativePublicPath;
  } catch (err) {
    console.error(`Error downloading image ${url}:`, err);
    return '';
  }
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

// ─── Fetch Our Work from NocoDB ─────────────────────────────
async function fetchOurWork() {
  const url = `${NOCODB_URL}/api/v2/tables/${OUR_WORK_TABLE_ID}/records?limit=100&where=(Published,eq,true)`;
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
async function buildBlogPage(blog, template) {
  const bodyHtml = marked(blog.Body || '');
  const canonicalUrl = `https://saits.ai/blogs/${blog.Slug}`;

  // Download the cover image securely
  const coverLocalPath = await downloadNocoDbAttachment(blog.CoverImage, `dist/assets/blogs/${blog.Slug}-cover.jpeg`);

  // Use cover image if available, else default OG image
  const ogImage = coverLocalPath ? `https://saits.ai${coverLocalPath}` : 'https://saits.ai/assets/og-image.png';

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

  // Inject Local Cover Image URL into HTML if they want to display it
  html = html.replace(/{{cover_image}}/g, coverLocalPath || '');

  // New SEO variables
  html = html.replace(/{{canonical_url}}/g, canonicalUrl);
  html = html.replace(/{{og_image}}/g, ogImage);
  html = html.replace(/{{article_schema}}/g, `<script type="application/ld+json">\n${articleSchema}\n</script>`);
  html = html.replace(/{{breadcrumb_schema}}/g, `<script type="application/ld+json">\n${breadcrumbSchema}\n</script>`);

  return html;
}

// ─── Build blog listing page ────────────────────────────────
function buildBlogListingPage(blogs, template) {
  const cards = blogs.map(blog => {
    // Generate a quick URL to the attachment for the thumbnail if available
    const thumbUrl = blog.CoverImage && blog.CoverImage.length > 0 ?
      (blog.CoverImage[0].url.startsWith('http') ? blog.CoverImage[0].url : `${NOCODB_URL}${blog.CoverImage[0].url}`) :
      '/assets/og-image.png';

    return `
        <article class="blog-card">
            <a href="/blogs/${blog.Slug}" class="blog-card-link">
                <!-- If you ever want a thumbnail image, here it is: -->
                <!-- <img src="${thumbUrl}" alt="${blog.Title || ''}" class="work-card-img" crossorigin="anonymous"> -->
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
    `;
  }).join('\n');

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

// ─── Build a single Our Work page ───────────────────────────
async function buildOurWorkPage(work, template) {
  const challengeHtml = marked(work.TheChallenge || '');
  const solutionHtml = marked(work.TheSolution || '');
  const resultsHtml = marked(work.TheResults || '');

  const canonicalUrl = `https://saits.ai/our-work/${work.Slug}`;

  // Download the three images securely
  const heroLocalPath = await downloadNocoDbAttachment(work.HeroImage, `dist/assets/our-work/${work.Slug}-hero.jpeg`);
  const solutionLocalPath = await downloadNocoDbAttachment(work.SolutionImage, `dist/assets/our-work/${work.Slug}-solution.jpeg`);
  const resultsLocalPath = await downloadNocoDbAttachment(work.ResultsImage, `dist/assets/our-work/${work.Slug}-results.jpeg`);

  // Default OG image is the hero image, or system default
  const ogImage = heroLocalPath ? `https://saits.ai${heroLocalPath}` : 'https://saits.ai/assets/og-image.png';
  const isoDate = new Date().toISOString();

  // Generate Article Schema
  const articleSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": work.Title || '',
    "description": work.Summary || '',
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
      { "@type": "ListItem", "position": 2, "name": "Our Work", "item": "https://saits.ai/our-work" },
      { "@type": "ListItem", "position": 3, "name": work.Title || '', "item": canonicalUrl }
    ]
  }, null, 2);

  let html = template;
  html = html.replace(/{{title}}/g, work.Title || '');
  html = html.replace(/{{industry}}/g, work.Industry || '');
  html = html.replace(/{{description}}/g, work.Summary || '');
  html = html.replace(/{{slug}}/g, work.Slug || '');

  // Body Content
  html = html.replace(/{{challenge_body}}/g, challengeHtml);
  html = html.replace(/{{solution_body}}/g, solutionHtml);
  html = html.replace(/{{results_body}}/g, resultsHtml);

  // Inject Image HTML only if the image exists
  html = html.replace(/{{hero_image}}/g, heroLocalPath || '/assets/og-image.png');
  html = html.replace(/{{solution_image_html}}/g, solutionLocalPath ? `<img src="${solutionLocalPath}" alt="Solution Architecture" class="case-study-image">` : '');
  html = html.replace(/{{results_image_html}}/g, resultsLocalPath ? `<img src="${resultsLocalPath}" alt="Results Dashboard" class="case-study-image">` : '');

  // SEO variables
  html = html.replace(/{{canonical_url}}/g, canonicalUrl);
  html = html.replace(/{{og_image}}/g, ogImage);
  html = html.replace(/{{article_schema}}/g, `<script type="application/ld+json">\n${articleSchema}\n</script>`);
  html = html.replace(/{{breadcrumb_schema}}/g, `<script type="application/ld+json">\n${breadcrumbSchema}\n</script>`);

  return html;
}

// ─── Build Our Work listing page ────────────────────────────
function buildOurWorkListingPage(works, template) {
  const cards = works.map(work => {
    // Generate a quick URL to the attachment for the thumbnail if available
    const thumbUrl = work.HeroImage && work.HeroImage.length > 0 ?
      (work.HeroImage[0].url.startsWith('http') ? work.HeroImage[0].url : `${NOCODB_URL}${work.HeroImage[0].url}`) :
      '/assets/og-image.png';

    return `
        <article class="blog-card">
            <a href="/our-work/${work.Slug}" class="blog-card-link">
                <img src="${thumbUrl}" alt="${work.Title || ''}" class="work-card-img" crossorigin="anonymous">
                <div class="blog-card-content">
                    <span class="blog-card-tag">${work.Industry || ''}</span>
                    <h3 class="blog-card-title">${work.Title || ''}</h3>
                    <p class="blog-card-desc">${work.Summary || ''}</p>
                    <div class="work-card-footer">
                        Read Case Study &rarr;
                    </div>
                </div>
            </a>
        </article>
    `;
  }).join('\n');

  return template.replace('{{work-cards}}', cards);
}

// ─── Main build function ────────────────────────────────────
async function build() {
  console.log('Building site...');
  console.log('Fetching blogs from NocoDB...');

  const blogs = await fetchBlogs();
  console.log(`✓ Fetched ${blogs.length} published blog(s)`);

  console.log('Fetching Our Work from NocoDB...');
  const works = await fetchOurWork();
  console.log(`✓ Fetched ${works.length} published case studies`);

  // Ensure dist directories exist
  await fs.ensureDir('dist/blogs');
  await fs.ensureDir('dist/our-work');
  await fs.ensureDir('dist/css');
  await fs.ensureDir('dist/js');
  await fs.ensureDir('dist/assets/our-work');

  // Read templates
  const blogPostTemplate = await fs.readFile('templates/blog-post.html', 'utf-8');
  const blogListTemplate = await fs.readFile('templates/blog-listing.html', 'utf-8');
  const workPostTemplate = await fs.readFile('templates/our-work-post.html', 'utf-8');
  const workListTemplate = await fs.readFile('templates/our-work-listing.html', 'utf-8');

  // Build individual blog pages
  for (const blog of blogs) {
    const html = await buildBlogPage(blog, blogPostTemplate); // Added await because it downloads images now
    const outputPath = `dist/blogs/${blog.Slug}.html`;
    await fs.writeFile(outputPath, html);
    console.log(`  ✓ Built blogs/${blog.Slug}.html (and downloaded cover)`);
  }

  // Build blog listing page
  const listingHtml = buildBlogListingPage(blogs, blogListTemplate);
  await fs.writeFile('dist/blogs/index.html', listingHtml);
  console.log('  ✓ Built blogs/index.html (listing page)');

  // Build individual case study pages
  for (const work of works) {
    const html = await buildOurWorkPage(work, workPostTemplate); // Note the await here for image downloads
    const outputPath = `dist/our-work/${work.Slug}.html`;
    await fs.writeFile(outputPath, html);
    console.log(`  ✓ Built our-work/${work.Slug}.html (and downloaded images)`);
  }

  // Build our work listing page
  const workListingHtml = buildOurWorkListingPage(works, workListTemplate);
  await fs.writeFile('dist/our-work/index.html', workListingHtml);
  console.log('  ✓ Built our-work/index.html (listing page)');

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
  console.log(`   ${works.length} case study pages generated`);
  console.log('   Static pages copied to dist/');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
