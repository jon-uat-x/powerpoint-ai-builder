/**
 * Prompt Enhancement Service
 * Automatically processes and extends pitchbook prompts into full, AI-ready prompts
 */

// Prompt templates for different slide types and contexts
const PROMPT_TEMPLATES = {
  // Slide type specific templates
  title: {
    base: "Create a professional and engaging title for a business presentation.",
    enhanced: "Generate a compelling, professional title for a {context} presentation. The title should be concise (5-10 words), impactful, and clearly communicate the main theme. Consider the audience: {audience}. Style: {style}. Key focus: {focus}."
  },
  
  contents: {
    base: "Generate a table of contents for this presentation.",
    enhanced: "Create a comprehensive table of contents for a {context} presentation with {sectionCount} main sections. Include clear, descriptive section titles that flow logically. Each section should have 2-3 subsections. Format as a numbered list with proper hierarchy. Target audience: {audience}."
  },
  
  legal: {
    base: "Create legal disclaimer text.",
    enhanced: "Generate professional legal disclaimer text appropriate for a {context} business presentation. Include standard confidentiality notices, forward-looking statements disclaimer, and intellectual property protection. Keep it concise but comprehensive. Jurisdiction: {jurisdiction}."
  },
  
  'section-divider': {
    base: "Create a section introduction.",
    enhanced: "Write a compelling introduction for the section titled '{sectionTitle}' in a {context} presentation. Include a brief overview (2-3 sentences) that transitions from the previous content and sets up what's coming. Tone: {tone}."
  },
  
  body: {
    base: "Generate body content for this slide.",
    enhanced: "Create {wordCount} words of professional content about {topic} for a {context} presentation slide. Structure the content with clear key points, supporting details, and relevant examples. Include {bulletPoints} main points. Ensure the content is {tone} and suitable for {audience}. Focus on: {focus}."
  },
  
  // Placeholder type templates
  text: {
    base: "Generate text content.",
    enhanced: "Write {wordCount} words of {style} text about {topic}. The content should be {tone}, well-structured, and include {specificRequirements}. Target audience: {audience}."
  },
  
  bullet: {
    base: "Create bullet points.",
    enhanced: "Generate {count} clear, concise bullet points about {topic}. Each point should be 1-2 lines, action-oriented, and {style}. Focus on {focus}. Ensure parallel structure."
  },
  
  heading: {
    base: "Create a heading.",
    enhanced: "Write a {style} heading for {topic} that is {tone} and captures attention. Maximum {wordCount} words. Should complement the slide title: '{slideTitle}'."
  }
};

// Context enrichment data
const CONTEXT_ENRICHMENT = {
  // Business contexts
  'merger-acquisition': {
    audience: 'board members, executives, and key stakeholders',
    tone: 'professional, strategic, and data-driven',
    style: 'formal business',
    focus: 'synergies, value creation, and strategic rationale'
  },
  
  'investor-pitch': {
    audience: 'potential investors and venture capitalists',
    tone: 'confident, compelling, and growth-focused',
    style: 'persuasive and engaging',
    focus: 'market opportunity, competitive advantage, and ROI'
  },
  
  'quarterly-results': {
    audience: 'investors, analysts, and shareholders',
    tone: 'transparent, analytical, and forward-looking',
    style: 'formal financial reporting',
    focus: 'performance metrics, trends, and guidance'
  },
  
  'product-launch': {
    audience: 'customers, partners, and media',
    tone: 'exciting, innovative, and customer-centric',
    style: 'engaging and accessible',
    focus: 'features, benefits, and market differentiation'
  },
  
  'strategic-plan': {
    audience: 'internal leadership and management teams',
    tone: 'visionary, actionable, and motivating',
    style: 'strategic and operational',
    focus: 'goals, initiatives, and execution roadmap'
  }
};

// Prompt enhancement rules
const ENHANCEMENT_RULES = {
  // Minimum word counts by content type
  wordCounts: {
    title: 10,
    heading: 15,
    paragraph: 100,
    bullet: 20,
    'short-text': 50,
    'medium-text': 150,
    'long-text': 300
  },
  
  // Style modifiers
  styles: {
    executive: 'concise, high-level, strategic focus',
    technical: 'detailed, precise, data-rich',
    marketing: 'engaging, benefit-focused, persuasive',
    financial: 'quantitative, analytical, fact-based',
    creative: 'innovative, inspiring, forward-thinking'
  },
  
  // Tone modifiers
  tones: {
    formal: 'professional, respectful, structured',
    informal: 'conversational, approachable, friendly',
    urgent: 'immediate, action-oriented, compelling',
    optimistic: 'positive, opportunity-focused, confident',
    analytical: 'objective, evidence-based, logical'
  }
};

class PromptEnhancer {
  constructor() {
    this.templates = PROMPT_TEMPLATES;
    this.contexts = CONTEXT_ENRICHMENT;
    this.rules = ENHANCEMENT_RULES;
  }

  /**
   * Main enhancement function - processes a simple prompt into a full, AI-ready prompt
   */
  enhancePrompt(originalPrompt, metadata = {}) {
    const {
      slideType = 'body',
      slideNumber = 1,
      sectionTitle = '',
      placeholderType = 'text',
      pitchbookTitle = '',
      pitchbookType = 'standard',
      context = null
    } = metadata;

    // Analyze the original prompt
    const analysis = this.analyzePrompt(originalPrompt);
    
    // Determine context
    const inferredContext = context || this.inferContext(originalPrompt, pitchbookTitle, pitchbookType);
    
    // Get base template
    const template = this.getTemplate(slideType, placeholderType);
    
    // Build enhanced prompt
    const enhancedPrompt = this.buildEnhancedPrompt(
      originalPrompt,
      template,
      analysis,
      inferredContext,
      metadata
    );
    
    // Add additional instructions
    const finalPrompt = this.addInstructions(enhancedPrompt, metadata);
    
    return {
      original: originalPrompt,
      enhanced: finalPrompt,
      analysis,
      context: inferredContext,
      metadata
    };
  }

  /**
   * Analyze the original prompt to extract intent and requirements
   */
  analyzePrompt(prompt) {
    const analysis = {
      wordCount: null,
      topic: null,
      action: null,
      style: null,
      requirements: []
    };

    // Extract word count if specified
    const wordCountMatch = prompt.match(/(\d+)\s*words?/i);
    if (wordCountMatch) {
      analysis.wordCount = parseInt(wordCountMatch[1]);
    }

    // Extract action verbs
    const actionVerbs = ['create', 'generate', 'write', 'develop', 'explain', 'describe', 'analyze', 'compare'];
    const actionMatch = prompt.toLowerCase().match(new RegExp(`(${actionVerbs.join('|')})`, 'i'));
    if (actionMatch) {
      analysis.action = actionMatch[1];
    }

    // Extract topic (text after "on" or "about")
    const topicMatch = prompt.match(/(?:on|about|regarding|for)\s+(.+?)(?:\.|$)/i);
    if (topicMatch) {
      analysis.topic = topicMatch[1].trim();
    } else {
      // Fallback: use the main content after the action verb
      const fallbackMatch = prompt.match(/(?:create|generate|write|develop)\s+(?:\d+\s+words?\s+)?(?:on\s+)?(.+)/i);
      if (fallbackMatch) {
        analysis.topic = fallbackMatch[1].trim();
      }
    }

    // Detect style indicators
    if (prompt.match(/formal|professional|executive/i)) {
      analysis.style = 'formal';
    } else if (prompt.match(/casual|friendly|informal/i)) {
      analysis.style = 'informal';
    }

    // Extract specific requirements
    if (prompt.match(/bullet|point|list/i)) {
      analysis.requirements.push('bullet_points');
    }
    if (prompt.match(/example|case study/i)) {
      analysis.requirements.push('examples');
    }
    if (prompt.match(/data|statistic|number/i)) {
      analysis.requirements.push('data_driven');
    }
    if (prompt.match(/comparison|versus|vs/i)) {
      analysis.requirements.push('comparative');
    }

    return analysis;
  }

  /**
   * Infer context from prompt content and pitchbook metadata
   */
  inferContext(prompt, pitchbookTitle, pitchbookType) {
    const promptLower = prompt.toLowerCase();
    const titleLower = pitchbookTitle.toLowerCase();
    
    // Check for specific context keywords
    if (promptLower.includes('merger') || promptLower.includes('acquisition') || 
        titleLower.includes('m&a')) {
      return 'merger-acquisition';
    }
    
    if (promptLower.includes('investor') || promptLower.includes('funding') || 
        titleLower.includes('pitch')) {
      return 'investor-pitch';
    }
    
    if (promptLower.includes('quarterly') || promptLower.includes('earnings') || 
        titleLower.includes('results')) {
      return 'quarterly-results';
    }
    
    if (promptLower.includes('product') || promptLower.includes('launch') || 
        titleLower.includes('introduction')) {
      return 'product-launch';
    }
    
    if (promptLower.includes('strategy') || promptLower.includes('strategic') || 
        titleLower.includes('plan')) {
      return 'strategic-plan';
    }
    
    // Default based on pitchbook type
    return pitchbookType === 'investor' ? 'investor-pitch' : 'strategic-plan';
  }

  /**
   * Get the appropriate template for the slide/placeholder type
   */
  getTemplate(slideType, placeholderType) {
    // First try slide type
    if (this.templates[slideType]) {
      return this.templates[slideType];
    }
    
    // Then try placeholder type
    if (this.templates[placeholderType]) {
      return this.templates[placeholderType];
    }
    
    // Default to body template
    return this.templates.body;
  }

  /**
   * Build the enhanced prompt using template and context
   */
  buildEnhancedPrompt(originalPrompt, template, analysis, context, metadata) {
    const contextData = this.contexts[context] || this.contexts['strategic-plan'];
    
    // Determine word count
    let wordCount = analysis.wordCount;
    if (!wordCount) {
      // Infer from slide type
      if (metadata.slideType === 'title') {
        wordCount = 10;
      } else if (metadata.slideType === 'body') {
        wordCount = 150;
      } else {
        wordCount = 100;
      }
    }
    
    // Build template variables
    const templateVars = {
      context: context.replace('-', ' '),
      topic: analysis.topic || originalPrompt,
      wordCount: wordCount,
      audience: contextData.audience,
      tone: contextData.tone,
      style: contextData.style,
      focus: contextData.focus,
      sectionTitle: metadata.sectionTitle,
      slideTitle: metadata.slideTitle || '',
      sectionCount: metadata.sectionCount || 3,
      bulletPoints: analysis.requirements.includes('bullet_points') ? 5 : 3,
      jurisdiction: 'United States',
      count: 5,
      specificRequirements: analysis.requirements.join(', ') || 'clear structure and flow'
    };
    
    // Use enhanced template if available, otherwise base
    let enhancedPrompt = template.enhanced || template.base;
    
    // Replace template variables
    Object.keys(templateVars).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      enhancedPrompt = enhancedPrompt.replace(regex, templateVars[key]);
    });
    
    return enhancedPrompt;
  }

  /**
   * Add additional instructions and formatting requirements
   */
  addInstructions(enhancedPrompt, metadata) {
    const instructions = [];
    
    // Add base instruction
    instructions.push(enhancedPrompt);
    
    // Add formatting instructions based on placeholder type
    if (metadata.placeholderType === 'bullet') {
      instructions.push('\nFormat as bullet points with • symbol.');
    } else if (metadata.placeholderType === 'heading') {
      instructions.push('\nFormat as a single line heading, no punctuation at the end.');
    }
    
    // Add quality instructions
    instructions.push('\nEnsure the content is:');
    instructions.push('- Factually accurate and up-to-date');
    instructions.push('- Free of jargon unless necessary');
    instructions.push('- Engaging and easy to understand');
    
    // Add specific requirements from analysis
    const analysis = this.analyzePrompt(metadata.originalPrompt || '');
    if (analysis.requirements.includes('data_driven')) {
      instructions.push('- Include relevant statistics or data points');
    }
    if (analysis.requirements.includes('examples')) {
      instructions.push('- Include concrete examples or case studies');
    }
    if (analysis.requirements.includes('comparative')) {
      instructions.push('- Provide clear comparisons with pros/cons');
    }
    
    return instructions.join('\n');
  }

  /**
   * Batch enhance multiple prompts from a pitchbook
   */
  enhanceAllPrompts(pitchbook) {
    const enhancedPrompts = {};
    const prompts = pitchbook.prompts || {};
    
    Object.keys(prompts).forEach(slideKey => {
      enhancedPrompts[slideKey] = {};
      const slideNumber = parseInt(slideKey.replace('slide_', ''));
      const slide = pitchbook.slides?.find(s => s.slideNumber === slideNumber);
      
      Object.keys(prompts[slideKey]).forEach(placeholderKey => {
        const originalPrompt = prompts[slideKey][placeholderKey];
        
        const enhanced = this.enhancePrompt(originalPrompt, {
          slideType: slide?.type || 'body',
          slideNumber: slideNumber,
          sectionTitle: slide?.sectionTitle || '',
          placeholderType: this.inferPlaceholderType(placeholderKey),
          pitchbookTitle: pitchbook.title,
          pitchbookType: pitchbook.type,
          slideTitle: slide?.layoutName || '',
          originalPrompt: originalPrompt
        });
        
        enhancedPrompts[slideKey][placeholderKey] = enhanced;
      });
    });
    
    return enhancedPrompts;
  }

  /**
   * Infer placeholder type from key
   */
  inferPlaceholderType(placeholderKey) {
    // This would need to be mapped based on your placeholder numbering system
    // For now, using a simple mapping
    const key = parseInt(placeholderKey);
    if (key <= 5) return 'heading';
    if (key <= 10) return 'text';
    return 'bullet';
  }

  /**
   * Generate a system prompt for the AI based on context
   */
  generateSystemPrompt(context) {
    const contextData = this.contexts[context] || this.contexts['strategic-plan'];
    
    return `You are a professional business content writer specializing in ${context.replace('-', ' ')} presentations. 
Your audience consists of ${contextData.audience}. 
Your writing style should be ${contextData.style} with a ${contextData.tone} tone.
Focus on ${contextData.focus}.
Provide clear, concise, and impactful content that drives the presentation's objectives forward.`;
  }
}

// Export singleton instance
const promptEnhancer = new PromptEnhancer();

export default promptEnhancer;
export { PromptEnhancer, PROMPT_TEMPLATES, CONTEXT_ENRICHMENT, ENHANCEMENT_RULES };