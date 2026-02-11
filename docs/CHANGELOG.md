# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v2.0
- Advanced plugin management system
- Offline mode support
- Cross-device synchronization
- Enhanced UI/UX improvements
- Plugin development SDK
- Multi-language support
- Performance optimizations

## [1.0.0] - 2026-02-02

### Added
- Initial release of Lampa Clean Mirror
- Custom plugin marketplace with 5 categories:
  - Online Streaming (9 plugins)
  - Torrents (7 plugins)
  - IPTV & TV (4 plugins)
  - Utilities (13 plugins)
  - 18+ Content (2 plugins)
- Plugin loader system (`loader.js`)
- Plugin database (`plugins.json`)
- Auto-load functionality for essential plugins
- Ad-blocking integration (No CUB Premium Ads)
- GitHub Actions workflow for automated updates
- Comprehensive documentation:
  - README.md
  - ARCHITECTURE.md
  - INSTRUCTIONS.md
  - CONTRIBUTING.md
  - ROADMAP.md
- MIT License

### Security
- Removed all advertisement code from official Lampa
- Implemented plugin verification system
- Added content security policy headers

### Infrastructure
- GitHub Pages deployment
- Automated sync with official Lampa repository
- CI/CD pipeline for testing and deployment

## [0.1.0] - 2026-01-15

### Added
- Project initialization
- Basic structure setup
- Research and planning phase

---

## Version Naming Convention

- **Major version** (X.0.0): Breaking changes or major feature releases
- **Minor version** (1.X.0): New features, backward compatible
- **Patch version** (1.0.X): Bug fixes and minor improvements

## Release Notes Format

Each release includes:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
