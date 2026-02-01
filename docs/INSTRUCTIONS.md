# 📚 Setup Instructions

## For End Users

### Quick Start (Recommended)

1. **Visit the hosted version**:
   ```
   https://[your-username].github.io/lampa-clean
   ```

2. **Bookmark it** for easy access

3. **Start watching** - that's it!

### Installing Plugins

1. Click the **"My Plugins"** button in the menu
2. Browse available plugins by category
3. Click **"Install"** on any plugin
4. Plugin will be activated immediately

### Uninstalling Plugins

1. Open **"My Plugins"**
2. Find the installed plugin (marked with ✓)
3. Click **"Uninstall"**

---

## For Developers

### Prerequisites

- Git
- Node.js 18+ (optional, for local development)
- GitHub account
- Text editor (VS Code recommended)

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/[your-username]/lampa-clean.git
cd lampa-clean
```

#### 2. Install Dependencies (Optional)

```bash
npm install
```

#### 3. Run Local Server

**Option A: Using Python**
```bash
python3 -m http.server 8000
```

**Option B: Using Node.js**
```bash
npx http-server -p 8000
```

**Option C: Using VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

#### 4. Open in Browser

```
http://localhost:8000
```

### Project Structure

```
lampa-clean/
├── .github/
│   └── workflows/
│       └── update_lampa.yml    # Auto-update workflow
├── docs/
│   ├── ARCHITECTURE.md         # System architecture
│   ├── INSTRUCTIONS.md         # This file
│   └── CONTRIBUTING.md         # Contribution guidelines
├── src/
│   ├── loader.js               # Plugin loader system
│   └── styles/
│       └── custom.css          # Custom styles
├── plugins.json                # Plugin database
├── index.html                  # Entry point (modified Lampa)
├── CHANGELOG.md                # Version history
├── ROADMAP.md                  # Future plans
├── README.md                   # Project overview
├── LICENSE                     # MIT License
└── package.json                # NPM configuration
```

---

## Deployment to GitHub Pages

### Initial Setup

#### 1. Create GitHub Repository

```bash
# Create new repo on GitHub, then:
git remote add origin https://github.com/[your-username]/lampa-clean.git
git branch -M main
git push -u origin main
```

#### 2. Enable GitHub Pages

1. Go to repository **Settings**
2. Navigate to **Pages** section
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

#### 3. Configure Custom Domain (Optional)

1. Add `CNAME` file with your domain:
   ```bash
   echo "lampa.yourdomain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. Configure DNS:
   ```
   Type: CNAME
   Name: lampa
   Value: [your-username].github.io
   ```

### Automated Updates

The GitHub Actions workflow will:
- Run daily at midnight UTC
- Check for updates from official Lampa
- Merge changes automatically
- Re-inject our plugin loader
- Deploy to GitHub Pages

**Manual trigger**:
1. Go to **Actions** tab
2. Select **"Update and Deploy"** workflow
3. Click **"Run workflow"**

---

## Configuration

### Editing Plugin Database

Edit `plugins.json`:

```json
{
  "groups": [
    {
      "title": "Your Category",
      "plugins": [
        {
          "name": "Plugin Name",
          "url": "https://example.com/plugin.js",
          "description": "What this plugin does",
          "auto_load": false,
          "version": "1.0.0",
          "author": "Author Name"
        }
      ]
    }
  ]
}
```

**Fields**:
- `name` (required): Display name
- `url` (required): Plugin URL
- `description` (optional): Short description
- `auto_load` (optional): Load automatically on startup
- `version` (optional): Plugin version
- `author` (optional): Plugin author

### Customizing Styles

Edit `src/styles/custom.css`:

```css
/* Example: Change theme color */
:root {
  --primary-color: #e74c3c;
  --background-color: #1a1a1a;
}
```

### Modifying Loader Behavior

Edit `src/loader.js`:

```javascript
// Example: Change plugin load timeout
const PLUGIN_TIMEOUT = 10000; // 10 seconds

// Example: Add custom plugin validation
function validatePlugin(plugin) {
  // Your validation logic
  return true;
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Homepage loads correctly
- [ ] Plugin marketplace opens
- [ ] Can install a plugin
- [ ] Plugin works after installation
- [ ] Can uninstall a plugin
- [ ] Auto-load plugins work
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works in different browsers

### Automated Testing (Coming in v2)

```bash
npm test
```

---

## Troubleshooting

### Plugins Not Loading

**Problem**: Plugins fail to install or load

**Solutions**:
1. Check browser console for errors (F12)
2. Verify plugin URL is accessible
3. Clear browser cache and localStorage:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
4. Check CORS headers on plugin CDN

### GitHub Pages Not Updating

**Problem**: Changes not reflected on live site

**Solutions**:
1. Wait 5-10 minutes for GitHub Pages to rebuild
2. Hard refresh browser (Ctrl+Shift+R)
3. Check GitHub Actions for build errors
4. Verify `gh-pages` branch exists

### Merge Conflicts During Auto-Update

**Problem**: Workflow fails due to conflicts

**Solutions**:
1. Manually resolve conflicts:
   ```bash
   git fetch upstream
   git merge upstream/main
   # Resolve conflicts
   git commit
   git push
   ```
2. Adjust workflow to force our changes:
   ```yaml
   - name: Merge with ours strategy
     run: git merge -X ours upstream/main
   ```

### localStorage Full

**Problem**: "QuotaExceededError" when installing plugins

**Solutions**:
1. Uninstall unused plugins
2. Clear old data:
   ```javascript
   // In browser console
   Object.keys(localStorage)
     .filter(key => key.startsWith('lampa_'))
     .forEach(key => localStorage.removeItem(key));
   ```
3. Export/import plugin list (v2 feature)

---

## Advanced Configuration

### Custom Plugin Sources

Add multiple plugin databases:

```javascript
// In loader.js
const PLUGIN_SOURCES = [
  './plugins.json',
  'https://another-source.com/plugins.json'
];
```

### Plugin Blacklist

Block specific plugins:

```javascript
// In loader.js
const BLACKLIST = [
  'malicious-plugin',
  'broken-plugin'
];
```

### Custom Themes

Create theme switcher:

```javascript
// In loader.js
const THEMES = {
  dark: './themes/dark.css',
  light: './themes/light.css',
  netflix: './themes/netflix.css'
};
```

---

## Performance Optimization

### Enable Compression

Add `.htaccess` (if using Apache):

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>
```

### Enable Caching

Add cache headers:

```html
<meta http-equiv="Cache-Control" content="max-age=31536000">
```

### Minify Assets

```bash
# Install terser
npm install -g terser

# Minify JavaScript
terser src/loader.js -o src/loader.min.js -c -m

# Update index.html to use minified version
```

---

## Security Best Practices

### Content Security Policy

Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://trusted-cdn.com; 
               connect-src *;">
```

### Subresource Integrity

For external scripts:

```html
<script src="https://cdn.example.com/plugin.js" 
        integrity="sha384-..." 
        crossorigin="anonymous"></script>
```

### HTTPS Only

Enforce HTTPS in repository settings:
1. Settings → Pages
2. Check "Enforce HTTPS"

---

## Maintenance

### Regular Tasks

**Weekly**:
- [ ] Check for failed workflow runs
- [ ] Review new plugin submissions
- [ ] Update plugin database

**Monthly**:
- [ ] Review and update documentation
- [ ] Check for security vulnerabilities
- [ ] Update dependencies

**Quarterly**:
- [ ] Performance audit
- [ ] User feedback review
- [ ] Roadmap update

### Backup Strategy

```bash
# Backup plugins.json
cp plugins.json plugins.json.backup

# Backup entire repo
git clone --mirror https://github.com/[username]/lampa-clean.git
```

---

## Getting Help

- 📖 [Documentation](../README.md)
- 🐛 [Report Bug](https://github.com/[username]/lampa-clean/issues)
- 💡 [Request Feature](https://github.com/[username]/lampa-clean/discussions)
- 💬 [Community Chat](https://github.com/[username]/lampa-clean/discussions)

---

**Last Updated**: February 2, 2026  
**Version**: 1.0.0
