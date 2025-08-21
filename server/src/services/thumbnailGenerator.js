class ThumbnailGenerator {
  constructor() {
    this.slideWidth = 1024;
    this.slideHeight = 768;
    this.scale = 0.25; // Scale down for thumbnails
  }
  
  generateSVGThumbnail(layout) {
    const width = this.slideWidth * this.scale;
    const height = this.slideHeight * this.scale;
    
    // Create SVG with dark theme background
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    // Dark background with slight gradient
    svg += `<defs><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient></defs>`;
    svg += `<rect width="${width}" height="${height}" fill="url(#bgGrad)"/>`;
    
    // Add slide border with better contrast
    svg += `<rect x="1" y="1" width="${width-2}" height="${height-2}" fill="none" stroke="#4a5568" stroke-width="1" opacity="0.6"/>`;
    
    // Add placeholders
    if (layout.placeholders && layout.placeholders.length > 0) {
      layout.placeholders.forEach(placeholder => {
        const x = placeholder.x * this.scale;
        const y = placeholder.y * this.scale;
        const w = placeholder.width * this.scale;
        const h = placeholder.height * this.scale;
        
        // Different styles for different placeholder types with visible light grey fills
        let fillColor = '#4b5563';  // Medium grey for better visibility
        let strokeColor = '#9ca3af';
        let textColor = '#f3f4f6';
        let opacity = '1';  // Full opacity for SVG
        
        switch(placeholder.type) {
          case 'title':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#60a5fa';
            textColor = '#ffffff';
            opacity = '1';
            break;
          case 'subtitle':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#a78bfa';
            textColor = '#f3f4f6';
            opacity = '1';
            break;
          case 'body':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#94a3b8';
            textColor = '#e5e7eb';
            opacity = '1';
            break;
          case 'picture':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#34d399';
            textColor = '#f3f4f6';
            opacity = '1';
            break;
          case 'chart':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#fbbf24';
            textColor = '#ffffff';
            opacity = '1';
            break;
          case 'table':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#22d3ee';
            textColor = '#ffffff';
            opacity = '1';
            break;
          case 'diagram':
            fillColor = '#4b5563';  // Medium grey
            strokeColor = '#f472b6';
            textColor = '#ffffff';
            opacity = '1';
            break;
        }
        
        // Draw placeholder rectangle with better visual appeal
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
                 fill="${fillColor}" 
                 fill-opacity="0.3" 
                 stroke="${strokeColor}" 
                 stroke-width="1.5" 
                 stroke-dasharray="4,2" 
                 stroke-opacity="0.8" 
                 rx="3" ry="3"/>`;
        
        // Add placeholder text with better readability
        const fontSize = 9; // Slightly larger for better readability
        const textX = x + w / 2;
        const textY = y + h / 2;
        
        svg += `<text x="${textX}" y="${textY}" 
                 font-family="Arial, sans-serif" 
                 font-size="${fontSize}" 
                 fill="${textColor}" 
                 text-anchor="middle" 
                 dominant-baseline="middle">`;
        svg += placeholder.name || placeholder.type;
        svg += `</text>`;
      });
    } else {
      // No placeholders - show layout name in center
      svg += `<text x="${width/2}" y="${height/2}" 
               font-family="Arial, sans-serif" 
               font-size="16" 
               fill="#9ca3af" 
               text-anchor="middle" 
               dominant-baseline="middle">`;
      svg += layout.name || 'Empty Layout';
      svg += `</text>`;
    }
    
    svg += `</svg>`;
    
    return svg;
  }
  
  generateBase64Thumbnail(layout) {
    const svg = this.generateSVGThumbnail(layout);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }
  
  generateHTMLPreview(layout) {
    const width = this.slideWidth * 0.5;
    const height = this.slideHeight * 0.5;
    
    let html = `<div style="position: relative; width: ${width}px; height: ${height}px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #4a5568; border-radius: 8px; margin: 20px auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">`;
    
    if (layout.placeholders && layout.placeholders.length > 0) {
      layout.placeholders.forEach(placeholder => {
        const x = placeholder.x * 0.5;
        const y = placeholder.y * 0.5;
        const w = placeholder.width * 0.5;
        const h = placeholder.height * 0.5;
        
        // Lighter grey fills for better visibility
        let bgColor = 'rgba(107, 114, 128, 0.4)';  // Medium grey with good visibility
        let borderColor = '#9ca3af';
        let textColor = '#f3f4f6';
        
        switch(placeholder.type) {
          case 'title':
            bgColor = 'rgba(107, 114, 128, 0.4)';
            borderColor = '#60a5fa';
            textColor = '#ffffff';
            break;
          case 'subtitle':
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#a78bfa';
            textColor = '#f3f4f6';
            break;
          case 'body':
            bgColor = 'rgba(107, 114, 128, 0.3)';
            borderColor = '#94a3b8';
            textColor = '#e5e7eb';
            break;
          case 'picture':
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#34d399';
            textColor = '#f3f4f6';
            break;
          case 'chart':
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#fbbf24';
            textColor = '#ffffff';
            break;
          case 'table':
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#22d3ee';
            textColor = '#ffffff';
            break;
          case 'diagram':
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#f472b6';
            textColor = '#ffffff';
            break;
          default:
            bgColor = 'rgba(107, 114, 128, 0.35)';
            borderColor = '#9ca3af';
            textColor = '#e5e7eb';
        }
        
        html += `<div style="
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${w}px;
          height: ${h}px;
          background: ${bgColor};
          border: 2px dashed ${borderColor};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${textColor};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(2px);
        " 
        onmouseover="this.style.background='rgba(96, 165, 250, 0.3)'; this.style.borderColor='#93c5fd'; this.style.transform='scale(1.02)';"
        onmouseout="this.style.background='${bgColor}'; this.style.borderColor='${borderColor}'; this.style.transform='scale(1)';"
        data-placeholder-id="${placeholder.id}"
        data-placeholder-type="${placeholder.type}">
          ${placeholder.name || placeholder.type}
        </div>`;
      });
    }
    
    html += `</div>`;
    
    return html;
  }
}

module.exports = new ThumbnailGenerator();