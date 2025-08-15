const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');

class OpenXMLParser {
  constructor() {
    this.parser = new xml2js.Parser();
    this.templatePath = path.join(__dirname, '../../../OpenXMLTemplate');
  }

  async parseSlideLayout(layoutFile) {
    try {
      const xmlContent = await fs.readFile(layoutFile, 'utf8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      const placeholders = [];
      const layoutName = this.extractLayoutName(result);
      
      // Extract placeholders from slide layout
      if (result['p:sldLayout'] && result['p:sldLayout']['p:cSld']) {
        const commonSlideData = result['p:sldLayout']['p:cSld'][0];
        
        if (commonSlideData['p:spTree']) {
          const shapeTree = commonSlideData['p:spTree'][0];
          
          // Process shapes
          if (shapeTree['p:sp']) {
            shapeTree['p:sp'].forEach(shape => {
              const placeholder = this.extractPlaceholder(shape);
              if (placeholder) {
                placeholders.push(placeholder);
              }
            });
          }
        }
      }
      
      return {
        name: layoutName,
        placeholders: placeholders
      };
    } catch (error) {
      console.error('Error parsing slide layout:', error);
      throw error;
    }
  }
  
  extractLayoutName(layoutData) {
    // Try to extract layout name from the XML structure
    if (layoutData['p:sldLayout'] && 
        layoutData['p:sldLayout']['p:cSld'] &&
        layoutData['p:sldLayout']['p:cSld'][0] &&
        layoutData['p:sldLayout']['p:cSld'][0]['$'] &&
        layoutData['p:sldLayout']['p:cSld'][0]['$']['name']) {
      return layoutData['p:sldLayout']['p:cSld'][0]['$']['name'];
    }
    return 'Unnamed Layout';
  }
  
  extractPlaceholder(shape) {
    try {
      if (!shape['p:nvSpPr'] || !shape['p:nvSpPr'][0]['p:nvPr']) {
        return null;
      }
      
      const nvPr = shape['p:nvSpPr'][0]['p:nvPr'][0];
      if (!nvPr['p:ph'] || !nvPr['p:ph'][0]) {
        return null;
      }
      
      const ph = nvPr['p:ph'][0]['$'] || {};
      const cNvPr = shape['p:nvSpPr'][0]['p:cNvPr'][0]['$'] || {};
      
      // Extract position and size from shape properties
      let x = 0, y = 0, width = 0, height = 0;
      if (shape['p:spPr'] && shape['p:spPr'][0]['a:xfrm']) {
        const xfrm = shape['p:spPr'][0]['a:xfrm'][0];
        if (xfrm['a:off'] && xfrm['a:off'][0]['$']) {
          x = parseInt(xfrm['a:off'][0]['$']['x']) || 0;
          y = parseInt(xfrm['a:off'][0]['$']['y']) || 0;
        }
        if (xfrm['a:ext'] && xfrm['a:ext'][0]['$']) {
          width = parseInt(xfrm['a:ext'][0]['$']['cx']) || 0;
          height = parseInt(xfrm['a:ext'][0]['$']['cy']) || 0;
        }
      }
      
      // Determine placeholder type
      let type = 'text';
      if (ph.type) {
        switch(ph.type) {
          case 'title':
          case 'ctrTitle':
            type = 'title';
            break;
          case 'subTitle':
            type = 'subtitle';
            break;
          case 'body':
            type = 'body';
            break;
          case 'pic':
            type = 'picture';
            break;
          case 'chart':
            type = 'chart';
            break;
          case 'tbl':
            type = 'table';
            break;
          case 'dgm':
            type = 'diagram';
            break;
          default:
            type = 'text';
        }
      }
      
      return {
        id: cNvPr.id || `placeholder_${Date.now()}`,
        name: cNvPr.name || `Placeholder ${ph.idx || ''}`,
        type: type,
        index: ph.idx || 0,
        x: this.convertEMUToPixels(x),
        y: this.convertEMUToPixels(y),
        width: this.convertEMUToPixels(width),
        height: this.convertEMUToPixels(height)
      };
    } catch (error) {
      console.error('Error extracting placeholder:', error);
      return null;
    }
  }
  
  convertEMUToPixels(emu) {
    // Convert EMU (English Metric Units) to pixels
    // 1 inch = 914400 EMUs, assuming 96 DPI
    return Math.round(emu / 9525);
  }
  
  async getAllLayouts() {
    const layoutsPath = path.join(this.templatePath, 'slideLayouts');
    const layouts = [];
    
    try {
      const files = await fs.readdir(layoutsPath);
      const xmlFiles = files.filter(file => file.endsWith('.xml') && !file.includes('.rels'));
      
      for (const file of xmlFiles) {
        const layoutPath = path.join(layoutsPath, file);
        const layoutData = await this.parseSlideLayout(layoutPath);
        layouts.push({
          ...layoutData,
          fileName: file
        });
      }
      
      return layouts;
    } catch (error) {
      console.error('Error getting all layouts:', error);
      throw error;
    }
  }
  
  async getLayoutByName(layoutName) {
    const layouts = await this.getAllLayouts();
    return layouts.find(layout => 
      layout.name.toLowerCase() === layoutName.toLowerCase() ||
      layout.fileName.toLowerCase().includes(layoutName.toLowerCase())
    );
  }
}

module.exports = new OpenXMLParser();