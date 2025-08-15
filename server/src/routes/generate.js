const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const dataPath = path.join(__dirname, '../data');

// Mock data generator for Gemini 2.5 Flash format
const generateMockResponse = (prompt) => {
  const mockResponses = {
    title: [
      'Strategic Investment Review Q4 2024',
      'Annual Portfolio Performance Analysis',
      'Market Opportunities Assessment 2024',
      'Digital Transformation Initiative',
      'Growth Strategy Presentation'
    ],
    subtitle: [
      'Comprehensive Analysis and Recommendations',
      'Executive Summary and Key Insights',
      'Strategic Planning and Execution',
      'Innovation and Market Leadership',
      'Building Tomorrow\'s Success Today'
    ],
    body: [
      'This comprehensive analysis provides detailed insights into market trends, competitive positioning, and strategic opportunities. Our research indicates significant growth potential in emerging markets, with particular emphasis on digital transformation initiatives.',
      'Key performance indicators show strong momentum across all business units. Revenue growth exceeded projections by 15%, while operational efficiency improvements delivered 20% cost reduction. Market share expanded in core segments.',
      'Strategic recommendations focus on three pillars: digital innovation, market expansion, and operational excellence. Implementation timeline spans 18 months with clear milestones and success metrics defined for each phase.',
      'Risk assessment identifies potential challenges including market volatility, regulatory changes, and competitive pressures. Mitigation strategies have been developed for each identified risk factor.',
      'Financial projections indicate strong returns on investment with breakeven expected within 24 months. Long-term value creation aligns with corporate strategic objectives and stakeholder expectations.'
    ],
    company: [
      'Global Tech Solutions Inc. is a leading provider of enterprise software solutions with over 10,000 clients worldwide. Founded in 2010, the company has grown to $5B in annual revenue with operations in 50 countries.',
      'Innovation Partners LLC specializes in digital transformation consulting for Fortune 500 companies. With a team of 500+ experts, they deliver cutting-edge solutions in AI, cloud computing, and data analytics.',
      'Strategic Ventures Group manages a diversified portfolio of investments across technology, healthcare, and renewable energy sectors. Total assets under management exceed $10 billion.',
      'Market Leaders Corporation has established itself as the premier provider of financial services technology. Their platform processes over $1 trillion in transactions annually.',
      'Future Growth Enterprises focuses on identifying and developing high-potential startups in emerging markets. Their portfolio includes 200+ companies across 15 countries.'
    ]
  };
  
  // Determine response type based on prompt keywords
  let responseType = 'body';
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('title')) {
    responseType = 'title';
  } else if (lowerPrompt.includes('subtitle')) {
    responseType = 'subtitle';
  } else if (lowerPrompt.includes('company') || lowerPrompt.includes('profile')) {
    responseType = 'company';
  }
  
  const responses = mockResponses[responseType];
  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
  
  // If prompt specifies word count, adjust response
  const wordMatch = prompt.match(/(\d+)\s*word/i);
  if (wordMatch) {
    const targetWords = parseInt(wordMatch[1]);
    const words = selectedResponse.split(' ');
    if (words.length > targetWords) {
      return words.slice(0, targetWords).join(' ') + '.';
    }
  }
  
  return selectedResponse;
};

// POST /api/generate/:id - Generate content for pitchbook (stubbed)
router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pitchbookFile = path.join(dataPath, `pitchbook_${id}.json`);
    
    if (!await fs.exists(pitchbookFile)) {
      return res.status(404).json({
        success: false,
        error: 'Pitchbook not found'
      });
    }
    
    const pitchbook = await fs.readJson(pitchbookFile);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate content for each prompt
    const generatedContent = {};
    
    if (pitchbook.prompts) {
      for (const slideId in pitchbook.prompts) {
        const slidePrompts = pitchbook.prompts[slideId];
        generatedContent[slideId] = {};
        
        for (const placeholderId in slidePrompts) {
          const prompt = slidePrompts[placeholderId];
          
          // Generate mock response in Gemini 2.5 Flash format
          const mockText = generateMockResponse(prompt);
          
          generatedContent[slideId][placeholderId] = {
            prompt: prompt,
            response: {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: mockText
                      }
                    ],
                    role: 'model'
                  },
                  finishReason: 'STOP',
                  index: 0,
                  safetyRatings: [
                    {
                      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                      probability: 'NEGLIGIBLE'
                    },
                    {
                      category: 'HARM_CATEGORY_HATE_SPEECH',
                      probability: 'NEGLIGIBLE'
                    },
                    {
                      category: 'HARM_CATEGORY_HARASSMENT',
                      probability: 'NEGLIGIBLE'
                    },
                    {
                      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                      probability: 'NEGLIGIBLE'
                    }
                  ]
                }
              ],
              promptMetadata: {
                promptTokenCount: prompt.split(' ').length,
                candidatesTokenCount: mockText.split(' ').length,
                totalTokenCount: prompt.split(' ').length + mockText.split(' ').length
              }
            }
          };
        }
      }
    }
    
    // Update pitchbook with generated content
    pitchbook.generatedContent = generatedContent;
    pitchbook.generatedAt = new Date().toISOString();
    pitchbook.status = 'generated';
    
    await fs.writeJson(pitchbookFile, pitchbook, { spaces: 2 });
    
    res.json({
      success: true,
      message: 'Content generated successfully',
      generatedContent,
      pitchbookId: id
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      message: error.message
    });
  }
});

// GET /api/generate/:id/status - Check generation status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const pitchbookFile = path.join(dataPath, `pitchbook_${id}.json`);
    
    if (!await fs.exists(pitchbookFile)) {
      return res.status(404).json({
        success: false,
        error: 'Pitchbook not found'
      });
    }
    
    const pitchbook = await fs.readJson(pitchbookFile);
    
    res.json({
      success: true,
      status: pitchbook.status || 'pending',
      generatedAt: pitchbook.generatedAt || null,
      hasContent: !!pitchbook.generatedContent
    });
  } catch (error) {
    console.error('Error checking generation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check generation status',
      message: error.message
    });
  }
});

module.exports = router;