const fs = require('fs-extra');
const path = require('path');

class TemplatePromptsService {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.promptsFile = path.join(this.dataPath, 'template_prompts.json');
    this.ensureDataFile();
  }

  async ensureDataFile() {
    await fs.ensureDir(this.dataPath);
    if (!await fs.exists(this.promptsFile)) {
      await fs.writeJson(this.promptsFile, {}, { spaces: 2 });
    }
  }

  async getPrompts(layoutName) {
    try {
      const allPrompts = await fs.readJson(this.promptsFile);
      return allPrompts[layoutName] || {};
    } catch (error) {
      console.error('Error reading template prompts:', error);
      return {};
    }
  }

  async getAllPrompts() {
    try {
      return await fs.readJson(this.promptsFile);
    } catch (error) {
      console.error('Error reading all template prompts:', error);
      return {};
    }
  }

  async savePrompts(layoutName, prompts) {
    try {
      const allPrompts = await fs.readJson(this.promptsFile);
      allPrompts[layoutName] = prompts;
      await fs.writeJson(this.promptsFile, allPrompts, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving template prompts:', error);
      return false;
    }
  }

  async updatePrompt(layoutName, placeholderId, prompt) {
    try {
      const allPrompts = await fs.readJson(this.promptsFile);
      if (!allPrompts[layoutName]) {
        allPrompts[layoutName] = {};
      }
      
      // Allow empty prompts - store them as empty string
      allPrompts[layoutName][placeholderId] = prompt || '';
      
      await fs.writeJson(this.promptsFile, allPrompts, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error updating template prompt:', error);
      return false;
    }
  }

  async deletePrompt(layoutName, placeholderId) {
    try {
      const allPrompts = await fs.readJson(this.promptsFile);
      if (allPrompts[layoutName] && allPrompts[layoutName][placeholderId] !== undefined) {
        delete allPrompts[layoutName][placeholderId];
        await fs.writeJson(this.promptsFile, allPrompts, { spaces: 2 });
      }
      return true;
    } catch (error) {
      console.error('Error deleting template prompt:', error);
      return false;
    }
  }

  // Get default prompts for multiple layouts (used when creating pitchbook)
  async getPromptsForLayouts(layoutNames) {
    try {
      const allPrompts = await fs.readJson(this.promptsFile);
      const result = {};
      
      layoutNames.forEach(layoutName => {
        if (allPrompts[layoutName]) {
          result[layoutName] = allPrompts[layoutName];
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting prompts for layouts:', error);
      return {};
    }
  }
}

module.exports = new TemplatePromptsService();