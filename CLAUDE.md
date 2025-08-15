# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PowerPoint AI Builder project that consists of:
1. OpenXML template files for PowerPoint presentation generation
2. Material Dashboard Dark Edition (v2.1.0) - a Bootstrap-based admin template

## Architecture

### OpenXML Template Structure
The `OpenXMLTemplate/` directory contains the raw XML structure of a PowerPoint presentation:
- `presentation.xml` - Main presentation manifest
- `slides/` - Individual slide XML definitions (slide1.xml through slide5.xml)
- `slideLayouts/` - 54 different slide layout templates
- `slideMasters/` - Master slide templates
- `theme/` - Theme definitions (theme1.xml, theme2.xml)
- `media/` - Embedded images
- `fonts/` - Embedded fonts (DeutscheBank font family)

### Material Dashboard
The `material-dashboard-dark-edition-v2.1.0/` directory contains a web-based dashboard template with:
- Bootstrap 4 framework
- Material Design components
- Dark theme support
- jQuery, Popper.js, and Chart.js integrations

## Development Commands

### Dashboard Build Commands
```bash
# Install dependencies (if not already installed)
npm install

# Compile SCSS to CSS
gulp compile-scss

# Watch for SCSS changes
gulp watch

# Open dashboard and watch for changes
gulp open-app
```

## Key Technical Details

### PowerPoint XML Structure
- Uses Open XML format for PowerPoint presentations
- Slide dimensions: 10077450 x 7583488 EMUs
- Includes 5 slides with various layouts
- Embedded DeutscheBank fonts for consistent rendering

### Dashboard Dependencies
- Bootstrap Material Design framework
- Chartist.js for charts
- Perfect Scrollbar for custom scrollbars
- Bootstrap Notify for notifications