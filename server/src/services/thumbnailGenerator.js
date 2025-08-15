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
    
    // Dark background
    svg += `<rect width="${width}" height="${height}" fill="#1e1e2e"/>`;
    
    // Add slide border
    svg += `<rect x="1" y="1" width="${width-2}" height="${height-2}" fill="none" stroke="#3f3f56" stroke-width="1"/>`;
    
    // Add placeholders
    if (layout.placeholders && layout.placeholders.length > 0) {
      layout.placeholders.forEach(placeholder => {
        const x = placeholder.x * this.scale;
        const y = placeholder.y * this.scale;
        const w = placeholder.width * this.scale;
        const h = placeholder.height * this.scale;
        
        // Different styles for different placeholder types
        let fillColor = '#2a2a3e';
        let strokeColor = '#4a4a6e';
        let textColor = '#9ca3af';
        
        switch(placeholder.type) {
          case 'title':
            fillColor = '#2d3748';
            strokeColor = '#4a5568';
            textColor = '#cbd5e0';
            break;
          case 'subtitle':
            fillColor = '#2a2d3a';
            strokeColor = '#3a3d4a';
            textColor = '#a0aec0';
            break;
          case 'body':
            fillColor = '#252836';
            strokeColor = '#353846';
            textColor = '#9ca3af';
            break;
          case 'picture':
            fillColor = '#1f2937';
            strokeColor = '#374151';
            textColor = '#6b7280';
            break;
        }
        
        // Draw placeholder rectangle
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
                 fill="${fillColor}" 
                 stroke="${strokeColor}" 
                 stroke-width="1" 
                 stroke-dasharray="3,3" 
                 opacity="0.8"/>`;
        
        // Add placeholder text (6pt = ~8px)
        const fontSize = 8; // 6pt standardized
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
    
    let html = `<div style="position: relative; width: ${width}px; height: ${height}px; background: #1e1e2e; border: 1px solid #3f3f56; margin: 20px auto;">`;
    
    if (layout.placeholders && layout.placeholders.length > 0) {
      layout.placeholders.forEach(placeholder => {
        const x = placeholder.x * 0.5;
        const y = placeholder.y * 0.5;
        const w = placeholder.width * 0.5;
        const h = placeholder.height * 0.5;
        
        let bgColor = '#2a2a3e';
        let borderColor = '#4a4a6e';
        
        switch(placeholder.type) {
          case 'title':
            bgColor = '#2d3748';
            borderColor = '#4a5568';
            break;
          case 'subtitle':
            bgColor = '#2a2d3a';
            borderColor = '#3a3d4a';
            break;
          case 'body':
            bgColor = '#252836';
            borderColor = '#353846';
            break;
        }
        
        html += `<div style="
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${w}px;
          height: ${h}px;
          background: ${bgColor};
          border: 1px dashed ${borderColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        " 
        onmouseover="this.style.background='#3a3a4e'; this.style.borderColor='#5a5a7e';"
        onmouseout="this.style.background='${bgColor}'; this.style.borderColor='${borderColor}';"
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