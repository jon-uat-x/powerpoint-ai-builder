/**
 * AI Content Generator Service
 * Processes enhanced prompts through Gemini AI to generate presentation content
 */

import { geminiAPI } from './geminiApiSimple';
import promptEnhancer from './promptEnhancer';

class AIContentGenerator {
  constructor() {
    this.geminiAPI = geminiAPI;
    this.promptEnhancer = promptEnhancer;
    this.sessionId = null;
    this.context = null;
  }

  /**
   * Initialize a new generation session
   */
  async initSession(pitchbookId, context = null) {
    this.sessionId = `gen_${pitchbookId}_${Date.now()}`;
    this.context = context;
    
    // Start a new chat session with Gemini
    await this.geminiAPI.startChat(this.sessionId);
    
    // Set the system context if provided
    if (context) {
      const systemPrompt = this.promptEnhancer.generateSystemPrompt(context);
      await this.geminiAPI.sendMessage(
        `System context: ${systemPrompt}\n\nPlease acknowledge and I'll start providing content requests.`,
        this.sessionId
      );
    }
    
    return this.sessionId;
  }

  /**
   * Generate content for a single prompt
   */
  async generateContent(originalPrompt, metadata = {}) {
    try {
      console.log('[AIContentGenerator] Processing prompt:', originalPrompt);
      
      // Enhance the prompt
      const enhanced = this.promptEnhancer.enhancePrompt(originalPrompt, {
        ...metadata,
        context: this.context
      });
      
      console.log('[AIContentGenerator] Enhanced prompt:', enhanced.enhanced);
      
      // Generate content using Gemini
      const response = await this.geminiAPI.generateContent(enhanced.enhanced);
      
      console.log('[AIContentGenerator] Generated content:', response);
      
      return {
        success: true,
        original: originalPrompt,
        enhanced: enhanced.enhanced,
        content: response,
        metadata: enhanced.metadata,
        analysis: enhanced.analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AIContentGenerator] Generation error:', error);
      return {
        success: false,
        error: error.message,
        original: originalPrompt,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate content for all prompts in a pitchbook
   */
  async generatePitchbookContent(pitchbook, options = {}) {
    const {
      regenerate = false,  // Regenerate existing content
      selectedSlides = null,  // Only generate for specific slides
      batchSize = 3,  // Number of concurrent generations
      onProgress = null  // Progress callback
    } = options;

    console.log('[AIContentGenerator] Starting pitchbook generation:', pitchbook.title);
    
    // Initialize session
    const context = this.promptEnhancer.inferContext(
      pitchbook.title,
      pitchbook.title,
      pitchbook.type
    );
    await this.initSession(pitchbook.id, context);
    
    // Get all enhanced prompts
    const enhancedPrompts = this.promptEnhancer.enhanceAllPrompts(pitchbook);
    
    // Prepare generation tasks
    const tasks = [];
    const results = {};
    
    Object.keys(enhancedPrompts).forEach(slideKey => {
      // Skip if not in selected slides
      if (selectedSlides && !selectedSlides.includes(slideKey)) {
        return;
      }
      
      Object.keys(enhancedPrompts[slideKey]).forEach(placeholderKey => {
        // Skip if content exists and not regenerating
        if (!regenerate && 
            pitchbook.generatedContent?.[slideKey]?.[placeholderKey]) {
          return;
        }
        
        tasks.push({
          slideKey,
          placeholderKey,
          enhanced: enhancedPrompts[slideKey][placeholderKey]
        });
      });
    });
    
    console.log(`[AIContentGenerator] Processing ${tasks.length} prompts`);
    
    // Process in batches
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (task) => {
          const result = await this.generateContent(
            task.enhanced.original,
            task.enhanced.metadata
          );
          
          return {
            ...task,
            result
          };
        })
      );
      
      // Store results
      batchResults.forEach(({ slideKey, placeholderKey, result }) => {
        if (!results[slideKey]) {
          results[slideKey] = {};
        }
        results[slideKey][placeholderKey] = result;
      });
      
      // Report progress
      if (onProgress) {
        const progress = Math.min(100, Math.round(((i + batchSize) / tasks.length) * 100));
        onProgress({
          current: Math.min(i + batchSize, tasks.length),
          total: tasks.length,
          percentage: progress
        });
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('[AIContentGenerator] Generation complete');
    
    return {
      success: true,
      results,
      context,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate content for a specific slide
   */
  async generateSlideContent(pitchbook, slideNumber) {
    const slideKey = `slide_${slideNumber}`;
    const slide = pitchbook.slides?.find(s => s.slideNumber === slideNumber);
    
    if (!slide) {
      throw new Error(`Slide ${slideNumber} not found`);
    }
    
    const prompts = pitchbook.prompts?.[slideKey] || {};
    const results = {};
    
    for (const [placeholderKey, prompt] of Object.entries(prompts)) {
      const result = await this.generateContent(prompt, {
        slideType: slide.type,
        slideNumber: slideNumber,
        sectionTitle: slide.sectionTitle || '',
        placeholderType: this.promptEnhancer.inferPlaceholderType(placeholderKey),
        pitchbookTitle: pitchbook.title,
        pitchbookType: pitchbook.type,
        slideTitle: slide.layoutName
      });
      
      results[placeholderKey] = result;
    }
    
    return {
      slideKey,
      slideNumber,
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Regenerate content with different parameters
   */
  async regenerateContent(originalContent, options = {}) {
    const {
      temperature = 0.9,
      style = null,
      tone = null,
      wordCount = null
    } = options;
    
    // Modify the enhanced prompt with new parameters
    let modifiedPrompt = originalContent.enhanced || originalContent.original;
    
    if (style) {
      modifiedPrompt += `\nStyle modification: ${style}`;
    }
    if (tone) {
      modifiedPrompt += `\nTone modification: ${tone}`;
    }
    if (wordCount) {
      modifiedPrompt = modifiedPrompt.replace(/\d+\s*words?/i, `${wordCount} words`);
    }
    
    // Generate with modified prompt
    const response = await this.geminiAPI.generateContent(modifiedPrompt);
    
    return {
      success: true,
      original: originalContent.original,
      enhanced: modifiedPrompt,
      content: response,
      options,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate variations of content
   */
  async generateVariations(prompt, metadata = {}, count = 3) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      // Add variation instruction
      const variedPrompt = `${prompt}\n\nVariation ${i + 1}: Provide a different approach or perspective while maintaining the same requirements.`;
      
      const result = await this.generateContent(variedPrompt, metadata);
      variations.push(result);
      
      // Small delay between variations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return variations;
  }

  /**
   * Review and improve generated content
   */
  async reviewAndImprove(content, criteria = {}) {
    const {
      checkGrammar = true,
      checkClarity = true,
      checkTone = true,
      targetAudience = 'business professionals'
    } = criteria;
    
    const reviewPrompt = `Please review and improve the following content:

"${content}"

Review criteria:
${checkGrammar ? '- Fix any grammar or spelling errors' : ''}
${checkClarity ? '- Improve clarity and readability' : ''}
${checkTone ? '- Ensure appropriate tone for ' + targetAudience : ''}
- Maintain the original meaning and key points
- Keep approximately the same length

Provide the improved version:`;
    
    const improved = await this.geminiAPI.generateContent(reviewPrompt);
    
    return {
      original: content,
      improved,
      criteria,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate a summary of all content in a pitchbook
   */
  async generateExecutiveSummary(pitchbook) {
    // Collect all generated content
    const allContent = [];
    
    Object.values(pitchbook.generatedContent || {}).forEach(slide => {
      Object.values(slide).forEach(placeholder => {
        if (placeholder.content) {
          allContent.push(placeholder.content);
        }
      });
    });
    
    if (allContent.length === 0) {
      return {
        success: false,
        error: 'No generated content found to summarize'
      };
    }
    
    const summaryPrompt = `Based on the following presentation content, create a comprehensive executive summary (300-400 words) that captures the key themes, main points, and strategic recommendations:

${allContent.join('\n\n')}

The executive summary should:
1. Start with a compelling overview statement
2. Highlight 3-5 key findings or recommendations
3. Include critical data points or metrics
4. End with a clear call to action or next steps
5. Be suitable for senior executives who need a quick understanding of the presentation

Executive Summary:`;
    
    const summary = await this.geminiAPI.generateContent(summaryPrompt);
    
    return {
      success: true,
      summary,
      contentCount: allContent.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const aiContentGenerator = new AIContentGenerator();

export default aiContentGenerator;
export { AIContentGenerator };