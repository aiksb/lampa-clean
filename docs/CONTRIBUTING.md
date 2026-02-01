# 🤝 Contributing to Lampa Clean Mirror

First off, thank you for considering contributing to Lampa Clean Mirror! It's people like you that make this project better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Plugin Submission Guidelines](#plugin-submission-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

**Positive behavior includes**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior includes**:
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

---

## How Can I Contribute?

### 🐛 Reporting Bugs

**Before submitting a bug report**:
1. Check the [issue tracker](https://github.com/[username]/lampa-clean/issues)
2. Check if the issue is already fixed in the latest version
3. Collect information about the bug

**How to submit a good bug report**:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Windows 10]
 - Browser: [e.g. Chrome 120]
 - Version: [e.g. 1.0.0]

**Additional context**
Any other context about the problem.
```

### 💡 Suggesting Features

**Before submitting**:
1. Check if the feature is already in the [roadmap](../ROADMAP.md)
2. Search existing [feature requests](https://github.com/[username]/lampa-clean/discussions/categories/ideas)

**How to submit a feature request**:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Any other context or screenshots.
```

### 🔌 Submitting Plugins

See [Plugin Submission Guidelines](#plugin-submission-guidelines) below.

### 📝 Improving Documentation

Documentation improvements are always welcome! This includes:
- Fixing typos or grammatical errors
- Adding examples
- Clarifying confusing sections
- Translating to other languages

### 💻 Contributing Code

See [Development Setup](#development-setup) and [Pull Request Process](#pull-request-process) below.

---

## Development Setup

### Prerequisites

```bash
# Required
git --version        # Git 2.0+
node --version       # Node.js 18+
npm --version        # npm 9+

# Optional
python3 --version    # Python 3.8+ (for local server)
```

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/lampa-clean.git
cd lampa-clean

# 3. Add upstream remote
git remote add upstream https://github.com/[original-username]/lampa-clean.git

# 4. Install dependencies (if any)
npm install

# 5. Create a branch
git checkout -b feature/your-feature-name

# 6. Make your changes

# 7. Test locally
python3 -m http.server 8000
# or
npx http-server -p 8000

# 8. Commit and push
git add .
git commit -m "feat: add amazing feature"
git push origin feature/your-feature-name

# 9. Create Pull Request on GitHub
```

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## Coding Standards

### JavaScript Style Guide

We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with some modifications.

**Key points**:

```javascript
// ✅ Good
const pluginList = [];
const MAX_PLUGINS = 100;

function loadPlugin(url) {
  // Function body
}

// ❌ Bad
var plugin_list = [];
const max_plugins = 100;

function LoadPlugin(url) {
  // Function body
}
```

**Naming conventions**:
- Variables and functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Classes: `PascalCase`
- Private methods: `_prefixWithUnderscore`

**Comments**:
```javascript
// ✅ Good - Explain WHY, not WHAT
// Retry failed plugins because CDN might be temporarily down
retryFailedPlugins();

// ❌ Bad - Obvious from code
// Load the plugin
loadPlugin(url);
```

### HTML/CSS Style Guide

```html
<!-- ✅ Good -->
<div class="plugin-card" data-plugin-id="123">
  <h3 class="plugin-card__title">Plugin Name</h3>
</div>

<!-- ❌ Bad -->
<div class="pluginCard" id="plugin123">
  <h3 class="title">Plugin Name</h3>
</div>
```

**CSS naming**: Use BEM methodology
```css
/* Block */
.plugin-card { }

/* Element */
.plugin-card__title { }
.plugin-card__description { }

/* Modifier */
.plugin-card--featured { }
```

### JSON Style Guide

```json
{
  "name": "Plugin Name",
  "url": "https://example.com/plugin.js",
  "description": "Short description",
  "auto_load": false
}
```

**Rules**:
- Use 2 spaces for indentation
- Double quotes for strings
- No trailing commas
- Alphabetical order for keys (when logical)

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(loader): add plugin search functionality"

# Bug fix
git commit -m "fix(loader): resolve plugin installation error on Firefox"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api): redesign plugin API

BREAKING CHANGE: Plugin API v1 is no longer supported"
```

### Commit Message Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be ≤ 72 characters
- Reference issues and pull requests when relevant

---

## Pull Request Process

### Before Submitting

- [ ] Code follows our style guidelines
- [ ] Self-review of your code
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No console warnings or errors
- [ ] Tested in multiple browsers
- [ ] Commit messages follow guidelines

### PR Title Format

Use the same format as commit messages:

```
feat(loader): add plugin search functionality
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have tested in multiple browsers
```

### Review Process

1. **Automated checks**: CI/CD must pass
2. **Code review**: At least one maintainer approval required
3. **Testing**: Reviewer will test your changes
4. **Merge**: Maintainer will merge if approved

### After Your PR is Merged

1. Delete your branch (optional)
2. Update your local repository
3. Celebrate! 🎉

---

## Plugin Submission Guidelines

### Plugin Requirements

**Must have**:
- ✅ Working plugin URL
- ✅ Clear plugin name
- ✅ Brief description
- ✅ Tested and working
- ✅ No malicious code

**Should have**:
- ⭐ Version number
- ⭐ Author name
- ⭐ Source code link
- ⭐ License information

### Submission Process

1. **Test the plugin** thoroughly
2. **Add to `plugins.json`**:

```json
{
  "groups": [
    {
      "title": "Appropriate Category",
      "plugins": [
        {
          "name": "Your Plugin Name",
          "url": "https://example.com/plugin.js",
          "description": "What your plugin does",
          "version": "1.0.0",
          "author": "Your Name",
          "source": "https://github.com/you/plugin",
          "license": "MIT"
        }
      ]
    }
  ]
}
```

3. **Create Pull Request** with:
   - Plugin details
   - Testing evidence (screenshots/video)
   - Why it should be included

### Plugin Categories

- **Online Streaming**: VOD services
- **Torrents**: Torrent integration
- **IPTV & TV**: Live TV services
- **Utilities**: Tools and enhancements
- **18+ Content**: Adult content (clearly marked)

### Plugin Review Criteria

We will check:
- ✅ Does it work?
- ✅ Is it safe?
- ✅ Is it useful?
- ✅ Does it duplicate existing functionality?
- ✅ Is the code quality acceptable?

### Rejection Reasons

We may reject if:
- ❌ Contains malware or malicious code
- ❌ Violates copyright laws
- ❌ Doesn't work as described
- ❌ Poor code quality
- ❌ Duplicate of existing plugin
- ❌ Violates our code of conduct

---

## Translation Guidelines

### Adding a New Language

1. Create `src/i18n/[language-code].json`:

```json
{
  "plugin_marketplace": "Plugin Marketplace",
  "install": "Install",
  "uninstall": "Uninstall",
  "installed": "Installed"
}
```

2. Update `src/loader.js` to include new language

3. Test thoroughly

4. Submit PR with translation

### Translation Quality

- ✅ Native speaker preferred
- ✅ Culturally appropriate
- ✅ Consistent terminology
- ✅ Proofread by second person

---

## Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Mentioned in release notes
- Given credit in documentation

Top contributors may be invited to become maintainers!

---

## Questions?

- 💬 [GitHub Discussions](https://github.com/[username]/lampa-clean/discussions)
- 📧 Email: [maintainer-email]
- 🐦 Twitter: [@handle]

---

Thank you for contributing! 🙏

**Last Updated**: February 2, 2026
